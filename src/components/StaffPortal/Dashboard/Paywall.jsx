import React, { useState } from "react";
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
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import api from "../../../config/api";

// Modern paywall page used during initial activation
export default function Paywall({ tenant }) {
  const theme = useTheme();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("yearly");

  if (!tenant) return null;

  const yearlyPlans = [
    {
      key: "starterYearly",
      name: "Starter",
      priceLabel: "$4,000/yr",
      price: 4000,
      seats: 50,
      supportTier: "standard",
      highlight: false,
    },
    {
      key: "growthYearly",
      name: "Growth",
      priceLabel: "$7,000/yr",
      price: 7000,
      seats: 100,
      supportTier: "standard",
      highlight: true,
    },
    {
      key: "premiumYearly",
      name: "Premium",
      priceLabel: "$9,000/yr",
      price: 9000,
      seats: 150,
      supportTier: "priority",
      highlight: false,
    },
    {
      key: "enterpriseYearly",
      name: "Enterprise",
      priceLabel: "Custom pricing",
      price: null,
      seats: "150+",
      supportTier: "priority",
      highlight: false,
      isEnterprise: true,
    },
  ];

  const monthlyPlans = [
    {
      key: "starterMonthly",
      name: "Starter",
      priceLabel: "$400/mo",
      price: 400,
      seats: 50,
      supportTier: "standard",
      highlight: false,
    },
    {
      key: "growthMonthly",
      name: "Growth",
      priceLabel: "$700/mo",
      price: 700,
      seats: 100,
      supportTier: "standard",
      highlight: true,
    },
    {
      key: "premiumMonthly",
      name: "Premium",
      priceLabel: "$900/mo",
      price: 900,
      seats: 150,
      supportTier: "priority",
      highlight: false,
    },
    {
      key: "enterpriseMonthly",
      name: "Enterprise",
      priceLabel: "Custom pricing",
      price: null,
      seats: "150+",
      supportTier: "priority",
      highlight: false,
      isEnterprise: true,
    },
  ];

  const plans = billingPeriod === "yearly" ? yearlyPlans : monthlyPlans;
  const sharedFeatureList = [
    "Automated scheduling",
    "Shift swaps",
    "Time-off management",
    "Internal messaging",
    "Coverage planning",
    "Staff directory",
  ];

  const getYearlySavingsPercent = () => {
    const sampleMonthly = monthlyPlans[0]?.price;
    const sampleYearly = yearlyPlans[0]?.price;
    if (!sampleMonthly || !sampleYearly) return null;
    const monthlyTotal = sampleMonthly * 12;
    const savingsPercent = Math.round(
      ((monthlyTotal - sampleYearly) / monthlyTotal) * 100,
    );
    return Number.isFinite(savingsPercent) ? savingsPercent : null;
  };

  const yearlySavingsPercent = getYearlySavingsPercent();
  const getCapacityLabel = (plan) =>
    plan.isEnterprise
      ? `${plan.seats} active employees`
      : `Up to ${plan.seats} active employees`;
  const getSupportLabel = (plan) =>
    plan.supportTier === "priority" ? "Priority support" : "Standard support";

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
      console.error("Failed to create checkout session:", err);
      setError(err?.response?.data?.message || err.message || "Request failed");
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

  const handleContactUs = () => {
    window.open(
      "https://calendly.com/wisershifts-info/30min",
      "_blank",
      "noopener,noreferrer",
    );
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

      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <ToggleButtonGroup
          value={billingPeriod}
          exclusive
          onChange={(e, newPeriod) => {
            if (newPeriod !== null) setBillingPeriod(newPeriod);
          }}
          sx={{
            p: 0.5,
            borderRadius: 999,
            backgroundColor: "rgba(15, 23, 42, 0.06)",
            boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
            gap: 0.5,
            "& .MuiToggleButtonGroup-grouped": {
              border: 0,
              borderRadius: 999,
              px: 3,
              py: 0.8,
              textTransform: "none",
              fontWeight: 700,
              color: "text.secondary",
            },
            "& .MuiToggleButtonGroup-grouped.Mui-selected": {
              backgroundColor: "#fff",
              color: "text.primary",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
            },
            "& .MuiToggleButtonGroup-grouped.Mui-selected:hover": {
              backgroundColor: "#fff",
            },
          }}
        >
          <ToggleButton value="yearly">Yearly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <Chip
          label={
            billingPeriod === "yearly" && yearlySavingsPercent
              ? `Yearly saves ${yearlySavingsPercent}% compared to monthly`
              : "Monthly offers flexibility with no long-term commitment"
          }
          color={billingPeriod === "yearly" ? "primary" : "default"}
          variant={billingPeriod === "yearly" ? "filled" : "outlined"}
          sx={{ fontWeight: 700 }}
        />
      </Box>

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
        {plans.map((p) => (
          <Box
            key={p.key}
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
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                  sx={{ mb: 1.5 }}
                >
                  <Box>
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
                        fontSize: { xs: "0.76rem", md: "0.78rem" },
                      }}
                    >
                      Per facility /{" "}
                      {billingPeriod === "yearly" ? "year" : "month"}
                    </Typography>
                  </Box>

                  {p.highlight && (
                    <Chip
                      label="Most popular"
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 800, height: 26 }}
                    />
                  )}
                </Stack>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    mt: 0.75,
                    fontSize: { xs: "1.28rem", md: "1.4rem" },
                    lineHeight: 1.15,
                  }}
                >
                  {p.priceLabel}
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
                    ? "Talk to sales for a custom package"
                    : billingPeriod === "yearly"
                      ? `Equivalent to $${Math.round(
                          p.price / 12,
                        )}/mo billed yearly`
                      : "Billed monthly, cancel anytime"}
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

                <Divider sx={{ my: 1.5 }} />

                <Stack
                  spacing={0.8}
                  sx={{ color: "text.secondary", alignItems: "flex-start" }}
                >
                  {[getSupportLabel(p), ...sharedFeatureList].map((feature) => (
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
                  ))}
                </Stack>
              </Box>

              <Box>
                {error && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ display: "block", mb: 1 }}
                  >
                    {error}
                  </Typography>
                )}

                {!p.isEnterprise && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mb: 1, color: "text.secondary" }}
                  >
                    Includes a free 1-month trial
                  </Typography>
                )}

                <Button
                  variant={p.highlight ? "contained" : "outlined"}
                  onClick={() =>
                    p.isEnterprise ? handleGetQuote() : handleChoosePlan(p.key)
                  }
                  startIcon={
                    loadingPlan === p.key ? (
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
                  {loadingPlan === p.key
                    ? "Redirecting..."
                    : p.isEnterprise
                      ? "Get quote"
                      : "Start trial"}
                </Button>
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 6, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 1100,
            overflow: "hidden",
            borderRadius: 6,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(246,248,252,1) 100%)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2.5, sm: 3, md: 4 },
              pt: { xs: 2.5, sm: 3, md: 4 },
              pb: { xs: 2, sm: 2.5, md: 3 },
              borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
              background:
                "radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 40%)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box sx={{ maxWidth: 620 }}>
                <Chip
                  label="Recommended"
                  color="primary"
                  sx={{ mb: 1.5, fontWeight: 800 }}
                />
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontSize: { xs: "1.45rem", sm: "1.75rem", md: "2rem" },
                  }}
                >
                  Guided Implementation
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mt: 1,
                    color: "text.secondary",
                    lineHeight: 1.65,
                    maxWidth: 560,
                  }}
                >
                  A hands-on launch package for teams that want a smoother
                  rollout with direct support from day one.
                </Typography>
              </Box>

              <Box
                sx={{
                  minWidth: { md: 260 },
                  textAlign: { xs: "left", md: "right" },
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    letterSpacing: "0.18em",
                    lineHeight: 1,
                    mb: 0.75,
                  }}
                >
                  Starting at
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontSize: { xs: "1.75rem", sm: "2rem", md: "2.35rem" },
                  }}
                >
                  $2,500
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 0.5 }}
                >
                  per location
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              px: { xs: 2.5, sm: 3, md: 4 },
              py: { xs: 2.5, sm: 3, md: 4 },
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
                gap: { xs: 2.5, md: 4 },
                alignItems: "start",
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: "0.72rem",
                    mb: 1.5,
                  }}
                >
                  Includes
                </Typography>

                <Stack spacing={1.25}>
                  {[
                    "Employee import",
                    "Schedule configuration",
                    "Manager training",
                    "Go-live support",
                  ].map((item) => (
                    <Box
                      key={item}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        py: 1.15,
                        px: 1.5,
                        borderRadius: 3,
                        backgroundColor: "rgba(15, 23, 42, 0.03)",
                      }}
                    >
                      <CheckCircleRoundedIcon
                        fontSize="small"
                        sx={{
                          color: theme.palette.primary.main,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box
                sx={{
                  borderRadius: 4,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(12px)",
                  p: { xs: 2, sm: 2.5, md: 3 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  Self-serve setup is always available at no additional cost.
                  Many teams choose to get started on their own and add
                  implementation later if needed.
                </Typography>

                <Button
                  variant="contained"
                  onClick={handleContactUs}
                  startIcon={<ArrowOutwardRoundedIcon fontSize="small" />}
                  fullWidth
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: 999,
                    py: 1.15,
                    boxShadow: "0 14px 30px rgba(37, 99, 235, 0.22)",
                  }}
                >
                  Contact us
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

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
