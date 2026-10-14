import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiChevronLeft, FiChevronRight, FiSend, FiSliders } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../../config/api";
import { notSentReason } from "../../../utils/deliveryReasons";
import { useAuth } from "../../../context/AuthContext";
import { IOS, tint } from "../../../theme/ios";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";
import SectionPicker from "./SectionPicker";
import { emptySection, inSection, sectionBody, sectionChosen, sectionLabel, sectionOptions } from "./sectionUtils";

const navSx = { bgcolor: IOS.fill, color: IOS.ink, width: 30, height: 30, "&:hover": { bgcolor: "rgba(118,118,128,0.2)" } };

// "2026-10-12" -> Date at local midnight (no timezone shift)
const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (key, days) => {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatWeek = (weekStart) => {
  if (!weekStart) return "";
  const start = keyToDate(weekStart);
  const end = keyToDate(addDays(weekStart, 6));
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
};

const formatWhen = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const plural = (n, word, many) => `${n} ${n === 1 ? word : many || `${word}s`}`;

/**
 * The week strip on the schedule page: which week, how full it is,
 * and the Publish button. Opening a week fills its open slots from the
 * staffing template.
 */
export default function WeekPublishBar({ refreshKey, onChanged, onData }) {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [weekStart, setWeekStart] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  // "Publish all" or "Publish a section" (some roles / areas).
  const [section, setSection] = useState(emptySection);
  const lastLoadedWeek = useRef(null);
  const onDataRef = useRef(onData);
  const loadWeekRef = useRef(null);
  useEffect(() => {
    onDataRef.current = onData;
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/weeks/current")
      .then((res) => !cancelled && setWeekStart(res.data.weekStart))
      .catch((err) => console.error("Failed to load current week", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWeek = useCallback(async (key) => {
    if (!key) return;
    setLoading(true);
    try {
      const res = await api.get(`/weeks/${key}`);
      setData(res.data);
      // Share the week with the grid so it isn't fetched twice.
      onDataRef.current?.({
        weekStart: key,
        data: res.data,
        reload: () => loadWeekRef.current?.(key),
      });
    } catch (err) {
      console.error("Failed to load week", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeekRef.current = loadWeek;
  }, [loadWeek]);

  useEffect(() => {
    if (!weekStart) return;
    loadWeek(weekStart).then(() => {
      // Opening a new week can create its open slots from the template,
      // so let the page reload (but not on every refresh, to avoid loops).
      if (lastLoadedWeek.current !== weekStart) {
        onChanged?.();
      }
      lastLoadedWeek.current = weekStart;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, refreshKey, loadWeek]);

  const goToWeek = (key) => setWeekStart(key);

  const publish = async () => {
    setConfirmOpen(false);
    setPublishing(true);
    try {
      const res = await api.post(`/weeks/${weekStart}/publish`, sectionBody(section));
      setResult({ ...res.data, sectionText: section.mode === "section" ? sectionLabel(section, options) : null });
      setSection(emptySection);
      if (res.data?.usedGraceWeek) refreshSession?.();
      await loadWeek(weekStart);
      onChanged?.();
    } catch (err) {
      // 402 (over plan limit) opens the upgrade dialog on its own.
      if (err?.response?.status !== 402) {
        setResult({
          error: err?.response?.data?.message || "Couldn't publish this week",
        });
      }
    } finally {
      setPublishing(false);
    }
  };

  const week = data?.week;
  const counts = data?.counts || {};
  const isPublished = week?.status === "published";
  // People who'd get a message if we sent now (published weeks).
  const changes = isPublished ? counts.pendingPeople ?? counts.unpublishedChanges ?? 0 : counts.unpublishedChanges || 0;
  const canPublish = !isPublished || changes > 0;

  // Unsent changes: warn before closing or reloading the page.
  useEffect(() => {
    if (!(isPublished && changes > 0)) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isPublished, changes]);
  const notReachedLast = week?.lastPublish?.notReached || [];
  const options = sectionOptions(data);
  // Sections still waiting to be sent, e.g. "Med Tech (1 person)".
  const notSentText = (counts.notSentSections || [])
    .map((g) => `${[g.role && getRoleDisplayName(g.role), g.unitArea && toLabel(g.unitArea)].filter(Boolean).join(", ") || "Other"} (${plural(g.people, "person", "people")})`)
    .join(" · ");
  // People with Not-sent-yet shifts in the chosen section.
  const sectionPeople = new Set(
    (data?.schedules || [])
      .filter((s) => s.state === "draft" && s.status !== "call_out" && inSection(s, section))
      .map((s) => String(s.staffId?._id || s.staffId)),
  ).size;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: { xs: 1.5, md: 2 },
        border: `1px solid ${isPublished && changes > 0 ? tint(IOS.orange, 0.5) : IOS.hairline}`,
        borderRadius: IOS.radius.card,
        backgroundColor: isPublished && changes > 0 ? tint(IOS.orange, 0.06) : IOS.surface,
        boxShadow: IOS.shadow,
      }}
    >
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        flexDirection={{ xs: "column", md: "row" }}
        gap={1.5}
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <IconButton
            size="small"
            aria-label="Previous week"
            onClick={() => goToWeek(addDays(weekStart, -7))}
            disabled={!weekStart || loading}
            sx={navSx}
          >
            <FiChevronLeft />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: IOS.ink, minWidth: 130, textAlign: "center", px: 0.5 }}>
            {weekStart ? `Week of ${formatWeek(weekStart)}` : "Loading week…"}
          </Typography>
          <IconButton
            size="small"
            aria-label="Next week"
            onClick={() => goToWeek(addDays(weekStart, 7))}
            disabled={!weekStart || loading}
            sx={navSx}
          >
            <FiChevronRight />
          </IconButton>
          {week && (
            <Chip
              size="small"
              label={isPublished ? "Published" : "Draft"}
              sx={{
                fontWeight: 600,
                borderRadius: IOS.radius.round,
                bgcolor: tint(isPublished ? IOS.green : IOS.orange, 0.14),
                color: isPublished ? IOS.greenText : IOS.orangeText,
              }}
            />
          )}
          {data && (
            <Typography variant="body2" sx={{ color: IOS.secondary }}>
              {plural(counts.shifts || 0, "shift")} ·{" "}
              <Box
                component="span"
                sx={{ color: counts.openSlots ? IOS.orangeText : "inherit", fontWeight: counts.openSlots ? 600 : 400 }}
              >
                {plural(counts.openSlots || 0, "open slot")}
              </Box>
              {counts.callOuts ? ` · ${plural(counts.callOuts, "call-out")}` : ""}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="text"
            startIcon={<FiSliders />}
            onClick={() => navigate("/staffing-template")}
            sx={{ borderRadius: "10px", color: IOS.blue, px: 1.5 }}
          >
            Weekly needs
          </Button>
          <Tooltip
            title={
              isPublished && !changes
                ? "Published. Edits wait as changes until you send them."
                : ""
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<FiSend />}
                disabled={!week || !canPublish || publishing}
                onClick={() => setConfirmOpen(true)}
                disableElevation
                sx={{
                  borderRadius: IOS.radius.round,
                  px: 2.25,
                  bgcolor: IOS.blue,
                  "&:hover": { bgcolor: "#0066DB" },
                  "&.Mui-disabled": { bgcolor: tint(IOS.green, 0.14), color: IOS.greenText },
                }}
              >
                {publishing
                  ? "Publishing…"
                  : isPublished
                    ? changes
                      ? `Send changes (${changes})`
                      : "Published"
                    : "Publish week"}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {week && (
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: IOS.secondary }}>
          {isPublished
            ? changes
              ? `${plural(changes, "person has", "people have")} changes not sent yet${notSentText ? `: ${notSentText}` : ""}. Nobody is told until you press Send changes.`
              : `Published ${formatWhen(week.publishedAt)}. Changes wait here until you send them.${week.lastPublish ? ` Last send: ${week.lastPublish.sms || 0} by text, ${week.lastPublish.email || 0} by email${notReachedLast.length ? `, ${notReachedLast.length} not reached` : ""}.` : ""}`
            : "Staff don't see this week yet. Fill the open slots, then publish: everyone gets one text or email with their shifts and their link."}
        </Typography>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isPublished ? "Send changes?" : `Publish week of ${formatWeek(weekStart)}?`}
        </DialogTitle>
        <DialogContent>
          {(options.roles.length > 1 || options.areas.length > 0) && (
            <Box sx={{ mb: 2 }}>
              <SectionPicker
                value={section}
                onChange={setSection}
                options={options}
                allLabel={isPublished ? "All changes" : "Whole week"}
              />
            </Box>
          )}
          {section.mode === "section" ? (
            <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
              {sectionChosen(section)
                ? `Only ${sectionLabel(section, options)} is sent: ${plural(sectionPeople, "person", "people")} with new shifts there${isPublished ? ", plus anyone whose shifts there changed," : ""} get one message with their week. Everything else stays Not sent yet.`
                : "Pick the roles or areas to send."}
            </Typography>
          ) : (
          <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
            {isPublished
              ? `${changes === 1 ? "The 1 person whose shifts changed gets" : `The ${changes} people whose shifts changed each get`} one message with their updated week. Changes that cancel out aren't sent.`
              : "Everyone on this week gets one text or email with their shifts and a link to swap, pick up shifts or call out."}
          </Typography>
          )}
          {counts.openSlots > 0 && !isPublished && section.mode !== "section" && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {counts.openSlots === 1 ? "1 slot is" : `${counts.openSlots} slots are`}{" "}
              still open. You can publish now and fill them later.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={publish} disabled={!sectionChosen(section)} sx={{ textTransform: "none" }}>
            {section.mode === "section" ? "Send this section" : isPublished ? "Send" : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(result)} onClose={() => setResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {result?.error ? "Couldn't publish" : result?.sectionText ? `${result.sectionText} sent` : "Schedule sent"}
        </DialogTitle>
        <DialogContent>
          {result?.error ? (
            <Alert severity="error">{result.error}</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Typography>
                {result?.messaged
                  ? (() => {
                      const reached = (result.sent?.sms || 0) + (result.sent?.email || 0);
                      return `${reached} of ${result.messaged} ${result.messaged === 1 ? "person" : "people"} got their schedule: ${result.sent?.sms || 0} by text, ${result.sent?.email || 0} by email.`;
                    })()
                  : "Nobody needed a message."}
              </Typography>
              {result?.usedGraceWeek && (
                <Alert severity="info">
                  This was your one grace week after the trial. To publish more weeks, upgrade or
                  choose who to keep on Free.
                </Alert>
              )}
              {result?.notReached?.length > 0 && (
                <Alert severity="warning">
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                    Not reached ({result.notReached.length})
                  </Typography>
                  {result.notReached.map((person) => (
                    <Typography key={person.staffId} variant="body2">
                      {person.name}: {notSentReason(person.reason)}
                    </Typography>
                  ))}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You can copy their link from Staff and share it yourself.
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setResult(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
