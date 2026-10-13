import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { API_BASE } from "../../config/api";
import { getPunchLocation } from "../../utils/geolocation";
import { toLabel } from "../../utils/labels";

/**
 * What a staff member sees from their personal link (/s/:token).
 * No login: the token in the URL is the key. Everything here goes through
 * /api/v1/s/:token/... with its own axios instance (no account session).
 */

const pretty = toLabel;

const errorText = (err, fallback) =>
  err?.response?.data?.message || fallback;

const SWAP_STATUS = {
  pending_admin: "Waiting for scheduler",
  pending_receiver: "Waiting for coworker",
  approved: "Approved",
  accepted: "Swapped",
  denied: "Declined",
  rejected: "Declined",
  cancelled: "Cancelled",
};

const TIME_OFF_STATUS = {
  pending: { label: "Pending", color: "warning" },
  approved: { label: "Approved", color: "success" },
  denied: { label: "Denied", color: "error" },
  rejected: { label: "Denied", color: "error" },
};

const todayKey = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function StaffLinkPage() {
  const { token } = useParams();
  const client = useMemo(
    () => axios.create({ baseURL: `${API_BASE}/api/v1/s/${token}` }),
    [token],
  );

  const [me, setMe] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("shifts");
  const [notice, setNotice] = useState(null); // { severity, text }

  const [shifts, setShifts] = useState([]);
  const [shiftView, setShiftView] = useState("upcoming"); // "upcoming" | "past"
  const [pastShifts, setPastShifts] = useState(null);
  const [pastWeeks, setPastWeeks] = useState(0); // how far back is loaded
  const [pastLoading, setPastLoading] = useState(false);
  const [timezone, setTimezone] = useState(undefined);
  const [openShifts, setOpenShifts] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

  const [callOutShift, setCallOutShift] = useState(null);
  const [swapShift, setSwapShift] = useState(null);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [swapTo, setSwapTo] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [timeOffForm, setTimeOffForm] = useState({
    startDate: todayKey(),
    endDate: todayKey(),
    reason: "",
  });

  const features = me?.features || {};

  const fmtDay = useCallback(
    (iso) =>
      new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: timezone,
      }),
    [timezone],
  );
  const fmtTime = useCallback(
    (iso) =>
      new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }),
    [timezone],
  );
  const shiftLine = (s) =>
    `${fmtDay(s.startTime)} · ${fmtTime(s.startTime)}–${fmtTime(s.endTime)}`;

  const loadShifts = useCallback(async () => {
    const res = await client.get("/schedule");
    setShifts(res.data.shifts || []);
    setTimezone(res.data.timezone || undefined);
  }, [client]);

  // Past shifts, 4 weeks at a time going back.
  const PAST_STEP_WEEKS = 4;
  const loadMorePast = useCallback(async () => {
    setPastLoading(true);
    try {
      const DAY = 86400000;
      const to = pastWeeks === 0 ? new Date() : new Date(Date.now() - pastWeeks * 7 * DAY);
      const from = new Date(Date.now() - (pastWeeks + PAST_STEP_WEEKS) * 7 * DAY);
      const res = await client.get("/schedule", { params: { from: from.toISOString(), to: to.toISOString() } });
      const older = (res.data.shifts || []).filter((x) => new Date(x.endTime).getTime() <= Date.now());
      setPastShifts((prev) => {
        const seen = new Set((prev || []).map((x) => x._id));
        return [...(prev || []), ...older.filter((x) => !seen.has(x._id))];
      });
      setPastWeeks((w) => w + PAST_STEP_WEEKS);
      setTimezone(res.data.timezone || undefined);
    } catch (err) {
      setNotice({ severity: "error", text: errorText(err, "Couldn't load past shifts") });
    } finally {
      setPastLoading(false);
    }
  }, [client, pastWeeks]);

  useEffect(() => {
    if (tab === "shifts" && shiftView === "past" && pastShifts === null && !pastLoading) loadMorePast();
  }, [tab, shiftView, pastShifts, pastLoading, loadMorePast]);

  const loadTab = useCallback(
    async (which) => {
      try {
        if (which === "shifts") await loadShifts();
        if (which === "open") setOpenShifts((await client.get("/open-shifts")).data || []);
        if (which === "swaps") setSwaps((await client.get("/swaps")).data || []);
        if (which === "timeoff") setTimeOff((await client.get("/time-off")).data || []);
        if (which === "clock") {
          await loadShifts();
          setEntries((await client.get("/time-entries")).data || []);
        }
        if (which === "messages") setMessages((await client.get("/messages")).data || []);
      } catch (err) {
        setNotice({ severity: "error", text: errorText(err, "Couldn't load this") });
      }
    },
    [client, loadShifts],
  );

  useEffect(() => {
    let cancelled = false;
    client
      .get("/me")
      .then((res) => {
        if (cancelled) return;
        setMe(res.data);
        setTimezone(res.data.facility?.timezone || undefined);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err?.response?.status === 404
            ? "This link isn't active any more. Ask your scheduler to send you a new one."
            : "Couldn't load your schedule. Check your connection and try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (me) loadTab(tab);
  }, [me, tab, loadTab]);

  const run = async (fn, success) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice({ severity: "success", text: success });
      return true;
    } catch (err) {
      setNotice({ severity: "error", text: errorText(err, "Something went wrong") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // --- actions ---
  const confirmCallOut = async () => {
    const shift = callOutShift;
    setCallOutShift(null);
    await run(
      () => client.post(`/schedules/${shift._id}/call-out`),
      "Got it. Your scheduler has been told you can't make it.",
    );
    loadShifts();
  };

  const openSwap = async (shift) => {
    setSwapShift(shift);
    setSwapTo("");
    setSwapNote("");
    setSwapCandidates([]);
    try {
      const res = await client.get(`/swap-candidates/${shift._id}`);
      setSwapCandidates(res.data || []);
    } catch (err) {
      setNotice({ severity: "error", text: errorText(err, "Couldn't load coworkers") });
    }
  };

  const sendSwap = async () => {
    const shift = swapShift;
    setSwapShift(null);
    await run(
      () =>
        client.post(`/schedules/${shift._id}/swap`, {
          receiverStaffId: swapTo,
          note: swapNote,
        }),
      "Swap request sent.",
    );
  };

  const pickUp = async (coverage) => {
    const ok = await run(
      () => client.post("/open-shifts/pick-up", { coverageId: coverage._id }),
      "It's yours. The shift is on your schedule.",
    );
    if (ok) loadTab("open");
  };

  const respondSwap = async (swap, decision) => {
    await run(
      () => client.post(`/swaps/${swap._id}/respond`, { decision }),
      decision === "accept" ? "Swap accepted." : "Swap declined.",
    );
    loadTab("swaps");
  };

  const requestTimeOff = async () => {
    const ok = await run(
      () => client.post("/time-off", timeOffForm),
      "Time off requested. Your scheduler will review it.",
    );
    if (ok) {
      setTimeOffForm({ startDate: todayKey(), endDate: todayKey(), reason: "" });
      loadTab("timeoff");
    }
  };

  const activeEntry = entries.find((e) => e.status === "in_progress");
  const openBreak = activeEntry?.breaks?.find((b) => !b.endAt);
  const now = Date.now();
  const clockableShift = shifts.find(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.startTime).getTime() - 60 * 60 * 1000 <= now &&
      new Date(s.endTime).getTime() >= now,
  );

  const clock = async (path, success, withShift = false) => {
    const location = await getPunchLocation();
    await run(
      () =>
        client.post(path, {
          ...(withShift && clockableShift ? { scheduleId: clockableShift._id } : {}),
          ...(location ? { location } : {}),
        }),
      success,
    );
    loadTab("clock");
  };

  // --- render ---
  if (loadError) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">{loadError}</Alert>
      </Container>
    );
  }
  if (!me) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  const upcoming = shifts.filter((s) => new Date(s.endTime).getTime() > now);
  const nextShift = upcoming.find((s) => s.status === "scheduled" || s.status === "in_progress") || null;
  const rest = upcoming.filter((s) => s !== nextShift);
  // Group the rest by week: this week, next week, later.
  const weekStartMs = (() => {
    const d = new Date(now);
    const offset = (d.getDay() - (me.facility?.weekStartsOn ?? 0) + 7) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    return d.getTime();
  })();
  const WEEK_MS = 7 * 86400000;
  const laterGroups = [
    { label: "This week", shifts: rest.filter((s) => new Date(s.startTime).getTime() < weekStartMs + WEEK_MS) },
    {
      label: "Next week",
      shifts: rest.filter((s) => {
        const t = new Date(s.startTime).getTime();
        return t >= weekStartMs + WEEK_MS && t < weekStartMs + 2 * WEEK_MS;
      }),
    },
    { label: "Later", shifts: rest.filter((s) => new Date(s.startTime).getTime() >= weekStartMs + 2 * WEEK_MS) },
  ].filter((g) => g.shifts.length);
  // Past shifts grouped by week, newest first.
  const pastGroups = (() => {
    const list = [...(pastShifts || [])].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    const groups = new Map();
    for (const x of list) {
      const t = new Date(x.startTime).getTime();
      const weeksAgo = Math.floor((weekStartMs - t) / WEEK_MS) + 1;
      const key = t >= weekStartMs ? 0 : weeksAgo;
      if (!groups.has(key)) {
        const start = new Date(weekStartMs - key * WEEK_MS);
        groups.set(key, {
          key,
          label:
            key === 0
              ? "This week"
              : key === 1
                ? "Last week"
                : `Week of ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          shifts: [],
          minutes: 0,
        });
      }
      const g = groups.get(key);
      g.shifts.push(x);
      if (x.status !== "call_out") g.minutes += (new Date(x.endTime) - new Date(x.startTime)) / 60000;
    }
    return [...groups.values()]
      .sort((a, b) => a.key - b.key)
      .map((g) => ({ ...g, hours: Math.round((g.minutes / 60) * 10) / 10 }));
  })();
  const relativeDay = (iso) => {
    const start = new Date(iso);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff > 1 && diff < 7) return `in ${diff} days`;
    return "";
  };
  const tabs = [
    { value: "shifts", label: "My shifts" },
    features.pickup && { value: "open", label: "Open shifts" },
    features.swaps && { value: "swaps", label: "Swaps" },
    { value: "timeoff", label: "Time off" },
    features.clockIn && { value: "clock", label: "Clock in" },
    features.messages && { value: "messages", label: "Messages" },
  ].filter(Boolean);

  const card = { p: 2, borderRadius: 3, border: "1px solid #e5e7eb" };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      <Box sx={{ bgcolor: "#111827", color: "#fff", px: 2, py: 2.5 }}>
        <Container maxWidth="sm" disableGutters>
          <Typography sx={{ opacity: 0.75, fontSize: 13 }}>{me.facility?.name}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Hi {String(me.staff?.name || "").split(" ")[0]}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ pb: 6 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setNotice(null);
            setTab(v);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          {tabs.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} sx={{ textTransform: "none" }} />
          ))}
        </Tabs>

        {me.staff?.hasPhone && me.staff?.smsStatus === "opted_out" && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You've turned off texts. Reply START to any of our texts to turn them back on.
          </Alert>
        )}
        {notice && (
          <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
        )}

        {tab === "shifts" && (
          <Box sx={{ display: "flex", p: "3px", mb: 2, borderRadius: "10px", bgcolor: "rgba(118,118,128,0.12)" }} role="tablist" aria-label="Which shifts">
            {[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ].map((opt) => (
              <Box
                key={opt.value}
                component="button"
                type="button"
                role="tab"
                aria-selected={shiftView === opt.value}
                onClick={() => setShiftView(opt.value)}
                sx={{
                  all: "unset",
                  flex: 1,
                  textAlign: "center",
                  cursor: "pointer",
                  py: 0.75,
                  borderRadius: "8px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1D1D1F",
                  bgcolor: shiftView === opt.value ? "#fff" : "transparent",
                  boxShadow: shiftView === opt.value ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {opt.label}
              </Box>
            ))}
          </Box>
        )}

        {tab === "shifts" && shiftView === "past" && (
          <Stack spacing={2.5}>
            {pastShifts === null ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : pastGroups.length === 0 ? (
              <Paper elevation={0} sx={{ ...card, textAlign: "center", py: 4 }}>
                <Typography sx={{ fontWeight: 700 }}>No past shifts in the last {pastWeeks} weeks</Typography>
              </Paper>
            ) : (
              pastGroups.map((group) => (
                <Box key={group.key}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{group.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.shifts.filter((x) => x.status !== "call_out").length} shift
                      {group.shifts.filter((x) => x.status !== "call_out").length === 1 ? "" : "s"} · {group.hours}h
                    </Typography>
                  </Box>
                  <Paper elevation={0} sx={{ ...card, p: 0 }}>
                    {group.shifts.map((x, i) => (
                      <Box key={x._id} sx={{ display: "flex", gap: 2, alignItems: "center", px: 2, py: 1.5, borderTop: i ? "1px solid #e5e7eb" : "none" }}>
                        <Box sx={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
                            {new Date(x.startTime).toLocaleDateString(undefined, { weekday: "short", timeZone: timezone })}
                          </Typography>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: "text.secondary" }}>
                            {new Date(x.startTime).toLocaleDateString(undefined, { day: "numeric", timeZone: timezone })}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {fmtTime(x.startTime)}–{fmtTime(x.endTime)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {pretty(x.role)}
                            {x.unitArea ? `, ${pretty(x.unitArea)}` : ""}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={x.status === "call_out" ? "Called out" : x.status === "scheduled" || x.status === "completed" ? "Worked" : pretty(x.status)}
                          sx={{
                            fontWeight: 600,
                            bgcolor: x.status === "call_out" ? "rgba(255,59,48,0.1)" : "rgba(52,199,89,0.12)",
                            color: x.status === "call_out" ? "#D70015" : "#248A3D",
                          }}
                        />
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ))
            )}
            {pastShifts !== null && (
              <Button onClick={loadMorePast} disabled={pastLoading} sx={{ textTransform: "none", alignSelf: "center" }}>
                {pastLoading ? "Loading…" : `Show earlier (before ${pastWeeks} weeks ago)`}
              </Button>
            )}
          </Stack>
        )}

        {tab === "shifts" && shiftView === "upcoming" && (
          <Stack spacing={2.5}>
            {upcoming.length === 0 && (
              <Paper elevation={0} sx={{ ...card, textAlign: "center", py: 4 }}>
                <Typography sx={{ fontWeight: 700 }}>No upcoming shifts</Typography>
                <Typography variant="body2" color="text.secondary">
                  {features.pickup ? "Check Open shifts to pick one up." : "You'll get a message when your schedule is out."}
                </Typography>
              </Paper>
            )}

            {nextShift && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: "#2563EB", color: "#fff" }}>
                <Typography sx={{ opacity: 0.85, fontSize: 14 }}>
                  Your next shift{relativeDay(nextShift.startTime) ? `, ${relativeDay(nextShift.startTime)}` : ""}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.2, mt: 0.5 }}>
                  {fmtDay(nextShift.startTime)}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20 }}>
                  {fmtTime(nextShift.startTime)}–{fmtTime(nextShift.endTime)}
                </Typography>
                <Typography sx={{ opacity: 0.85, mt: 0.5 }}>
                  {pretty(nextShift.role)}
                  {nextShift.unitArea ? `, ${pretty(nextShift.unitArea)}` : ""}
                </Typography>
                {nextShift.status === "scheduled" && new Date(nextShift.startTime).getTime() > now && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {features.swaps && (
                      <Button size="small" variant="contained" onClick={() => openSwap(nextShift)} sx={{ textTransform: "none", bgcolor: "#fff !important", color: "#1E3A8A", fontWeight: 700 }}>
                        Swap
                      </Button>
                    )}
                    <Button size="small" onClick={() => setCallOutShift(nextShift)} sx={{ textTransform: "none", color: "#fff", border: "1px solid rgba(255,255,255,0.5)" }}>
                      Can't make it
                    </Button>
                  </Stack>
                )}
              </Paper>
            )}

            {laterGroups.map((group) => (
              <Box key={group.label}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, mb: 1 }}>{group.label}</Typography>
                <Paper elevation={0} sx={{ ...card, p: 0 }}>
                  {group.shifts.map((s, i) => (
                    <Box key={s._id} sx={{ display: "flex", gap: 2, alignItems: "center", px: 2, py: 1.5, borderTop: i ? "1px solid #e5e7eb" : "none" }}>
                      <Box sx={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
                          {new Date(s.startTime).toLocaleDateString(undefined, { weekday: "short", timeZone: timezone })}
                        </Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
                          {new Date(s.startTime).toLocaleDateString(undefined, { day: "numeric", timeZone: timezone })}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {pretty(s.role)}
                          {s.unitArea ? `, ${pretty(s.unitArea)}` : ""}
                          {s.status !== "scheduled" ? `, ${pretty(s.status)}` : ""}
                        </Typography>
                      </Box>
                      {s.status === "scheduled" && new Date(s.startTime).getTime() > now && (
                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                          {features.swaps && (
                            <Button size="small" onClick={() => openSwap(s)} sx={{ textTransform: "none", minWidth: 0 }}>
                              Swap
                            </Button>
                          )}
                          <Button size="small" color="error" onClick={() => setCallOutShift(s)} sx={{ textTransform: "none", minWidth: 0, whiteSpace: "nowrap" }}>
                            Can't make it
                          </Button>
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Paper>
              </Box>
            ))}
          </Stack>
        )}

        {tab === "open" && (
          <Stack spacing={1.5}>
            {openShifts.length === 0 && (
              <Typography color="text.secondary">No open shifts you can take right now.</Typography>
            )}
            {openShifts.map((c) => (
              <Paper key={c._id} elevation={0} sx={card}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{shiftLine(c)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pretty(c.role)}
                      {c.unitArea ? ` · ${pretty(c.unitArea)}` : ""}
                      {c.remaining > 1 ? ` · ${c.remaining} spots` : ""}
                    </Typography>
                  </Box>
                  <Button variant="contained" disabled={busy} onClick={() => pickUp(c)} sx={{ textTransform: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Pick up
                  </Button>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        {tab === "swaps" && (
          <Stack spacing={1.5}>
            {swaps.length === 0 && <Typography color="text.secondary">No swap requests.</Typography>}
            {swaps.map((sw) => {
              const mine = String(sw.requesterStaffId?._id || sw.requesterStaffId) === String(me.staff._id);
              const shift = sw.scheduleId;
              return (
                <Paper key={sw._id} elevation={0} sx={card}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {shift?.startTime ? shiftLine(shift) : "Shift"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mine
                      ? `You asked ${sw.receiverStaffId?.name || "a coworker"} to take it`
                      : `${sw.requesterStaffId?.name || "A coworker"} asked you to take it`}
                    {" · "}
                    {SWAP_STATUS[sw.status] || pretty(sw.status)}
                  </Typography>
                  {!mine && sw.status === "pending_receiver" && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="contained" disabled={busy} onClick={() => respondSwap(sw, "accept")} sx={{ textTransform: "none" }}>
                        Accept
                      </Button>
                      <Button size="small" variant="outlined" disabled={busy} onClick={() => respondSwap(sw, "deny")} sx={{ textTransform: "none" }}>
                        Decline
                      </Button>
                    </Stack>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}

        {tab === "timeoff" && (
          <Stack spacing={2}>
            <Paper elevation={0} sx={card}>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Request time off</Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    type="date"
                    label="From"
                    size="small"
                    fullWidth
                    value={timeOffForm.startDate}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="date"
                    label="To"
                    size="small"
                    fullWidth
                    value={timeOffForm.endDate}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                <TextField
                  label="Reason (optional)"
                  size="small"
                  value={timeOffForm.reason}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                />
                <Button variant="contained" disabled={busy} onClick={requestTimeOff} sx={{ textTransform: "none" }}>
                  Send request
                </Button>
              </Stack>
            </Paper>
            {timeOff.map((t) => {
              const status = TIME_OFF_STATUS[t.status] || { label: pretty(t.status), color: "default" };
              return (
                <Paper key={t._id} elevation={0} sx={card}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 600 }}>
                      {fmtDay(t.startTime)}
                      {fmtDay(t.startTime) !== fmtDay(new Date(new Date(t.endTime).getTime() - 1)) &&
                        ` – ${fmtDay(new Date(new Date(t.endTime).getTime() - 1))}`}
                    </Typography>
                    <Chip size="small" color={status.color} label={status.label} />
                  </Box>
                  {t.reason && (
                    <Typography variant="body2" color="text.secondary">{t.reason}</Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}

        {tab === "clock" && (
          <Paper elevation={0} sx={card}>
            {activeEntry ? (
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  Clocked in at {fmtTime(activeEntry.clockInAt)}
                  {openBreak ? ` · on break since ${fmtTime(openBreak.startAt)}` : ""}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {openBreak ? (
                    <Button variant="outlined" disabled={busy} onClick={() => clock("/breaks/end", "Break ended.")} sx={{ textTransform: "none" }}>
                      End break
                    </Button>
                  ) : (
                    <Button variant="outlined" disabled={busy} onClick={() => clock("/breaks/start", "Break started.")} sx={{ textTransform: "none" }}>
                      Start break
                    </Button>
                  )}
                  <Button variant="contained" color="error" disabled={busy} onClick={() => clock("/clock-out", "Clocked out.")} sx={{ textTransform: "none" }}>
                    Clock out
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  {clockableShift ? `Your shift: ${shiftLine(clockableShift)}` : "No shift starting soon."}
                </Typography>
                <Button
                  variant="contained"
                  disabled={busy || !clockableShift}
                  onClick={() => clock("/clock-in", "Clocked in.", true)}
                  sx={{ textTransform: "none", py: 1.2 }}
                >
                  Clock in
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Your location may be checked when you clock in.
                </Typography>
              </Stack>
            )}
          </Paper>
        )}

        {tab === "messages" && (
          <Stack spacing={1.5}>
            {messages.length === 0 && <Typography color="text.secondary">No messages.</Typography>}
            {messages.map((m) => (
              <Paper key={m._id} elevation={0} sx={card}>
                {m.subject && <Typography sx={{ fontWeight: 700 }}>{m.subject}</Typography>}
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{m.body}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {m.createdAt ? `${fmtDay(m.createdAt)} ${fmtTime(m.createdAt)}` : ""}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 4, textAlign: "center" }}>
          This is your personal link. Don't share it. Powered by WiserShifts.
        </Typography>
      </Container>

      <Dialog open={Boolean(callOutShift)} onClose={() => setCallOutShift(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Can't make this shift?</DialogTitle>
        <DialogContent>
          <Typography>
            {callOutShift ? shiftLine(callOutShift) : ""}. We'll let your scheduler know
            right away so they can find cover.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCallOutShift(null)}>Keep shift</Button>
          <Button color="error" variant="contained" onClick={confirmCallOut} sx={{ textTransform: "none" }}>
            I can't make it
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(swapShift)} onClose={() => setSwapShift(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Ask someone to swap</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {swapShift ? shiftLine(swapShift) : ""}
          </Typography>
          {swapCandidates.length === 0 ? (
            <Typography color="text.secondary">No coworkers are free for this shift.</Typography>
          ) : (
            <Stack spacing={2}>
              <TextField select label="Coworker" value={swapTo} onChange={(e) => setSwapTo(e.target.value)}>
                {swapCandidates.map((c) => (
                  <MenuItem key={c.staffId} value={c.staffId}>{c.name}</MenuItem>
                ))}
              </TextField>
              <TextField label="Note (optional)" value={swapNote} onChange={(e) => setSwapNote(e.target.value)} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSwapShift(null)}>Cancel</Button>
          <Button variant="contained" disabled={!swapTo} onClick={sendSwap} sx={{ textTransform: "none" }}>
            Send request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
