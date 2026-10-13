import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { trackEvent } from "../../utils/analytics";

const PLAN_LABELS = { pro: "Pro", facility: "Facility", organization: "Organization" };

const FEATURE_COPY = {
  sms: "Texting the schedule",
  swaps: "Shift swaps",
  pickup: "Open-shift pickup",
  calloutText: "Filling call-outs by text",
  import: "CSV import",
  reminders: "Shift reminders",
  autoFill: "Auto-fill",
  timeClock: "The time clock",
  timesheets: "Timesheets and payroll export",
  messaging: "Messaging",
  dashboard: "The dashboard",
  branding: "White-label branding",
};

const describe = (detail) => {
  if (detail.errorCode === "PLAN_LIMIT_REACHED") {
    const noun = detail.kind === "schedulers" ? "schedulers" : "staff";
    return {
      title: `You've reached ${detail.limit} ${noun}`,
      body: `${detail.message}. Upgrade to add more, or archive someone you no longer schedule.`,
    };
  }
  if (detail.errorCode === "OVER_PLAN_LIMIT") {
    return {
      title: "Publishing is paused",
      body: detail.message,
    };
  }
  const feature = FEATURE_COPY[detail.feature] || "This";
  const plan = PLAN_LABELS[detail.requiredPlan] || "a paid";
  return {
    title: `${feature} is on the ${plan} plan`,
    body: `Upgrade to ${plan} to use it.`,
  };
};

/**
 * Shows when the API answers 402 (feature not on this plan, or a limit).
 * Offers the one-time free Pro trial when the backend says it's available.
 */
export default function UpgradeDialog() {
  const { can, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const onPlanRequired = (event) => setDetail(event.detail || {});
    window.addEventListener("wisershifts:plan-required", onPlanRequired);
    return () =>
      window.removeEventListener("wisershifts:plan-required", onPlanRequired);
  }, []);

  if (!detail) return null;
  const { title, body } = describe(detail);
  const canBuy = can("billing.manage");
  const close = () => setDetail(null);

  const startTrial = async () => {
    setStarting(true);
    try {
      await api.post("/billing/start-trial");
      trackEvent("trial_started");
      await refreshSession?.();
      toast.success("Your 14-day Pro trial has started. Try that again.");
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't start the trial");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{body}</Typography>
        {!canBuy && (
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            Ask your workspace owner to upgrade.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>Not now</Button>
        {canBuy && detail.trialAvailable && (
          <Button variant="outlined" onClick={startTrial} disabled={starting}>
            {starting ? "Starting…" : "Try Pro free for 14 days"}
          </Button>
        )}
        {canBuy && (
          <Button
            variant="contained"
            onClick={() => {
              close();
              navigate("/billing");
            }}
          >
            See plans
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
