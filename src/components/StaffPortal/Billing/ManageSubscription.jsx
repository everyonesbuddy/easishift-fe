import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import useBillingPlans from "../../../hooks/useBillingPlans";
import { trackEvent } from "../../../utils/analytics";
import {
  ENTERPRISE_FEATURES,
  FREE_FEATURES,
  PAID_FEATURES,
  PAID_PLAN_KEYS,
  PLAN_TAGLINES,
  POPULAR_PLAN,
  SUPPORT_LABELS,
  daysLeft,
  formatLimit,
  formatMoney,
} from "../../../config/billingPlans";

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Request failed";

const INK = "#1F2937";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";

function UsageMeter({ label, used, limit }) {
  const unlimited = limit === null || limit === undefined;
  const over = !unlimited && used > limit;
  const pct = unlimited ? 8 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <Box sx={{ minWidth: 160 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" sx={{ color: MUTED }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: over ? "error.main" : INK, fontVariantNumeric: "tabular-nums" }}
        >
          {used} of {unlimited ? "unlimited" : limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={over ? "error" : "primary"}
        sx={{ height: 6, borderRadius: 3, bgcolor: "#EEF2F7" }}
      />
    </Box>
  );
}

function FeatureList({ items, dense = false }) {
  return (
    <Stack spacing={dense ? 0.5 : 0.75}>
      {items.map((feature) => (
        <Stack key={feature} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <CheckRoundedIcon sx={{ fontSize: 18, mt: "2px", color: "primary.main" }} />
          <Typography variant="body2" sx={{ color: INK }}>
            {feature}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export default function ManageSubscription() {
  const { can, refreshSession, session } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error: loadError, refetch } = useBillingPlans();
  const [interval, setBillingInterval] = useState("month");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const canManage = can("billing.manage");
  const plans = useMemo(() => (Array.isArray(data?.plans) ? data.plans : []), [data]);
  const byKey = useMemo(() => Object.fromEntries(plans.map((p) => [p.key, p])), [plans]);
  const effective = data?.effectivePlan || "free";
  const isPaying =
    data?.currentPlan &&
    data.currentPlan !== "free" &&
    ["active", "trialing", "past_due"].includes(data?.subscriptionStatus);
  const onTrial = !isPaying && effective !== "free" && data?.trialEndsAt;
  const effectivePlan = byKey[effective];
  const trialDays = data?.checkoutTrialDays?.[interval] || 0;
  const grace = session?.grace;

  const refreshAll = () => Promise.all([refetch(), refreshSession?.()]);

  const run = async (key, fn) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      // 402 / 409 limit answers are explained inline, and as a toast so
      // they're seen even when the page is scrolled down to the plans.
      const message = errorMessage(err);
      setError(message);
      if (err?.response?.status !== 402) toast.error(message, { autoClose: 7000 });
    } finally {
      setBusy(null);
    }
  };

  const startTrial = () =>
    run("trial", async () => {
      await api.post("/billing/start-trial");
      trackEvent("trial_started");
      toast.success("Your 14-day Starter trial has started.");
      await refreshAll();
    });

  const choosePlan = (plan) =>
    run(plan, async () => {
      if (isPaying) {
        await api.post("/stripe/change-plan", { plan, interval });
        trackEvent("subscription_change_requested");
        toast.success("Plan changed.");
        await refreshAll();
        return;
      }
      const res = await api.post("/stripe/create-checkout-session", { plan, interval });
      if (res.data?.changed) {
        // Already had a subscription: it was switched in place.
        trackEvent("subscription_change_requested");
        toast.success("Plan changed.");
        await refreshAll();
        return;
      }
      if (!res.data?.url) throw new Error("Checkout didn't open. Try again.");
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

  const freePlan = byKey.free;
  const paidPlans = PAID_PLAN_KEYS.map((key) => byKey[key]).filter(Boolean);

  const ctaLabel = (plan) => {
    if (busy === plan.key) return "Opening checkout…";
    if (isPaying) return `Switch to ${plan.label}`;
    return trialDays ? `Start ${trialDays}-day trial` : `Choose ${plan.label}`;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 8, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
        Plan and billing
      </Typography>
      <Typography sx={{ color: MUTED, mt: 0.5, mb: 3 }}>
        One price per facility. Viewers are always free.
      </Typography>

      {(error || loadError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error || loadError}
        </Alert>
      )}

      {/* Where this workspace stands */}
      <Paper
        elevation={0}
        sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 3, border: `1px solid ${LINE}` }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: INK }}>
                {effectivePlan?.label || "Free"}
              </Typography>
              {onTrial && (
                <Chip
                  size="small"
                  color="primary"
                  label={`Free trial, ${daysLeft(data.trialEndsAt)} days left`}
                />
              )}
              {data?.subscriptionStatus === "past_due" && (
                <Chip size="small" color="error" label="Payment failed" />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: MUTED, mt: 0.5 }}>
              {isPaying
                ? `Billed ${data?.billingInterval === "year" ? "yearly" : "monthly"}`
                : onTrial
                  ? "When the trial ends you go back to Free. Nothing is deleted."
                  : "Free forever for one scheduler and up to 15 staff."}
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
            <UsageMeter label="Active staff" used={data?.usage?.staff ?? 0} limit={effectivePlan?.limits?.staff} />
            <UsageMeter
              label="Schedulers"
              used={data?.usage?.schedulers ?? 0}
              limit={effectivePlan?.limits?.schedulers}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {canManage && data?.trialAvailable && (
              <Button variant="contained" onClick={startTrial} disabled={busy === "trial"} sx={{ textTransform: "none", fontWeight: 700 }}>
                {busy === "trial" ? "Starting…" : "Try Starter free for 14 days"}
              </Button>
            )}
            {canManage && isPaying && (
              <Button variant="outlined" onClick={openPortal} disabled={busy === "portal"} sx={{ textTransform: "none" }}>
                Invoices, card and cancel
              </Button>
            )}
          </Stack>
        </Stack>

        {data?.usage?.overLimit && (
          <Alert
            severity="warning"
            sx={{ mt: 2.5 }}
            action={
              canManage && (
                <Button color="inherit" size="small" onClick={() => navigate("/billing/keep")} sx={{ textTransform: "none", fontWeight: 700 }}>
                  Choose who to keep
                </Button>
              )
            }
          >
            You have more people than {effectivePlan?.label || "this plan"} allows, so adding people and
            publishing new weeks are paused.
            {grace?.available && !grace.weekStart
              ? " You can still publish one more week until " +
                new Date(grace.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
                "."
              : ""}{" "}
            Upgrade, or choose who to keep. Nothing has been deleted.
          </Alert>
        )}
      </Paper>

      {/* Interval */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 2 }}
      >
        <Typography sx={{ fontWeight: 700, color: INK }}>Plans</Typography>
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
            Yearly, save up to 20%
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "0.85fr repeat(3, 1fr)" },
          alignItems: "stretch",
        }}
      >
        {/* Free */}
        {freePlan && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "#F8FAFC",
              border: `1px solid ${LINE}`,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: INK }}>Free</Typography>
                {effective === "free" && <Chip size="small" label="Current" />}
              </Stack>
              <Typography variant="body2" sx={{ color: MUTED }}>
                {PLAN_TAGLINES.free}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "2rem", color: INK, lineHeight: 1.1 }}>$0</Typography>
              <Typography variant="body2" sx={{ color: MUTED }}>
                {formatLimit(freePlan.limits?.staff, "staff")}, {formatLimit(freePlan.limits?.schedulers, "schedulers")}
              </Typography>
            </Box>
            <FeatureList items={FREE_FEATURES} dense />
          </Paper>
        )}

        {/* Starter / Growth / Premium */}
        {paidPlans.map((plan) => {
          const isCurrent = plan.key === effective;
          const popular = plan.key === POPULAR_PLAN;
          const monthly = plan.prices?.month;
          const yearly = plan.prices?.year;
          const shown = interval === "year" ? yearly : monthly;
          const savings = monthly && yearly ? monthly * 12 - yearly : 0;
          return (
            <Paper
              key={plan.key}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: popular ? "2px solid" : `1px solid ${LINE}`,
                borderColor: popular ? "primary.main" : LINE,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                position: "relative",
              }}
            >
              {popular && (
                <Chip
                  label="Most popular"
                  color="primary"
                  size="small"
                  sx={{ position: "absolute", top: -12, left: 20, fontWeight: 700 }}
                />
              )}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: INK }}>{plan.label}</Typography>
                  {isCurrent && <Chip size="small" label={onTrial ? "Trial" : "Current"} />}
                </Stack>
                <Typography variant="body2" sx={{ color: MUTED }}>
                  {PLAN_TAGLINES[plan.key]}
                </Typography>
              </Box>

              <Box>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "baseline" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "2rem", color: INK, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(shown)}
                  </Typography>
                  <Typography sx={{ color: MUTED }}>/{interval === "year" ? "year" : "month"}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: MUTED, minHeight: 20 }}>
                  {interval === "year"
                    ? `${formatMoney(Math.round(yearly / 12))}/mo billed yearly, save ${formatMoney(savings)}`
                    : `or ${formatMoney(yearly)}/year`}
                </Typography>
              </Box>

              <Stack spacing={0.5}>
                {[
                  formatLimit(plan.limits?.staff, "active staff"),
                  formatLimit(plan.limits?.schedulers, "schedulers"),
                  SUPPORT_LABELS[plan.support] || "Standard support",
                ].map((line) => (
                  <Typography key={line} sx={{ fontWeight: 600, color: INK, fontSize: "0.95rem" }}>
                    {line}
                  </Typography>
                ))}
              </Stack>

              <Box sx={{ flex: 1 }} />

              {canManage && plan.purchasable && !(isCurrent && isPaying) && plan.fitsUsage === false && (
                <Alert severity="warning" sx={{ py: 0.25, "& .MuiAlert-message": { fontSize: 13 } }}>
                  You have more than {plan.label} allows:{" "}
                  {[
                    plan.over?.schedulers ? `${plan.over.schedulers} too many scheduler${plan.over.schedulers === 1 ? "" : "s"}` : null,
                    plan.over?.staff ? `${plan.over.staff} too many staff` : null,
                  ]
                    .filter(Boolean)
                    .join(" and ")}
                  .{" "}
                  {plan.over?.schedulers ? (
                    <Box component="span" role="link" tabIndex={0} onClick={() => navigate("/members")} sx={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                      Make some viewers
                    </Box>
                  ) : (
                    <Box component="span" role="link" tabIndex={0} onClick={() => navigate("/staffs")} sx={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                      Archive some staff
                    </Box>
                  )}{" "}
                  or pick a bigger plan.
                </Alert>
              )}
              {canManage && plan.purchasable && !(isCurrent && isPaying) && (
                <Button
                  variant={popular ? "contained" : "outlined"}
                  onClick={() => choosePlan(plan.key)}
                  disabled={Boolean(busy) || plan.fitsUsage === false}
                  sx={{ textTransform: "none", fontWeight: 700, py: 1 }}
                >
                  {ctaLabel(plan)}
                </Button>
              )}
              {!isPaying && trialDays > 0 && (
                <Typography variant="caption" sx={{ color: MUTED, textAlign: "center", mt: -1 }}>
                  Card needed. Cancel before day {trialDays} and you won't be charged.
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* What every paid plan includes */}
      <Paper
        elevation={0}
        sx={{ mt: 2, p: { xs: 2, md: 3 }, borderRadius: 3, border: `1px solid ${LINE}` }}
      >
        <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>
          Starter, Growth and Premium all include
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          }}
        >
          {PAID_FEATURES.map((feature) => (
            <FeatureList key={feature} items={[feature]} />
          ))}
        </Box>
      </Paper>

      {/* Enterprise */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          bgcolor: "#111827",
          color: "#fff",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          alignItems: { md: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>Enterprise</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", mb: 1.5 }}>
            Custom pricing on an annual package.
          </Typography>
          <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, auto)" }, columnGap: 4 }}>
            {ENTERPRISE_FEATURES.map((feature) => (
              <Stack key={feature} direction="row" spacing={1}>
                <CheckRoundedIcon sx={{ fontSize: 18, mt: "2px", color: "#93C5FD" }} />
                <Typography variant="body2">{feature}</Typography>
              </Stack>
            ))}
          </Box>
        </Box>
        <Button
          variant="contained"
          href="/contact"
          sx={{ bgcolor: "#fff !important", color: "#111827", textTransform: "none", fontWeight: 700, flexShrink: 0, "&:hover": { bgcolor: "#E5E7EB !important" } }}
        >
          Talk to us
        </Button>
      </Paper>

      {!canManage && (
        <Typography sx={{ color: MUTED, mt: 3 }}>Only the workspace owner can change the plan.</Typography>
      )}
    </Container>
  );
}
