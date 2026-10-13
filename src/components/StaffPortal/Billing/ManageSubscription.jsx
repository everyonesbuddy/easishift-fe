import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import useBillingPlans from "../../../hooks/useBillingPlans";
import { trackEvent } from "../../../utils/analytics";
import {
  PLAN_FEATURES,
  PLAN_TAGLINES,
  daysLeft,
  formatLimit,
  formatPrice,
} from "../../../config/billingPlans";

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Request failed";

export default function ManageSubscription() {
  const { can, refreshSession } = useAuth();
  const { data, loading, error: loadError, refetch } = useBillingPlans();
  const [interval, setBillingInterval] = useState("month");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const canManage = can("billing.manage");
  const plans = useMemo(() => (Array.isArray(data?.plans) ? data.plans : []), [data]);
  const effective = data?.effectivePlan || "free";
  const isPaying =
    data?.currentPlan &&
    data.currentPlan !== "free" &&
    ["active", "trialing", "past_due"].includes(data?.subscriptionStatus);
  const onTrial = !isPaying && effective === "pro" && data?.trialEndsAt;

  const refreshAll = () => Promise.all([refetch(), refreshSession?.()]);

  const run = async (key, fn) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const startTrial = () =>
    run("trial", async () => {
      await api.post("/billing/start-trial");
      trackEvent("trial_started");
      toast.success("Your 14-day Pro trial has started.");
      await refreshAll();
    });

  const choosePlan = (plan) =>
    run(plan, async () => {
      if (isPaying) {
        await api.post("/stripe/change-plan", { plan, interval });
        trackEvent("subscription_change_requested");
        toast.success("Plan updated.");
        await refreshAll();
        return;
      }
      const res = await api.post("/stripe/create-checkout-session", {
        plan,
        interval,
      });
      if (!res.data?.url) throw new Error("Missing checkout URL from server");
      trackEvent("begin_checkout");
      window.location.href = res.data.url;
    });

  const openPortal = () =>
    run("portal", async () => {
      const res = await api.post("/stripe/portal");
      if (res.data?.url) window.location.href = res.data.url;
    });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 6, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Plan and billing
        </Typography>
        <Typography color="text.secondary">
          Flat pricing — never per employee. Viewers are always free.
        </Typography>
      </Stack>

      {(error || loadError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || loadError}
        </Alert>
      )}

      {/* Where the workspace stands */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                You're on {plans.find((p) => p.key === effective)?.label || "Free"}
              </Typography>
              {onTrial && (
                <Chip
                  size="small"
                  color="primary"
                  label={`Trial · ${daysLeft(data.trialEndsAt)} days left`}
                />
              )}
              {data?.foundingMember && <Chip size="small" label="Founding member" />}
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {data?.usage?.staff ?? 0} staff · {data?.usage?.schedulers ?? 0}{" "}
              scheduler{data?.usage?.schedulers === 1 ? "" : "s"}
            </Typography>
            {data?.usage?.overLimit && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                You have more staff or schedulers than this plan allows.
                Publishing new weeks is paused until you upgrade or archive
                staff. Nothing has been deleted.
              </Alert>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {canManage && data?.trialAvailable && (
              <Button
                variant="contained"
                onClick={startTrial}
                disabled={busy === "trial"}
              >
                {busy === "trial" ? "Starting…" : "Try Pro free for 14 days"}
              </Button>
            )}
            {canManage && isPaying && (
              <Button
                variant="outlined"
                onClick={openPortal}
                disabled={busy === "portal"}
              >
                Invoices, card and cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" sx={{ justifyContent: "center", mb: 3 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={interval}
          onChange={(_, value) => value && setBillingInterval(value)}
        >
          <ToggleButton value="month" sx={{ px: 2.5, textTransform: "none" }}>
            Monthly
          </ToggleButton>
          <ToggleButton value="year" sx={{ px: 2.5, textTransform: "none" }}>
            Yearly (2 months free)
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {plans.map((plan) => {
          const isCurrent = plan.key === effective;
          const price = plan.prices?.[interval] ?? null;
          const founding =
            plan.key === "pro" && interval === "month" && plan.foundingPrice;
          return (
            <Paper
              key={plan.key}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                borderColor: plan.key === "pro" ? "primary.main" : "divider",
                borderWidth: plan.key === "pro" ? 2 : 1,
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>
                    {plan.label}
                  </Typography>
                  {isCurrent && <Chip size="small" label="Current" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {PLAN_TAGLINES[plan.key]}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.6rem" }}>
                  {plan.key === "free"
                    ? "$0"
                    : plan.purchasable
                      ? formatPrice(price, interval)
                      : "Custom"}
                </Typography>
                {founding && (
                  <Typography variant="body2" color="primary">
                    Founding price {formatPrice(plan.foundingPrice.month, "month")} for life
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {formatLimit(plan.limits?.staff, "staff")} ·{" "}
                  {formatLimit(plan.limits?.schedulers, "schedulers")}
                </Typography>
              </Box>
              <Stack spacing={0.75} sx={{ flex: 1 }}>
                {(PLAN_FEATURES[plan.key] || []).map((feature) => (
                  <Stack key={feature} direction="row" spacing={1}>
                    <CheckCircleRoundedIcon
                      fontSize="small"
                      color="success"
                      sx={{ mt: "2px" }}
                    />
                    <Typography variant="body2">{feature}</Typography>
                  </Stack>
                ))}
              </Stack>
              {plan.purchasable && canManage && !(isCurrent && isPaying) && (
                <Button
                  variant={plan.key === "pro" ? "contained" : "outlined"}
                  onClick={() => choosePlan(plan.key)}
                  disabled={Boolean(busy)}
                >
                  {busy === plan.key
                    ? "One moment…"
                    : isPaying
                      ? `Switch to ${plan.label}`
                      : `Choose ${plan.label}`}
                </Button>
              )}
              {plan.key === "organization" && (
                <Button variant="outlined" href="/contact">
                  Talk to us
                </Button>
              )}
            </Paper>
          );
        })}
      </Box>

      {!canManage && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Only the workspace owner can change the plan.
        </Typography>
      )}
    </Container>
  );
}
