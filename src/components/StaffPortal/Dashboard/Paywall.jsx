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
} from "@mui/material";
import api from "../../../config/api";

// Modern paywall page used during initial activation
export default function Paywall({ tenant }) {
  const theme = useTheme();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  if (!tenant) return null;

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
    {
      key: "test",
      name: "Test",
      priceLabel: "$2/yr",
      seats: 12,
      highlight: false,
    },
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
      console.error("Failed to create checkout session:", err);
      setError(err?.response?.data?.message || err.message || "Request failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Activate your clinic
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          Select a plan to unlock staff seats and activate your subscription.
        </Typography>
      </Box>

      <Grid container spacing={3} justifyContent="center">
        {plans.map((p) => (
          <Grid item xs={12} sm={10} md={4} key={p.key}>
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
                <Typography variant="h4" sx={{ fontWeight: 900, mt: 1 }}>
                  {p.priceLabel}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 1 }}
                >
                  {p.seats} seats • Billed yearly
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={0.75} sx={{ color: "text.secondary" }}>
                  <Typography>Easy setup</Typography>
                  <Typography>Priority email support</Typography>
                  <Typography>Seat management</Typography>
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
