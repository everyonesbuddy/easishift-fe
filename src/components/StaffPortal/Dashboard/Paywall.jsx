import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Container,
  Chip,
  Divider,
  Stack,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import api from "../../../config/api";
import useBillingPlans from "../../../hooks/useBillingPlans";
import {
  SHARED_FEATURE_LIST,
  ENTERPRISE_PLAN,
  getSupportLabel,
  getCapacityLabel,
  decoratePlan,
} from "../../../config/billingPlans";

// Modern paywall page used during initial activation
export default function Paywall({ tenant }) {
  const theme = useTheme();
  const { data, loading, error: plansError, refetch } = useBillingPlans();
  const [interval, setInterval] = useState("year");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  if (!tenant) return null;

  const plans = useMemo(() => {
    const rawPlans = Array.isArray(data?.plans) ? data.plans : [];
    const filtered = rawPlans
      .filter((plan) => plan.interval === interval)
      .map(decoratePlan);
    return [...filtered, ENTERPRISE_PLAN];
  }, [data, interval]);

  const currentPlanKey = data?.currentPlanKey ?? null;

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
      console.error("Failed to create checkout session:", err);
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
      await refetch();
    } catch (err) {
      const responseData = err?.response?.data;
      if (responseData?.errorCode === "NO_ACTIVE_SUBSCRIPTION") {
        await handleChoosePlan(planKey);
        return;
      }
      console.error("Failed to change plan:", err);
      setError(responseData?.message || err.message || "Request failed");
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
    if (loadingPlan === plan.planKey) return "Redirecting...";
    if (plan.isEnterprise) return "Get quote";
    if (currentPlanKey) return "Change plan";
    return plan.trialPeriodDays > 0 ? "Start trial" : "Subscribe";
  };

  const getTrialNote = (plan) => {
    if (plan.isEnterprise) return null;
    return plan.trialPeriodDays > 0
      ? `Includes a free ${plan.trialPeriodDays}-day trial`
      : "You've already used your free trial — you'll be charged today";
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6, pb: 8, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Activate your clinic
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          Select a plan to unlock staff seats and activate your subscription.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <ToggleButtonGroup
          value={interval}
          exclusive
          onChange={(e, next) => next && setInterval(next)}
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
      </Box>

      {plansError && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 640, mx: "auto" }}>
          {plansError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
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
            pb: { xs: 1.5, md: 2 },
          }}
        >
          {plans.map((p) => {
            const isCurrent = currentPlanKey && currentPlanKey === p.planKey;
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
                      ? "0 14px 40px rgba(16,24,40,0.14)"
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
                      variant="h4"
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
                      {p.isEnterprise ? "Custom annual package" : p.cadenceNote}
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
                      sx={{ color: "text.secondary", alignItems: "flex-start" }}
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
                    {error && loadingPlan === null && (
                      <Typography
                        color="error"
                        variant="caption"
                        sx={{ display: "block", mb: 1 }}
                      >
                        {error}
                      </Typography>
                    )}

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
                      variant={
                        isCurrent
                          ? "outlined"
                          : p.highlight
                            ? "contained"
                            : "outlined"
                      }
                      disabled={
                        isCurrent ||
                        (!p.isEnterprise && p.seatsOverLimit > 0) ||
                        loadingPlan === p.planKey
                      }
                      onClick={getPlanAction(p)}
                      startIcon={
                        loadingPlan === p.planKey ? (
                          <CircularProgress size={18} />
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
                      {isCurrent ? "Current plan" : getButtonLabel(p)}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: { xs: 4, md: 5 },
          px: { xs: 1, sm: 2 },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            color: "text.secondary",
            lineHeight: 1.5,
          }}
        >
          One price per facility. Each facility is billed independently.
        </Typography>
      </Box>
    </Container>
  );
}
