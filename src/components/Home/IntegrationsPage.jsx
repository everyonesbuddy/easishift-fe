import {
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { FiArrowRight, FiCheck, FiDownload, FiLink } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import Footer from "../Shared/Footer";
import gustoLogo from "../../assets/images/gusto.jpg";
import quickbooksLogo from "../../assets/images/quickbooks.jpg";
import ripplingLogo from "../../assets/images/rippling.png";

const PROVIDERS = [
  {
    name: "Gusto",
    logo: gustoLogo,
    background: "#FFF1EE",
    description:
      "Export employee hours, earning type, job, department, and notes in a Gusto-ready CSV.",
  },
  {
    name: "QuickBooks",
    logo: quickbooksLogo,
    background: "#EFFAEE",
    description:
      "Prepare time activity with employee, date, start and end times, service item, class, and hours.",
  },
  {
    name: "Rippling",
    logo: ripplingLogo,
    background: "#F3F4F6",
    description:
      "Create payroll-ready rows with employee details, pay code, department, location, and worked hours.",
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <Box sx={{ minHeight: "calc(100vh - 72px)", bgcolor: "#fff" }}>
        <Box
          component="section"
          sx={{
            borderBottom: "1px solid #E5E7EB",
            background: "linear-gradient(120deg, #F5F3FF 0%, #FFFFFF 64%)",
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
                    color: "#7C3AED",
                    mb: 2,
                  }}
                >
                  <FiLink size={20} />
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                    }}
                  >
                    Workforce integrations
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
                  Connect the tools around your workforce.
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
                  Start with clean, provider-ready exports for payroll, then
                  bring more of your workforce workflow into one connected
                  place.
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
                      bgcolor: "#7C3AED",
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
                    bgcolor: "#7C3AED",
                  }}
                >
                  <FiDownload size={28} />
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
                    One workforce, fewer disconnected tools
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6,
                      mt: 1.5,
                    }}
                  >
                    Keep the systems your team already uses while reducing
                    repetitive handoffs between scheduling, attendance, and
                    payroll.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 7, md: 9 } }}>
          <Container maxWidth="lg">
            <Typography
              component="h2"
              sx={{ fontSize: { xs: "1.8rem", md: "2.5rem" }, fontWeight: 900 }}
            >
              Payroll, first in a growing integrations toolkit
            </Typography>
            <Typography sx={{ color: "#667085", mt: 1, mb: 4 }}>
              Today, export the hours your payroll team needs. The integrations
              foundation is designed to expand into more workforce tools over
              time.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                borderTop: "1px solid #E5E7EB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              {PROVIDERS.map((provider, index) => (
                <Box
                  key={provider.name}
                  sx={{
                    py: 4,
                    px: { xs: 0, md: 3 },
                    borderTop: {
                      xs: index ? "1px solid #E5E7EB" : "none",
                      md: "none",
                    },
                    borderLeft: {
                      xs: "none",
                      md: index ? "1px solid #E5E7EB" : "none",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 150, sm: 180 },
                      height: 76,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: provider.background,
                      borderRadius: 2,
                      overflow: "hidden",
                      mb: 2,
                      p: provider.name === "Gusto" ? 0 : 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={provider.logo}
                      alt={`${provider.name} logo`}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {provider.name}
                  </Typography>
                  <Typography
                    sx={{ color: "#667085", lineHeight: 1.65, mt: 1 }}
                  >
                    {provider.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        <Box
          component="section"
          sx={{ bgcolor: "#111827", color: "#fff", py: { xs: 7, md: 9 } }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "0.85fr 1.15fr" },
                gap: { xs: 4, md: 8 },
                alignItems: "center",
              }}
            >
              <Box>
                <Box sx={{ color: "#93C5FD", mb: 2 }}>
                  <FiDownload size={30} />
                </Box>
                <Typography
                  component="h2"
                  sx={{
                    fontSize: { xs: "1.9rem", md: "2.6rem" },
                    fontWeight: 900,
                    lineHeight: 1.1,
                  }}
                >
                  A connected workflow your operations team controls.
                </Typography>
              </Box>
              <Stack spacing={2.25}>
                {[
                  "Start with actual clocked hours when time tracking is enabled.",
                  "Use scheduled hours for planning or payroll preparation.",
                  "Choose any date range up to 92 days and download a provider-ready CSV.",
                ].map((item) => (
                  <Box
                    key={item}
                    sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                  >
                    <Box sx={{ color: "#60A5FA", mt: "3px" }}>
                      <FiCheck />
                    </Box>
                    <Typography
                      sx={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}
                    >
                      {item}
                    </Typography>
                  </Box>
                ))}
                <Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.58)",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                >
                  Provider-ready CSV export is a file-based workflow. It does
                  not connect to or automatically sync your payroll account.
                </Typography>
              </Stack>
            </Box>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  );
}
