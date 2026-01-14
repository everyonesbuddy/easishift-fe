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
  useTheme,
} from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";

export default function ManageSubscription() {
  const theme = useTheme();
  const { tenant, refreshTenant } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  if (!tenant) return <Typography>Loading tenant...</Typography>;

  const plans = [
    {
      key: "starter",
      name: "Starter",
      priceLabel: "$3,000/yr",
      seats: 10,
      highlight: false,
    },
    {
      key: "growth",
      name: "Growth",
      priceLabel: "$5,000/yr",
      seats: 20,
      highlight: true,
    },
    {
      key: "premium",
      name: "Premium",
      priceLabel: "$7,000/yr",
      seats: 30,
      highlight: false,
    },
    // {
    //   key: "test",
    //   name: "Test",
    //   priceLabel: "$2.00/yr",
    //   seats: 12,
    //   desc: "12 seats — yearly",
    // },
  ];

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
    // simple confirmation
    const ok = window.confirm(
      opts.atPeriodEnd
        ? "Cancel subscription at period end? Your users will keep access until the billing period ends."
        : "Cancel subscription immediately? This will stop access now."
    );
    if (!ok) return;

    try {
      setLoadingPlan("cancel");
      const res = await api.post("/stripe/cancel-subscription", {
        tenantId: tenant._id,
        atPeriodEnd: !!opts.atPeriodEnd,
      });

      // Refresh tenant state (webhook may still update later)
      await refreshTenant();

      // show success message briefly
      alert(
        "Subscription cancellation requested. Changes may take a moment to appear."
      );
    } catch (err) {
      console.error("Failed to cancel subscription", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel subscription"
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
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
            sx={{ p: 3, mb: 3, display: "flex", gap: 3, alignItems: "center" }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>
                Current subscription
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 0.5 }}
              >
                Status:{" "}
                <strong>{tenant.subscriptionStatus || "inactive"}</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 0.5 }}
              >
                Plan: <strong>{tenant.planKey || "None"}</strong> • Seats:{" "}
                <strong>{tenant.seatLimit ?? "1"}</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Billing: <strong>{tenant.billingEmail || "Not set"}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="outlined" onClick={refreshTenant}>
                Refresh
              </Button>
              <Button
                variant="contained"
                onClick={() => handleCancelSubscription()}
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

          <Grid container spacing={3} alignItems="stretch">
            {plans.map((p) => (
              <Grid item xs={12} md={4} key={p.key}>
                <Paper
                  sx={{
                    p: 3,
                    height: "100%",
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
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 1 }}>
                      {p.priceLabel}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", mt: 1 }}
                    >
                      {p.seats} seats • Billed yearly
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1} sx={{ color: "text.secondary" }}>
                      <Typography>Priority support</Typography>
                      <Typography>Advanced reporting</Typography>
                      <Typography>Automated scheduling tools</Typography>
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
