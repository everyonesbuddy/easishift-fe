import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Drawer, IconButton, Typography } from "@mui/material";
import { FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { IOS } from "../../../theme/ios";
import { roleLabel } from "./laborFormat";

const num = { fontVariantNumeric: "tabular-nums" };
const time = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const day = (t) => new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const errorText = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * Overtime "fix it": someone's shifts this week that haven't started (latest
 * first, since that's where the overtime is), each with qualified people who
 * would stay under the limit. One tap gives the shift to them. In a published
 * week the change waits for "Send changes" unless sent now, like everywhere
 * else in the schedule.
 */
export default function OvertimeFixDrawer({ person, weekStart, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    if (!person) return;
    api
      .get(`/labor/overtime/${person.staffId}/options`, { params: { weekStart } })
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch((err) => setError(errorText(err, "Couldn't load their shifts")));
  }, [person, weekStart]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const sendNow = async () => {
    try {
      const res = await api.post(`/weeks/${weekStart}/publish`);
      const n = res.data?.messaged || 0;
      toast.success(n ? `Sent to ${n} ${n === 1 ? "person" : "people"}.` : "Nobody needed a message.");
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't send"));
    }
  };

  const give = async (shift, candidate) => {
    setBusy(`${shift.scheduleId}:${candidate.staffId}`);
    try {
      await api.put(`/schedules/${shift.scheduleId}`, { staffId: candidate.staffId });
      const message = `${day(shift.startTime)} given to ${candidate.name}`;
      if (shift.published) {
        toast.info(
          ({ closeToast }) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: 14, flex: 1 }}>{message}. Not sent yet.</Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  closeToast?.();
                  sendNow();
                }}
                sx={{ textTransform: "none", flexShrink: 0 }}
              >
                Send now
              </Button>
            </Box>
          ),
          { autoClose: 10000 },
        );
      } else {
        toast.success(message, { autoClose: 2500 });
      }
      onChanged?.();
      load();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't move the shift"));
    } finally {
      setBusy(null);
    }
  };

  const under = data && data.overtimeHours <= 0;

  return (
    <Drawer
      anchor="right"
      open={Boolean(person)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, bgcolor: IOS.canvas, borderTopLeftRadius: { sm: 20 }, borderBottomLeftRadius: { sm: 20 } } }}
    >
      <Box sx={{ p: 2.5, pb: 2, bgcolor: IOS.surface, borderBottom: `1px solid ${IOS.separator}`, display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography sx={{ color: IOS.secondary, fontSize: 13 }}>Prevent overtime</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>{person?.name}</Typography>
          {data && (
            <Typography sx={{ fontSize: 14, mt: 0.25, color: under ? IOS.greenText : IOS.redText, fontWeight: 600, ...num }}>
              {data.weekHours} h this week{under ? `, no overtime now` : `, ${data.overtimeHours} h overtime`}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ alignSelf: "flex-start", bgcolor: IOS.fill, color: IOS.secondary }}>
          <FiX />
        </IconButton>
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto" }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!data && !error && (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        )}
        {data && under && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: "12px" }}>
            {person?.name} is at or under {data.thresholdHours} hours now.
          </Alert>
        )}
        {data && !under && data.shifts.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: "12px" }}>
            All of their shifts this week have started, so there's nothing left to move.
          </Alert>
        )}
        {data && !under && data.shifts.length > 0 && (
          <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mb: 1.5 }}>
            Give one of their upcoming shifts to someone who's qualified, free and would stay under {data.thresholdHours} hours.
          </Typography>
        )}
        {data &&
          !under &&
          data.shifts.map((s) => (
            <Box key={s.scheduleId} sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.cell, p: 1.75, mb: 1.25 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                  {day(s.startTime)}
                  <Box component="span" sx={{ color: IOS.secondary, fontWeight: 400, fontSize: 13.5, ml: 1 }}>
                    {s.label || roleLabel(s.role)} · {time(s.startTime)}–{time(s.endTime)}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.greenText, whiteSpace: "nowrap", ...num }}>
                  saves {s.saves} h
                </Typography>
              </Box>
              {s.candidates.length ? (
                <Box sx={{ mt: 1 }}>
                  {s.candidates.map((c) => (
                    <Box key={c.staffId} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.6, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>{c.name}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>
                          {c.weekHours} h this week, {Math.round((c.weekHours + s.hours) * 10) / 10} h with this shift
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        disabled={Boolean(busy)}
                        onClick={() => give(s, c)}
                        sx={{ borderRadius: IOS.radius.round, px: 2, fontWeight: 600, flexShrink: 0 }}
                      >
                        {busy === `${s.scheduleId}:${c.staffId}` ? "Moving…" : "Give shift"}
                      </Button>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.75 }}>
                  Nobody qualified is free without going into overtime themselves.
                </Typography>
              )}
            </Box>
          ))}
      </Box>
    </Drawer>
  );
}
