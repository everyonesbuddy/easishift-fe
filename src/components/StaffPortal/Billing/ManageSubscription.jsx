import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Container,
  Stack,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { toast } from "react-toastify";

export default function ManageSubscription() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));
  const { tenant, refreshTenant } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("yearly");

  if (!tenant) return <Typography>Loading tenant...</Typography>;

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
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Request failed");
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
      await refreshTenant();
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

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 1100 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              display: "flex",
              gap: 3,
              alignItems: "center",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>
                Current subscription
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                }}
              >
                Status:{" "}
                <strong>{tenant.subscriptionStatus || "inactive"}</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                }}
              >
                Plan: <strong>{tenant.planKey || "None"}</strong> • Seats:{" "}
                <strong>{tenant.seatLimit ?? "1"}</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                }}
              >
                Billing: <strong>{tenant.billingEmail || "Not set"}</strong>
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                width: "100%",
                justifyContent: { xs: "stretch", md: "flex-end" },
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <Button
                variant="contained"
                onClick={() => handleCancelSubscription()}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  bgcolor: "#2563EB",
                  color: "#fff",
                  width: { xs: "100%", md: "auto" },
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                {loadingPlan === "cancel"
                  ? "Processing..."
                  : "Cancel subscription"}
              </Button>
            </Box>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Upgrade options
          </Typography>

          <Grid
            container
            spacing={3}
            rowSpacing={{ xs: 3, md: 3 }}
            columnSpacing={{ xs: 2, md: 3 }}
            alignItems="stretch"
            justifyContent="center"
            paddingBottom={5}
          >
            {plans.map((p) => (
              <Grid
                item
                xs={12}
                md={4}
                key={p.key}
                sx={{ mb: { xs: 2, md: 0 } }}
              >
                <Paper
                  sx={{
                    p: { xs: 2, md: 3 },
                    height: { xs: "auto", md: "100%" },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "center",
                    border: p.highlight
                      ? `2px solid ${theme.palette.primary.main}`
                      : undefined,
                    boxShadow: p.highlight
                      ? "0 12px 30px rgba(16,24,40,0.12)"
                      : "0 6px 18px rgba(15,23,42,0.06)",
                  }}
                >
                  <Box>
                    <Chip
                      label={p.name}
                      color={p.highlight ? "primary" : "default"}
                      size={isCompact ? "small" : "medium"}
                      sx={{ mb: 1 }}
                    />
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 900,
                        mt: 1,
                        fontSize: { xs: "1.35rem", md: "1.55rem" },
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
                      spacing={1}
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
                    {tenant.planKey === p.key ? (
                      <Button disabled fullWidth variant="contained">
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        variant={p.highlight ? "contained" : "outlined"}
                        onClick={() => handleChoosePlan(p.key)}
                        startIcon={
                          loadingPlan === p.key ? (
                            <CircularProgress size={16} />
                          ) : null
                        }
                        fullWidth
                        sx={{ mt: 2 }}
                      >
                        {loadingPlan === p.key
                          ? "Redirecting..."
                          : p.highlight
                            ? "Choose plan"
                            : "Upgrade"}
                      </Button>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
}
