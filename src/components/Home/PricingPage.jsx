import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const YEARLY_PLANS = [
  {
    name: "Starter",
    billingLabel: "Per facility / year",
    price: "$4,800/yr",
    subPrice: "Equivalent to $400/mo billed annually",
    employeeLimit: "Up to 50 active employees",
    features: [
      "Standard support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 30-day trial",
    featured: true,
    titleSuffix: "Most popular",
  },
  {
    name: "Growth",
    billingLabel: "Per facility / year",
    price: "$7,700/yr",
    subPrice: "Equivalent to $641.67/mo billed annually",
    employeeLimit: "Up to 100 active employees",
    features: [
      "Standard support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 30-day trial",
    featured: false,
  },
  {
    name: "Premium",
    billingLabel: "Per facility / year",
    price: "$9,600/yr",
    subPrice: "Equivalent to $800/mo billed annually",
    employeeLimit: "Up to 150 active employees",
    features: [
      "Priority support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 30-day trial",
    featured: false,
  },
  {
    name: "Enterprise",
    billingLabel: "Custom package",
    price: "Custom Pricing",
    subPrice: "Custom annual package",
    employeeLimit: "150+ active employees",
    features: [
      "Priority support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: null,
    featured: false,
    custom: true,
  },
];

const MONTHLY_PLANS = [
  {
    name: "Starter",
    billingLabel: "Per facility / month",
    price: "$500/mo",
    subPrice: "Billed monthly",
    employeeLimit: "Up to 50 active employees",
    features: [
      "Standard support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 7-day trial",
    featured: true,
    titleSuffix: "Most popular",
  },
  {
    name: "Growth",
    billingLabel: "Per facility / month",
    price: "$800/mo",
    subPrice: "Billed monthly",
    employeeLimit: "Up to 100 active employees",
    features: [
      "Standard support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 7-day trial",
    featured: false,
  },
  {
    name: "Premium",
    billingLabel: "Per facility / month",
    price: "$1,000/mo",
    subPrice: "Billed monthly",
    employeeLimit: "Up to 150 active employees",
    features: [
      "Priority support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: "Includes a free 7-day trial",
    featured: false,
  },
  {
    name: "Enterprise",
    billingLabel: "Custom package",
    price: "Custom Pricing",
    subPrice: "Custom annual package",
    employeeLimit: "150+ active employees",
    features: [
      "Priority support",
      "Automated scheduling",
      "Shift swaps",
      "Time-off management",
      "Internal messaging",
      "Coverage planning",
      "Staff directory",
    ],
    trial: null,
    featured: false,
    custom: true,
  },
];

const PriceCard = ({ plan, isYearly }) => {
  const isCustomPrice = Boolean(plan.custom);

  return (
    <Card
      variant={plan.featured ? "elevation" : "outlined"}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 4,
        border: plan.featured
          ? "1px solid rgba(37,99,235,0.2)"
          : "1px solid rgba(15,23,42,0.08)",
        boxShadow: plan.featured
          ? "0 16px 38px rgba(37,99,235,0.12)"
          : "0 10px 24px rgba(15,23,42,0.04)",
        position: "relative",
        overflow: "visible",
      }}
    >
      {plan.featured && (
        <Chip
          label={plan.titleSuffix || "Most popular"}
          sx={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: 800,
            bgcolor: "primary.main",
            color: "#fff",
          }}
        />
      )}

      <CardContent
        sx={{
          p: { xs: 2.25, md: 2.75 },
          pt: plan.featured ? 3.5 : 2.5,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Stack spacing={1.5} sx={{ height: "100%" }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.1 }}>
              {plan.name} {isYearly ? "Yearly" : "Monthly"}
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              {plan.billingLabel}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: isCustomPrice ? 800 : 900,
                lineHeight: 1.05,
                fontSize: isCustomPrice
                  ? { xs: "1.35rem", md: "1.7rem" }
                  : { xs: "1.8rem", md: "2.1rem" },
                whiteSpace: isCustomPrice ? "nowrap" : "normal",
              }}
            >
              {plan.price}
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                mt: 0.75,
                fontSize: "0.95rem",
                whiteSpace: isCustomPrice ? "nowrap" : "normal",
              }}
            >
              {plan.subPrice}
            </Typography>
          </Box>

          <Typography sx={{ fontWeight: 700 }}>{plan.employeeLimit}</Typography>

          <Divider />

          <Stack spacing={1.2} sx={{ flexGrow: 1 }}>
            {plan.features.map((feature) => (
              <Box key={feature} display="flex" gap={1} alignItems="flex-start">
                <Box sx={{ mt: "2px", color: "primary.main" }}>
                  <FiCheck size={16} />
                </Box>
                <Typography sx={{ color: "text.secondary" }}>
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>

          {plan.trial && (
            <Typography sx={{ color: "text.primary", fontWeight: 700 }}>
              {plan.trial}
            </Typography>
          )}

          <Button
            component={RouterLink}
            to="/signup-tenant"
            variant={plan.featured ? "contained" : "outlined"}
            endIcon={<FiArrowRight />}
            fullWidth
            sx={{
              mt: "auto",
              borderRadius: 999,
              fontWeight: 900,
              textTransform: "none",
              py: 1.1,
            }}
          >
            {plan.custom ? "Talk to sales" : "Start free trial"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("yearly");
  const plans = billingCycle === "yearly" ? YEARLY_PLANS : MONTHLY_PLANS;

  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          py: { xs: 3, md: 5 },
          background:
            "radial-gradient(circle at 10% 10%, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.01) 35%, #fff 76%)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={2}
            sx={{
              mb: 5,
              width: "100%",
              textAlign: "center",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 950,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
              }}
            >
              Simple pricing for healthcare operations
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                maxWidth: 760,
                mx: "auto",
                textAlign: "center",
              }}
            >
              Choose a plan that fits your facility size and staffing
              complexity. Each plan includes the core scheduling tools your team
              needs to run with less friction.
            </Typography>

            <Box
              sx={{
                display: "inline-flex",
                p: 0.5,
                borderRadius: 999,
                bgcolor: "rgba(15, 23, 42, 0.04)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
              }}
            >
              {[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ].map((option) => {
                const isActive = billingCycle === option.value;

                return (
                  <Button
                    key={option.value}
                    onClick={() => setBillingCycle(option.value)}
                    variant={isActive ? "contained" : "text"}
                    sx={{
                      minWidth: 120,
                      borderRadius: 999,
                      fontWeight: 800,
                      textTransform: "none",
                      px: 2.5,
                      py: 1,
                    }}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {plans.map((plan) => (
              <PriceCard
                key={`${plan.name}-${billingCycle}`}
                plan={plan}
                isYearly={billingCycle === "yearly"}
              />
            ))}
          </Box>

          <Typography
            sx={{
              mt: 4,
              textAlign: "center",
              color: "text.secondary",
              fontSize: "0.95rem",
            }}
          >
            One price per facility. Each facility is billed independently.
          </Typography>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
