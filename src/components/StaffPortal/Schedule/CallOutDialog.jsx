import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import {
  ineligibleReason,
  notSentReason,
} from "../../../utils/deliveryReasons";

const shiftLabel = (schedule) => {
  if (!schedule?.startTime) return "";
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = (d) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time(start)}–${time(end)}`;
};

/**
 * Scheduler marks someone out, then fills the gap: text everyone eligible
 * (first YES wins, Pro) or assign a specific person.
 */
export default function CallOutDialog({ open, schedule, onClose, onChanged }) {
  const { hasFeature } = useAuth();
  const [step, setStep] = useState("confirm");
  const [busy, setBusy] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [textResult, setTextResult] = useState(null);

  const name = schedule?.staffId?.name || "This person";
  const eligible = candidates.filter((c) => c.eligible);
  const others = candidates.filter((c) => !c.eligible);
  const canText = hasFeature("calloutText");

  const reset = () => {
    setStep("confirm");
    setCoverage(null);
    setCandidates([]);
    setTextResult(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const errorToast = (err, fallback) => {
    if (err?.response?.status === 402) return;
    toast.error(err?.response?.data?.message || fallback, {
      position: "top-right",
    });
  };

  const markOut = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/schedules/${schedule._id}/call-out`);
      setCoverage(res.data.coverage);
      setCandidates(res.data.candidates || []);
      setStep("fill");
      onChanged?.();
    } catch (err) {
      errorToast(err, "Couldn't mark the call-out");
    } finally {
      setBusy(false);
    }
  };

  const textEligible = async () => {
    if (!coverage?._id) return;
    setBusy(true);
    try {
      const res = await api.post(`/coverage/${coverage._id}/fill-by-text`, {});
      setTextResult(res.data);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.candidates) setCandidates(data.candidates);
      errorToast(err, "Couldn't send the texts");
    } finally {
      setBusy(false);
    }
  };

  const assign = async (candidate) => {
    if (!coverage) return;
    setBusy(true);
    try {
      await api.post("/schedules", {
        staffId: candidate.staffId,
        coverageId: coverage._id,
        role: coverage.role,
        unitArea: coverage.unitArea || null,
        shiftType: coverage.shiftType || null,
        shiftTag: coverage.shiftTag || null,
        startTime: coverage.startTime,
        endTime: coverage.endTime,
      });
      toast.success(`${candidate.name} is covering`, {
        position: "top-right",
        autoClose: 2500,
      });
      onChanged?.();
      handleClose();
    } catch (err) {
      errorToast(err, "Couldn't assign");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {step === "confirm" ? "Mark as called out?" : "Fill the shift"}
      </DialogTitle>
      <DialogContent dividers>
        {step === "confirm" ? (
          <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
            <strong>{name}</strong> won't be working {shiftLabel(schedule)}.
            The slot opens up and we'll show you who can cover.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {coverage?.remaining <= 0 && (
              <Alert severity="success">This shift is already covered.</Alert>
            )}

            {textResult ? (
              <Alert severity="success">
                Offered to {textResult.sentTo}{" "}
                {textResult.sentTo === 1 ? "person" : "people"}: {textResult.bySms || 0} by
                text, {textResult.byEmail || 0} by email. The first to say yes gets the
                shift, and you'll get an email.
                {textResult.notReached?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    Not reached:{" "}
                    {textResult.notReached
                      .map((p) => `${p.name} (${notSentReason(p.reason)})`)
                      .join(", ")}
                  </Box>
                )}
              </Alert>
            ) : (
              eligible.length > 0 && (
                <Box>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={busy || coverage?.remaining <= 0}
                    onClick={textEligible}
                    sx={{ textTransform: "none", py: 1.2, borderRadius: 2 }}
                  >
                    Text {eligible.length} eligible{" "}
                    {eligible.length === 1 ? "person" : "people"}. First YES gets it
                    {!canText && (
                      <Chip size="small" label="Pro" sx={{ ml: 1, bgcolor: "#fff" }} />
                    )}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    People this would put into overtime are skipped.
                  </Typography>
                </Box>
              )
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Can cover ({eligible.length})
              </Typography>
              {eligible.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nobody eligible is free. You can still assign someone from the
                  schedule.
                </Typography>
              )}
              <Stack divider={<Divider flexItem />} spacing={1}>
                {eligible.map((c) => (
                  <Box
                    key={c.staffId}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.weekHours}h this week
                        {c.overtimeIfAssigned ? " · would be overtime" : ""}
                        {!c.hasPhone ? " · no phone" : ""}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy || coverage?.remaining <= 0}
                      onClick={() => assign(c)}
                      sx={{ textTransform: "none" }}
                    >
                      Assign
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>

            {others.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Can't cover ({others.length})
                </Typography>
                {others.map((c) => (
                  <Typography key={c.staffId} variant="body2" color="text.secondary">
                    {c.name}: {(c.reasons || []).map(ineligibleReason).join(", ")}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>{step === "confirm" ? "Cancel" : "Done"}</Button>
        {step === "confirm" && (
          <Button
            variant="contained"
            color="error"
            disabled={busy}
            onClick={markOut}
            sx={{ textTransform: "none" }}
          >
            Mark called out
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
