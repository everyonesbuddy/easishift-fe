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

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The week strip on the schedule page: which week, how full it is,
 * and the Publish button. Opening a week fills its open slots from the
 * staffing template.
 */
export default function WeekPublishBar({ refreshKey, onChanged }) {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const lastLoadedWeek = useRef(null);

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
    } catch (err) {
      console.error("Failed to load week", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await api.post(`/weeks/${weekStart}/publish`);
      setResult(res.data);
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
  const changes = counts.unpublishedChanges || 0;
  const canPublish = !isPublished || changes > 0;
  const notReachedLast = week?.lastPublish?.notReached || [];

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: { xs: 1.5, md: 2 },
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        backgroundColor: isPublished ? "#F0FDF4" : "#FFFBEB",
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
          >
            <FiChevronLeft />
          </IconButton>
          <Typography sx={{ fontWeight: 700, minWidth: 130, textAlign: "center" }}>
            {weekStart ? `Week of ${formatWeek(weekStart)}` : "Loading week…"}
          </Typography>
          <IconButton
            size="small"
            aria-label="Next week"
            onClick={() => goToWeek(addDays(weekStart, 7))}
            disabled={!weekStart || loading}
          >
            <FiChevronRight />
          </IconButton>
          {week && (
            <Chip
              size="small"
              label={isPublished ? "Published" : "Draft"}
              color={isPublished ? "success" : "warning"}
              sx={{ fontWeight: 700 }}
            />
          )}
          {data && (
            <Typography variant="body2" color="text.secondary">
              {plural(counts.shifts || 0, "shift")} ·{" "}
              <Box
                component="span"
                sx={{ color: counts.openSlots ? "#B45309" : "inherit", fontWeight: counts.openSlots ? 700 : 400 }}
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
            sx={{ textTransform: "none" }}
          >
            Weekly needs
          </Button>
          <Tooltip
            title={
              isPublished && !changes
                ? "Published. Edits from now on notify just the person affected."
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
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  bgcolor: "#15803D",
                  "&:hover": { bgcolor: "#166534" },
                }}
              >
                {publishing
                  ? "Publishing…"
                  : isPublished
                    ? changes
                      ? `Send ${plural(changes, "change")}`
                      : "Published"
                    : "Publish week"}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {week && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {isPublished
            ? `Published ${formatWhen(week.publishedAt)}. ${week.lastPublish ? `Last send: ${week.lastPublish.sms || 0} by text, ${week.lastPublish.email || 0} by email${notReachedLast.length ? `, ${notReachedLast.length} not reached` : ""}.` : ""}`
            : "Staff don't see this week yet. Fill the open slots, then publish: everyone gets one text or email with their shifts and their link."}
        </Typography>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isPublished ? "Send changes?" : `Publish week of ${formatWeek(weekStart)}?`}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
            {isPublished
              ? "Only people whose shifts changed get a message."
              : "Everyone on this week gets one text or email with their shifts and a link to swap, pick up shifts or call out."}
          </Typography>
          {counts.openSlots > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {counts.openSlots === 1 ? "1 slot is" : `${counts.openSlots} slots are`}{" "}
              still open. You can publish now and fill them later.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={publish} sx={{ textTransform: "none" }}>
            {isPublished ? "Send" : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(result)} onClose={() => setResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {result?.error ? "Couldn't publish" : "Schedule sent"}
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
                    You can copy their link from Staff Management and share it yourself.
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
