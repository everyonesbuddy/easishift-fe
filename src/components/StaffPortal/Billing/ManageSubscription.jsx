import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Container,
  Stack,
  Divider,
  Chip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { toast } from "react-toastify";
import useBillingPlans from "../../../hooks/useBillingPlans";
import {
  SHARED_FEATURE_LIST,
  ENTERPRISE_PLAN,
  getSupportLabel,
  getCapacityLabel,
  decoratePlan,
} from "../../../config/billingPlans";

export default function ManageSubscription() {
  const theme = useTheme();
  const { tenant, refreshTenant } = useAuth();
  const {
    data,
    loading: plansLoading,
    error: plansError,
    refetch,
  } = useBillingPlans();
  const [billingInterval, setBillingInterval] = useState("year");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const currentPlanKey = data?.currentPlanKey ?? null;

  const plans = useMemo(() => {
    const rawPlans = Array.isArray(data?.plans) ? data.plans : [];
    const filtered = rawPlans
      .filter((plan) => plan.interval === billingInterval)
      .map(decoratePlan);
    return [...filtered, ENTERPRISE_PLAN];
  }, [data, billingInterval]);

  const currentPlanName =
    data?.plans?.find((plan) => plan.planKey === currentPlanKey)?.name ||
    "No plan";

  if (!tenant) return <Typography>Loading tenant...</Typography>;

  const handleChoosePlan = async (planKey) => {
    setError(null);
    setLoadingPlan(planKey);
    try {
      const res = await api.post("/stripe/create-checkout-session", {
        tenantId: tenant._id,
        planKey,
      });

      const { url } = res.data;
      if (url) window.location.href = url;
      else setError("Missing checkout URL from server");
    } catch (err) {
      const responseData = err?.response?.data;
      if (responseData?.errorCode === "SUBSCRIPTION_ALREADY_ACTIVE") {
        await refetch();
      }
      console.error(err);
      setError(responseData?.message || err.message || "Request failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleChangePlan = async (planKey) => {
    setError(null);
    setLoadingPlan(planKey);
    try {
      await api.post("/stripe/change-plan", { planKey });
      await Promise.all([refetch(), refreshTenant()]);
      toast.success("Plan updated successfully.", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      const responseData = err?.response?.data;
      if (responseData?.errorCode === "NO_ACTIVE_SUBSCRIPTION") {
        await handleChoosePlan(planKey);
        return;
      }
      console.error("Failed to change plan", err);
      setError(responseData?.message || err.message || "Request failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelSubscription = async (opts = { atPeriodEnd: true }) => {
    setError(null);
    const ok = window.confirm(
      opts.atPeriodEnd
        ? "Cancel subscription at period end? Your users will keep access until the billing period ends."
        : "Cancel subscription immediately? This will stop access now.",
    );
    if (!ok) return;

    try {
      setLoadingPlan("cancel");
      await api.post("/stripe/cancel-subscription", {
        tenantId: tenant._id,
        atPeriodEnd: !!opts.atPeriodEnd,
      });
      await Promise.all([refreshTenant(), refetch()]);
      toast.success(
        "Subscription cancellation requested. Changes may take a moment to appear.",
        { position: "top-right", autoClose: 3000 },
      );
    } catch (err) {
      console.error("Failed to cancel subscription", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel subscription",
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleGetQuote = () => {
    window.open(
      "https://calendly.com/wisershifts-info/30min",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const getPlanAction = (plan) => {
    if (plan.isEnterprise) return handleGetQuote;
    if (currentPlanKey) return () => handleChangePlan(plan.planKey);
    return () => handleChoosePlan(plan.planKey);
  };

  const getButtonLabel = (plan) => {
    if (loadingPlan === plan.planKey) return "Processing...";
    if (plan.isEnterprise) return "Get quote";
    if (currentPlanKey) return "Change plan";
    return plan.trialPeriodDays > 0 ? "Start trial" : "Subscribe";
  };

  const getTrialNote = (plan) => {
    if (plan.isEnterprise) return null;
    return plan.trialPeriodDays > 0
      ? `Includes a free ${plan.trialPeriodDays}-day trial`
      : "You've already used your free trial, you'll be charged today";
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Manage subscription
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          View your current plan, billing details, and upgrade options.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 1100 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              borderRadius: 4,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background:
                "linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(255,255,255,1) 100%)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "flex-start" }}
            >
              <Box sx={{ flex: 1 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{ mb: 1.5 }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>
                    Current subscription
                  </Typography>
                  <Chip
                    label={
                      data?.subscriptionStatus ||
                      tenant.subscriptionStatus ||
                      "Inactive"
                    }
                    color={
                      (data?.subscriptionStatus ||
                        tenant.subscriptionStatus ||
                        "inactive") === "active"
                        ? "success"
                        : "default"
                    }
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mb: 1.5,
                    fontSize: { xs: "0.85rem", md: "0.95rem" },
                  }}
                >
                  Your active plan, seats, and billing contact are shown here.
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.25,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Plan
                    </Typography>
                    <Typography sx={{ fontWeight: 800, mt: 0.3 }}>
                      {currentPlanName}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Seats
                    </Typography>
                    <Typography sx={{ fontWeight: 800, mt: 0.3 }}>
                      {data
                        ? `${data.seatsInUse} / ${data.seatLimit ?? "—"}`
                        : (tenant.seatLimit ?? "1")}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Billing
                    </Typography>
                    <Typography sx={{ fontWeight: 800, mt: 0.3 }}>
                      {tenant.billingEmail || "Not set"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button
                variant="contained"
                color="error"
                onClick={() => handleCancelSubscription()}
                disabled={!currentPlanKey}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  minWidth: { xs: "100%", md: 220 },
                  alignSelf: { xs: "stretch", md: "flex-start" },
                  fontWeight: 700,
                }}
              >
                {loadingPlan === "cancel"
                  ? "Processing..."
                  : "Cancel subscription"}
              </Button>
            </Stack>
          </Paper>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Upgrade options
            </Typography>
            <ToggleButtonGroup
              value={billingInterval}
              exclusive
              onChange={(e, next) => next && setBillingInterval(next)}
              size="small"
            >
              <ToggleButton
                value="year"
                sx={{ textTransform: "none", fontWeight: 700, px: 2.5 }}
              >
                Yearly
              </ToggleButton>
              <ToggleButton
                value="month"
                sx={{ textTransform: "none", fontWeight: 700, px: 2.5 }}
              >
                Monthly
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {plansError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plansError}
            </Alert>
          )}

          {plansLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "repeat(2, minmax(0, 280px))",
                  xl: "repeat(4, minmax(0, 250px))",
                },
                justifyContent: "center",
                rowGap: { xs: 3.25, sm: 3.75, md: 4, lg: 4.25 },
                columnGap: { xs: 0, lg: 3.25, xl: 3.5 },
                px: { xs: 1.25, sm: 1.75, md: 2, lg: 0.75, xl: 0 },
                pb: 5,
              }}
            >
              {plans.map((p) => {
                const isCurrent =
                  currentPlanKey && currentPlanKey === p.planKey;
                const trialNote = getTrialNote(p);

                return (
                  <Box
                    key={p.planKey}
                    sx={{
                      width: "100%",
                      maxWidth: { xs: 340, sm: 360, md: 380, lg: "none" },
                      mx: "auto",
                    }}
                  >
                    <Paper
                      sx={{
                        p: { xs: 1.75, sm: 2.25, md: 3 },
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        textAlign: "left",
                        borderRadius: 4,
                        border: p.highlight
                          ? `2px solid ${theme.palette.primary.main}`
                          : "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: p.highlight
                          ? "0 12px 30px rgba(16,24,40,0.12)"
                          : "0 6px 18px rgba(15,23,42,0.06)",
                      }}
                    >
                      <Box>
                        {p.highlight && (
                          <Chip
                            label="Most popular"
                            color="primary"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              height: 20,
                              mb: 1,
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        )}
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 900,
                            lineHeight: 1.15,
                            fontSize: { xs: "1.05rem", md: "1.1rem" },
                          }}
                        >
                          {p.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            mt: 0.35,
                            mb: 1.5,
                            fontSize: { xs: "0.76rem", md: "0.78rem" },
                          }}
                        >
                          {p.isEnterprise
                            ? "Custom package"
                            : `Per facility / ${p.interval === "month" ? "month" : "year"}`}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 900,
                            mt: 0.75,
                            fontSize: { xs: "1.28rem", md: "1.4rem" },
                            lineHeight: 1.15,
                          }}
                        >
                          {p.isEnterprise ? "Custom pricing" : p.priceLabel}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            mt: 0.75,
                            fontSize: { xs: "0.76rem", md: "0.8rem" },
                            lineHeight: 1.3,
                          }}
                        >
                          {p.isEnterprise
                            ? "Custom annual package"
                            : p.cadenceNote}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.primary",
                            mt: 2,
                            fontSize: { xs: "0.9rem", md: "0.92rem" },
                            lineHeight: 1.3,
                            fontWeight: 700,
                          }}
                        >
                          {getCapacityLabel(p)}
                        </Typography>

                        {!p.isEnterprise && p.seatsOverLimit > 0 && (
                          <Chip
                            label={`Requires removing ${p.seatsOverLimit} staff`}
                            color="warning"
                            size="small"
                            sx={{ mt: 1, fontWeight: 700 }}
                          />
                        )}

                        <Divider sx={{ my: 1.5 }} />
                        <Stack
                          spacing={0.8}
                          sx={{
                            color: "text.secondary",
                            alignItems: "flex-start",
                          }}
                        >
                          {[getSupportLabel(p), ...SHARED_FEATURE_LIST].map(
                            (feature) => (
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                key={feature}
                                sx={{ justifyContent: "flex-start" }}
                              >
                                <CheckCircleRoundedIcon
                                  fontSize="small"
                                  sx={{ color: theme.palette.primary.main }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    lineHeight: 1.3,
                                    color: "text.primary",
                                    fontSize: { xs: "0.82rem", md: "0.84rem" },
                                  }}
                                >
                                  {feature}
                                </Typography>
                              </Stack>
                            ),
                          )}
                        </Stack>
                      </Box>

                      <Box>
                        {isCurrent ? (
                          <Button disabled fullWidth variant="contained">
                            Current plan
                          </Button>
                        ) : (
                          <>
                            {trialNote && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mb: 1,
                                  color: "text.secondary",
                                }}
                              >
                                {trialNote}
                              </Typography>
                            )}
                            <Button
                              variant={p.highlight ? "contained" : "outlined"}
                              disabled={
                                (!p.isEnterprise && p.seatsOverLimit > 0) ||
                                loadingPlan === p.planKey
                              }
                              onClick={getPlanAction(p)}
                              startIcon={
                                loadingPlan === p.planKey ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <ArrowOutwardRoundedIcon fontSize="small" />
                                )
                              }
                              fullWidth
                              sx={{
                                mt: 0.5,
                                py: 1,
                                textTransform: "none",
                                fontWeight: 800,
                                fontSize: { xs: "0.9rem", md: "0.92rem" },
                              }}
                            >
                              {getButtonLabel(p)}
                            </Button>
                          </>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: "text.secondary",
              mt: 3.5,
              px: 2,
              lineHeight: 1.5,
            }}
          >
            One price per facility. Each facility is billed independently.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
