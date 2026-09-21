import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import {
  FiArrowRight,
  FiClock,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const CALCULATORS = [
  {
    title: "Turnover ROI Calculator",
    description:
      "Estimate annual turnover burden and projected Wisershifts savings based on headcount, wage, turnover, and vacancy timeline.",
    cta: "Open Turnover ROI",
    to: "/turnover-roi-calculator",
    icon: <FiTrendingUp size={18} />,
    tag: "Retention & ROI",
    question: "What is turnover costing us?",
    details: ["Hiring cost", "Vacancy time", "Projected savings"],
    accent: "#2563EB",
    softAccent: "#EFF6FF",
    time: "About 3 minutes",
  },
  {
    title: "Cost Leak Calculator (Estimator)",
    description:
      "Estimate annual labor cost leakage across overtime, temporary labor premium, scheduling effort, and coverage inefficiency.",
    cta: "Open Cost Leak Estimator",
    to: "/cost-leak-calculator",
    icon: <FiDollarSign size={18} />,
    tag: "Labor Cost",
    question: "Where is labor spend leaking?",
    details: ["Overtime pressure", "Temporary labor", "Scheduling effort"],
    accent: "#C2410C",
    softAccent: "#FFF7ED",
    time: "About 4 minutes",
  },
];

export default function Calculators() {
  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          py: { xs: 4, md: 7 },
          background:
            "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 54%, #EFF6FF 100%)",
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, lg: 5 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              gap: { xs: 3, md: 8 },
              alignItems: "end",
              mb: { xs: 4, md: 6 },
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Typography
                sx={{
                  color: "#2563EB",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  mb: 1.5,
                }}
              >
                Workforce decision tools
              </Typography>
              <Typography
                component="h1"
                sx={{
                  color: "#111827",
                  fontSize: { xs: "2.45rem", md: "4rem" },
                  fontWeight: 900,
                  lineHeight: 1.03,
                  letterSpacing: "-0.045em",
                }}
              >
                Find the cost hiding in your workforce.
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 1 }}>
                Use a focused estimator to turn staffing assumptions into a
                clearer conversation about retention, labor spend, and savings.
              </Typography>
            </Box>
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 1.25,
                color: "#667085",
                pb: 0.5,
              }}
            >
              <FiClock size={18} />
              <Typography sx={{ fontWeight: 700 }}>
                Quick estimates, practical next steps
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 2, md: 3 },
              alignItems: "stretch",
            }}
          >
            {CALCULATORS.map((calculator) => (
              <Box
                key={calculator.title}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  minHeight: { md: 390 },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid rgba(15,23,42,0.1)",
                  borderRadius: { xs: 3, md: 4 },
                  bgcolor: "#fff",
                  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
                  transition: "transform 180ms ease, box-shadow 180ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 24px 55px rgba(15,23,42,0.13)",
                  },
                }}
              >
                <Box sx={{ height: 8, bgcolor: calculator.accent }} />
                <Box
                  sx={{
                    p: { xs: 2.5, md: 3.5 },
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={2}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2,
                        bgcolor: calculator.softAccent,
                        color: calculator.accent,
                      }}
                    >
                      {calculator.icon}
                    </Box>
                    <Chip
                      label={calculator.tag}
                      size="small"
                      sx={{
                        bgcolor: calculator.softAccent,
                        color: calculator.accent,
                        fontWeight: 800,
                      }}
                    />
                  </Stack>
                  <Typography
                    sx={{
                      color: "#667085",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      mt: 3,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {calculator.question}
                  </Typography>
                  <Typography
                    component="h2"
                    sx={{
                      color: "#111827",
                      fontSize: { xs: "1.55rem", md: "1.8rem" },
                      fontWeight: 900,
                      lineHeight: 1.15,
                      mt: 0.75,
                    }}
                  >
                    {calculator.title}
                  </Typography>
                  <Typography
                    sx={{ color: "text.secondary", lineHeight: 1.6, mt: 1.5 }}
                  >
                    {calculator.description}
                  </Typography>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    gap={1}
                    sx={{ mt: 2.5 }}
                  >
                    {calculator.details.map((detail) => (
                      <Chip
                        key={detail}
                        label={detail}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  <Box
                    sx={{
                      mt: "auto",
                      pt: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#667085",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      {calculator.time}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={calculator.to}
                      variant="contained"
                      endIcon={<FiArrowRight />}
                      sx={{
                        bgcolor: calculator.accent,
                        borderRadius: 999,
                        fontWeight: 900,
                        textTransform: "none",
                        whiteSpace: "nowrap",
                        "&:hover": { bgcolor: "#111827" },
                      }}
                    >
                      {calculator.cta}
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              mt: { xs: 4, md: 6 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              color: "#667085",
            }}
          >
            <FiUsers size={18} />
            <Typography sx={{ fontSize: "0.92rem" }}>
              Built for healthcare operators who need a faster read on labor
              decisions.
            </Typography>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
