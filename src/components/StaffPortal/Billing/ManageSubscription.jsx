import React, { useState } from "react";
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
} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { toast } from "react-toastify";

export default function ManageSubscription() {
  const theme = useTheme();
  const { tenant, refreshTenant } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  if (!tenant) return <Typography>Loading tenant...</Typography>;

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

  const plans = yearlyPlans;
  const sharedFeatureList = [
    "Automated scheduling",
    "Shift swaps",
    "Time-off management",
    "Internal messaging",
    "Coverage planning",
    "Staff directory",
  ];

  const getPlanDisplayName = (planKey) => {
    const displayMap = {
      starterYearly: "Starter Annual",
      growthYearly: "Growth Annual",
      premiumYearly: "Premium Annual",
      enterpriseYearly: "Enterprise Annual",
    };

    if (!planKey) return "No plan";
    return displayMap[planKey] || planKey;
  };

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

  const handleGetQuote = () => {
    window.open(
      "https://calendly.com/wisershifts-info/30min",
      "_blank",
      "noopener,noreferrer",
    );
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
                    label={tenant.subscriptionStatus || "Inactive"}
                    color={
                      (tenant.subscriptionStatus || "inactive") === "active"
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
                      {getPlanDisplayName(tenant.planKey)}
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
                      {tenant.seatLimit ?? "1"}
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

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Upgrade options
          </Typography>

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
                      ? "0 12px 30px rgba(16,24,40,0.12)"
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
                          Per facility / year
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
                      variant="h5"
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
                        ? "Custom annual package"
                        : `Equivalent to $${Math.round(p.price / 12)}/mo billed annually`}
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
                      {[getSupportLabel(p), ...sharedFeatureList].map(
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
                    {tenant.planKey === p.key ? (
                      <Button disabled fullWidth variant="contained">
                        Current plan
                      </Button>
                    ) : (
                      <>
                        {!p.isEnterprise && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              mb: 1,
                              color: "text.secondary",
                            }}
                          >
                            Includes a free 1-month trial
                          </Typography>
                        )}
                        <Button
                          variant={p.highlight ? "contained" : "outlined"}
                          onClick={() =>
                            p.isEnterprise
                              ? handleGetQuote()
                              : handleChoosePlan(p.key)
                          }
                          startIcon={
                            loadingPlan === p.key ? (
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
                          {loadingPlan === p.key
                            ? "Redirecting..."
                            : p.isEnterprise
                              ? "Get quote"
                              : "Start trial"}
                        </Button>
                      </>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>

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
