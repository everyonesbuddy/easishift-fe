import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { FiArrowRight, FiDollarSign, FiTrendingUp } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const CALCULATORS = [
  {
    title: "Turnover ROI Calculator",
    description:
      "Estimate annual turnover burden and projected Easishift savings based on headcount, wage, turnover, and vacancy timeline.",
    cta: "Open Turnover ROI",
    to: "/turnover-roi-calculator",
    icon: <FiTrendingUp size={18} />,
    tag: "Retention & ROI",
  },
  {
    title: "Cost Leak Calculator (Estimator)",
    description:
      "Estimate annual labor cost leakage across overtime, temporary labor premium, scheduling effort, and coverage inefficiency.",
    cta: "Open Cost Leak Estimator",
    to: "/cost-leak-calculator",
    icon: <FiDollarSign size={18} />,
    tag: "Labor Cost",
  },
];

export default function Calculators() {
  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          py: { xs: 3, md: 5 },
          background:
            "radial-gradient(circle at 10% 10%, rgba(25,118,210,0.08) 0%, rgba(25,118,210,0.01) 35%, #fff 75%)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 3, textAlign: { xs: "left", md: "center" } }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 950,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Workforce Calculators
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 1 }}>
              Explore practical estimators to quantify labor impact and
              potential savings with Easishift.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {CALCULATORS.map((calculator) => (
              <Card
                key={calculator.title}
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
                  height: "100%",
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, md: 2.5 } }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "rgba(25,118,210,0.1)",
                          color: "primary.main",
                        }}
                      >
                        {calculator.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {calculator.title}
                      </Typography>
                    </Stack>
                    <Chip label={calculator.tag} size="small" />
                  </Stack>

                  <Typography sx={{ color: "text.secondary", mt: 1.5, mb: 2 }}>
                    {calculator.description}
                  </Typography>

                  <Button
                    component={RouterLink}
                    to={calculator.to}
                    variant="contained"
                    endIcon={<FiArrowRight />}
                    sx={{
                      borderRadius: 999,
                      fontWeight: 900,
                      textTransform: "none",
                      color: "#fff",
                      "&:hover": {
                        bgcolor: "primary.main",
                        boxShadow: "none",
                        color: "#fff",
                      },
                    }}
                  >
                    {calculator.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
