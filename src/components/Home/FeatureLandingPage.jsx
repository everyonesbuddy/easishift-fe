import { Box, Button, Container, Stack, Typography } from "@mui/material";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiUsers,
} from "react-icons/fi";
import { Link as RouterLink, useParams } from "react-router-dom";
import Footer from "../Shared/Footer";

const FEATURE_PAGES = {
  scheduling: {
    eyebrow: "Employee scheduling",
    title: "Build schedules your team can actually follow.",
    description:
      "Create coverage-aware schedules, respond to call-outs, and keep every shift clear for the people who depend on it.",
    icon: FiCalendar,
    accent: "#2563EB",
    softAccent: "#EFF6FF",
    points: [
      "Plan coverage by role, unit, and shift type.",
      "Handle open shifts, swaps, and last-minute changes in one place.",
      "Publish a current schedule your team can trust.",
    ],
    panelTitle: "A calmer scheduling rhythm",
    panelText:
      "See the whole week, spot coverage pressure early, and make changes without starting over.",
    route: "/schedule",
  },
  timeclock: {
    eyebrow: "Time clock",
    title: "Turn clock-ins into a clearer view of attendance.",
    description:
      "Give staff a simple way to clock in and out while managers get dependable hours, breaks, and attendance context.",
    icon: FiClock,
    accent: "#0F766E",
    softAccent: "#ECFDF5",
    points: [
      "Track clock-ins, clock-outs, breaks, and worked minutes.",
      "Support open or QR-based clock-in workflows.",
      "Compare attendance outcomes with scheduled shifts.",
    ],
    panelTitle: "Attendance without guesswork",
    panelText:
      "Replace scattered timesheets with a shared, time-stamped record of the workday.",
    route: "/time-tracking",
  },
  messaging: {
    eyebrow: "Team messaging",
    title: "Keep schedule changes from getting lost.",
    description:
      "Give your workforce one place for operational updates, shift context, and the messages that keep a busy facility moving.",
    icon: FiMessageCircle,
    accent: "#C2410C",
    softAccent: "#FFF7ED",
    points: [
      "Share updates with the right people from one workspace.",
      "Keep schedule and staffing conversations close to the work.",
      "Reduce the handoff gaps caused by scattered channels.",
    ],
    panelTitle: "One message, less confusion",
    panelText:
      "Make the latest staffing information easier to find before the next shift begins.",
    route: "/messages",
  },
  integrations: {
    eyebrow: "Workforce integrations",
    title: "Connect the tools around your workforce.",
    description:
      "Start with clean, provider-ready payroll exports while building a more connected workforce workflow.",
    icon: FiUsers,
    accent: "#7C3AED",
    softAccent: "#F5F3FF",
    points: [
      "Choose actual clocked hours or scheduled hours.",
      "Export date ranges up to 92 days in a few clicks.",
      "Download consistent files your payroll team can review and import.",
    ],
    panelTitle: "One workforce, fewer disconnected tools",
    panelText:
      "Keep the systems your team already uses while reducing repetitive handoffs between scheduling, attendance, and payroll.",
    route: "/integrations",
  },
};

export default function FeatureLandingPage() {
  const { feature } = useParams();
  const page = FEATURE_PAGES[feature] || FEATURE_PAGES.scheduling;
  const Icon = page.icon;

  return (
    <>
      <Box sx={{ minHeight: "calc(100vh - 72px)", bgcolor: "#fff" }}>
        <Box
          component="section"
          sx={{
            background: `linear-gradient(120deg, ${page.softAccent} 0%, #fff 64%)`,
            borderBottom: "1px solid #E5E7EB",
            py: { xs: 7, md: 10 },
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, lg: 5 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
                gap: { xs: 5, md: 8 },
                alignItems: "center",
              }}
            >
              <Box sx={{ maxWidth: 720 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: page.accent,
                    mb: 2,
                  }}
                >
                  <Icon size={20} />
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                    }}
                  >
                    {page.eyebrow}
                  </Typography>
                </Box>
                <Typography
                  component="h1"
                  sx={{
                    color: "#111827",
                    fontSize: { xs: "2.7rem", sm: "3.5rem", md: "4.6rem" },
                    fontWeight: 900,
                    lineHeight: 1.02,
                    letterSpacing: "-0.045em",
                  }}
                >
                  {page.title}
                </Typography>
                <Typography
                  sx={{
                    color: "#667085",
                    fontSize: { xs: "1.05rem", md: "1.2rem" },
                    lineHeight: 1.65,
                    maxWidth: 650,
                    mt: 2.5,
                  }}
                >
                  {page.description}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ mt: 4, alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Button
                    component={RouterLink}
                    to="/signup-tenant"
                    variant="contained"
                    endIcon={<FiArrowRight />}
                    sx={{
                      minHeight: 52,
                      px: 3,
                      bgcolor: page.accent,
                      textTransform: "none",
                      fontWeight: 800,
                      "&:hover": { bgcolor: "#111827" },
                    }}
                  >
                    Start free trial
                  </Button>
                  <Button
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    sx={{
                      minHeight: 52,
                      px: 3,
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                  >
                    Book a scheduling audit
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  bgcolor: "#0F172A",
                  color: "#fff",
                  borderRadius: { xs: 3, md: 5 },
                  p: { xs: 3, md: 5 },
                  minHeight: { md: 360 },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 24px 60px rgba(15,23,42,0.16)",
                }}
              >
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    bgcolor: page.accent,
                  }}
                >
                  <Icon size={28} />
                </Box>
                <Box sx={{ mt: { xs: 5, md: 10 } }}>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontSize: { xs: "1.55rem", md: "2rem" },
                      fontWeight: 900,
                      lineHeight: 1.15,
                    }}
                  >
                    {page.panelTitle}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6,
                      mt: 1.5,
                    }}
                  >
                    {page.panelText}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 7, md: 10 } }}>
          <Container maxWidth="md">
            <Typography
              component="h2"
              sx={{
                color: "#111827",
                fontSize: { xs: "1.9rem", md: "2.7rem" },
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              Built for the moments that make operations hard.
            </Typography>
            <Stack spacing={2} sx={{ mt: 5 }}>
              {page.points.map((point) => (
                <Box
                  key={point}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    p: { xs: 2, md: 2.5 },
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ color: page.accent, mt: "2px" }}>
                    <FiCheckCircle size={20} />
                  </Box>
                  <Typography sx={{ color: "#344054", lineHeight: 1.55 }}>
                    {point}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  );
}
