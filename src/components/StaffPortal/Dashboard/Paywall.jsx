import React, { useState } from "react";
import {
  Box,
  Grid,
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
      priceLabel: "$3,000/yr",
      price: 3000,
      seats: 10,
      highlight: false,
    },
    {
      key: "growthYearly",
      name: "Growth",
      priceLabel: "$5,000/yr",
      price: 5000,
      seats: 20,
      highlight: true,
    },
    {
      key: "premiumYearly",
      name: "Premium",
      priceLabel: "$7,000/yr",
      price: 7000,
      seats: 30,
      highlight: false,
    },
  ];

  const monthlyPlans = [
    {
      key: "starterMonthly",
      name: "Starter",
      priceLabel: "$300/mo",
      price: 300,
      seats: 10,
      highlight: false,
    },
    {
      key: "growthMonthly",
      name: "Growth",
      priceLabel: "$500/mo",
      price: 500,
      seats: 20,
      highlight: true,
    },
    {
      key: "premiumMonthly",
      name: "Premium",
      priceLabel: "$700/mo",
      price: 700,
      seats: 30,
      highlight: false,
    },
  ];

  const plans = billingPeriod === "yearly" ? yearlyPlans : monthlyPlans;
  const featureList = [
    "Priority support",
    "Advanced reporting",
    "Automated scheduling tools",
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

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6, pb: 8 }}>
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

      <Grid
        container
        spacing={3}
        rowSpacing={{ xs: 3, md: 3 }}
        columnSpacing={{ xs: 2, md: 3 }}
        justifyContent="center"
      >
        {plans.map((p) => (
          <Grid
            item
            xs={12}
            sm={10}
            md={4}
            key={p.key}
            sx={{ mb: { xs: 2, md: 0 } }}
          >
            <Paper
              sx={{
                p: 3,
                height: { xs: "auto", md: "100%" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                textAlign: "center",
                border: p.highlight
                  ? `2px solid ${theme.palette.primary.main}`
                  : undefined,
                boxShadow: p.highlight
                  ? "0 14px 40px rgba(16,24,40,0.14)"
                  : "0 6px 18px rgba(15,23,42,0.06)",
              }}
            >
              <Box>
                <Chip
                  label={p.name}
                  color={p.highlight ? "primary" : "default"}
                  sx={{ mb: 1 }}
                />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    mt: 1,
                    fontSize: { xs: "1.5rem", md: "1.7rem" },
                    lineHeight: 1.15,
                  }}
                >
                  {p.priceLabel}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mt: 0.5,
                    fontSize: { xs: "0.78rem", md: "0.86rem" },
                    lineHeight: 1.35,
                  }}
                >
                  {billingPeriod === "yearly"
                    ? `Equivalent to $${Math.round(
                        p.price / 12,
                      )}/mo billed yearly`
                    : "Billed monthly, cancel anytime"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mt: 1,
                    fontSize: { xs: "0.8rem", md: "0.9rem" },
                    lineHeight: 1.3,
                  }}
                >
                  {p.seats} seats • Billed{" "}
                  {billingPeriod === "yearly" ? "yearly" : "monthly"}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack
                  spacing={0.9}
                  sx={{ color: "text.secondary", alignItems: "flex-start" }}
                >
                  {featureList.map((feature) => (
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
                      <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
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

                <Button
                  variant={p.highlight ? "contained" : "outlined"}
                  onClick={() => handleChoosePlan(p.key)}
                  startIcon={
                    loadingPlan === p.key ? (
                      <CircularProgress size={18} />
                    ) : null
                  }
                  fullWidth
                >
                  {loadingPlan === p.key
                    ? "Redirecting..."
                    : p.highlight
                      ? "Choose plan"
                      : "Upgrade"}
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
