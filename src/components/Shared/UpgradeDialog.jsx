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
import { planLabel } from "../../config/billingPlans";

const FEATURE_COPY = {
  sms: "Texting the schedule",
  swaps: "Shift swaps",
  pickup: "Open-shift pickup",
  calloutText: "Filling call-outs by text",
  import: "Spreadsheet import",
  reminders: "Shift reminders",
  autoFill: "Automated scheduling",
  describeNeeds: "Describing your week by typing or voice",
  timeClock: "The time clock",
  timesheets: "Timesheets and payroll export",
  messaging: "Messaging",
  dashboard: "The dashboard",
  branding: "Your branding",
  prioritySupport: "Priority support",
};

// When a plan answer (402) opens this dialog, the screen that made the
// request often also shows a generic error toast. Skip toasts right after a
// 402 so people see one clear message, not two.
const originalToastError = toast.error;
toast.error = (...args) =>
  Date.now() - (window.__wisershiftsPlanNoticeAt || 0) < 1500
    ? null
    : originalToastError(...args);

const describe = (detail) => {
  if (detail.errorCode === "SCHEDULER_READ_ONLY") {
    return {
      title: "You can look, but not change things right now",
      body: "This workspace has more schedulers than its plan allows, so only the owner can make changes. Ask the owner to upgrade or choose who stays a scheduler.",
    };
  }
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
      body: "You have more staff or schedulers than your plan allows. Upgrade, or choose who to keep on your plan. Nothing has been deleted, and published weeks keep working.",
      fit: true,
    };
  }
  const feature = FEATURE_COPY[detail.feature] || "This";
  const plan = planLabel(detail.requiredPlan);
  return {
    title: `${feature} is on the ${plan} plan`,
    body: detail.trialAvailable
      ? "Try Starter free for 14 days, no card needed. If you don't upgrade, you go back to Free and nothing is deleted."
      : `Upgrade to ${plan} to use it.`,
  };
};

/**
 * Shows when the API answers 402 (feature not on this plan, or a limit).
 * Offers the one-time free Starter trial when the backend says it's available.
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
  const { title, body, fit } = describe(detail);
  const canBuy = can("billing.manage");
  const close = () => setDetail(null);

  const startTrial = async () => {
    setStarting(true);
    try {
      await api.post("/billing/start-trial");
      trackEvent("trial_started");
      await refreshSession?.();
      toast.success("Your 14-day Starter trial has started. Try that again.");
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't start the trial");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{body}</Typography>
        {!canBuy && detail.errorCode !== "SCHEDULER_READ_ONLY" && (
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            Ask your workspace owner to upgrade.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>Not now</Button>
        {canBuy && detail.trialAvailable && (
          <Button variant="outlined" onClick={startTrial} disabled={starting}>
            {starting ? "Starting…" : "Try Starter free for 14 days"}
          </Button>
        )}
        {canBuy && fit && (
          <Button
            variant="outlined"
            onClick={() => {
              close();
              navigate("/billing/keep");
            }}
          >
            Choose who to keep
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
