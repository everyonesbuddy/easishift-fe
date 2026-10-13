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

/**
 * What a staff member sees from their personal link (/s/:token).
 * No login: the token in the URL is the key. Everything here goes through
 * /api/v1/s/:token/... with its own axios instance (no account session).
 */

const pretty = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
          <Stack spacing={1.5}>
            {upcoming.length === 0 && (
              <Typography color="text.secondary">No upcoming shifts.</Typography>
            )}
            {upcoming.map((s) => (
              <Paper key={s._id} elevation={0} sx={card}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{shiftLine(s)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pretty(s.role)}
                      {s.unitArea ? ` · ${pretty(s.unitArea)}` : ""}
                    </Typography>
                  </Box>
                  {s.status !== "scheduled" && (
                    <Chip size="small" label={pretty(s.status)} />
                  )}
                </Box>
                {s.status === "scheduled" && new Date(s.startTime).getTime() > now && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    {features.swaps && (
                      <Button size="small" variant="outlined" onClick={() => openSwap(s)} sx={{ textTransform: "none" }}>
                        Swap
                      </Button>
                    )}
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => setCallOutShift(s)}
                      sx={{ textTransform: "none" }}
                    >
                      Can't make it
                    </Button>
                  </Stack>
                )}
              </Paper>
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
