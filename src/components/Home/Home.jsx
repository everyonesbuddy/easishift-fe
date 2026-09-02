import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiUsers,
  FiClock,
  FiShuffle,
  FiCheckCircle,
  FiArrowRight,
  FiTrendingDown,
  FiHome,
} from "react-icons/fi";

import heroImage from "../../assets/images/wisershifts-hero-visual.png";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const HEALTHCARE_SETTINGS = [
  { label: "Skilled Nursing", icon: <FiHome size={18} /> },
  { label: "Assisted Living", icon: <FiUsers size={18} /> },
  { label: "Senior Living", icon: <FiHome size={18} /> },
  { label: "Long-Term Care", icon: <FiClock size={18} /> },
  { label: "Post-Acute Care", icon: <FiCheckCircle size={18} /> },
];

const Section = ({ children, sx }) => (
  <Box component="section" sx={{ py: { xs: 7, md: 10 }, ...sx }}>
    {children}
  </Box>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <Box sx={{ maxWidth: 780, mx: "auto", textAlign: "center", mb: 6 }}>
    {eyebrow && (
      <Typography
        sx={{
          color: "#2563EB",
          fontSize: "0.78rem",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          mb: 1.5,
        }}
      >
        {eyebrow}
      </Typography>
    )}
    <Typography
      component="h2"
      sx={{
        fontWeight: 900,
        letterSpacing: "-0.035em",
        lineHeight: 1.08,
        fontSize: { xs: "2rem", md: "2.8rem" },
        color: "#111827",
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        sx={{
          color: "#667085",
          fontSize: { xs: "1rem", md: "1.1rem" },
          lineHeight: 1.6,
          mt: 2,
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

const Feature = ({ icon, title, text }) => (
  <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
    <Box
      sx={{
        width: 46,
        height: 46,
        minWidth: 46,
        borderRadius: "14px",
        display: "grid",
        placeItems: "center",
        background: "rgba(37, 99, 235, 0.08)",
        color: "#2563EB",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        sx={{ fontWeight: 800, color: "#111827", fontSize: "1rem", mb: 0.5 }}
      >
        {title}
      </Typography>
      <Typography sx={{ color: "#667085", lineHeight: 1.55 }}>
        {text}
      </Typography>
    </Box>
  </Box>
);

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Box
        sx={{
          bgcolor: "#fff",
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          overflow: "hidden",
        }}
      >
        <Box
          component="section"
          sx={{
            position: "relative",
            minHeight: { xs: "auto", md: 760 },
            overflow: "hidden",
            backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.84) 25%, rgba(15,23,42,0.42) 52%, rgba(15,23,42,0.12) 100%), url("${heroImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottom: "1px solid #EEF2F6",
          }}
        >
          <Container
            maxWidth="xl"
            sx={{
              position: "relative",
              zIndex: 1,
              px: { xs: 2.5, sm: 4, lg: 5 },
            }}
          >
            <Box
              sx={{
                minHeight: { xs: "auto", md: 760 },
                display: "flex",
                alignItems: "center",
                py: { xs: 7, md: 8 },
              }}
            >
              <Box sx={{ maxWidth: { xs: 620, md: 680 }, color: "#fff" }}>
                <Typography
                  component="div"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#BFDBFE",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    mb: 2.25,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#60A5FA",
                    }}
                  />
                  Healthcare workforce scheduling
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.045em",
                    lineHeight: 0.99,
                    color: "#fff",
                    fontSize: {
                      xs: "2.8rem",
                      sm: "3.5rem",
                      md: "4.05rem",
                      lg: "4.45rem",
                    },
                  }}
                >
                  Healthcare Scheduling{" "}
                  <Box component="span" sx={{ color: "#93C5FD" }}>
                    Without the Chaos.
                  </Box>
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: { xs: "1.05rem", md: "1.18rem" },
                    lineHeight: 1.6,
                    maxWidth: 560,
                    mt: 3,
                  }}
                >
                  Build schedules faster. Handle call-outs and shift changes.
                  Keep your staff informed, all from one place.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ mt: 3.5, alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<FiCalendar />}
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      minHeight: 54,
                      px: 3.2,
                      borderRadius: "12px",
                      bgcolor: "#2563EB",
                      color: "#fff",
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "0.98rem",
                      boxShadow: "0 12px 28px rgba(0, 0, 0, 0.25)",
                      "&:hover": { bgcolor: "#3B82F6" },
                    }}
                  >
                    Book a Scheduling Audit
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate("/pricing")}
                    sx={{
                      minHeight: 54,
                      px: 3.2,
                      borderRadius: "12px",
                      borderColor: "rgba(255,255,255,0.55)",
                      color: "#fff",
                      fontWeight: 750,
                      textTransform: "none",
                      fontSize: "0.98rem",
                      bgcolor: "rgba(15,23,42,0.18)",
                      "&:hover": {
                        borderColor: "#fff",
                        bgcolor: "rgba(255,255,255,0.10)",
                      },
                    }}
                  >
                    View Pricing
                  </Button>
                </Stack>
                <Box sx={{ mt: 5 }}>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.72)",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      mb: 1.5,
                    }}
                  >
                    Built for healthcare teams
                  </Typography>
                  <Box
                    sx={{
                      borderTop: "1px solid rgba(255,255,255,0.28)",
                      borderBottom: "1px solid rgba(255,255,255,0.28)",
                      py: 1.5,
                      overflow: "visible",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0}
                      sx={{
                        width: "100%",
                        minWidth: 0,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(3, 1fr)",
                          sm: "repeat(5, 1fr)",
                        },
                        rowGap: { xs: 1.5, sm: 0 },
                      }}
                    >
                      {HEALTHCARE_SETTINGS.map((item, index) => (
                        <Box
                          key={item.label}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: { xs: 0.45, md: 0.65 },
                            justifyContent: { xs: "center", md: "flex-start" },
                            minWidth: 0,
                            px: { xs: 0.35, md: index === 0 ? 0 : 1.75 },
                            borderLeft:
                              index === 0 || index < 3
                                ? "none"
                                : {
                                    xs: "none",
                                    sm: "1px solid rgba(255,255,255,0.28)",
                                  },
                            color: "rgba(255,255,255,0.84)",
                            textAlign: { xs: "center", md: "left" },
                            whiteSpace: "nowrap",
                            lineHeight: 1.2,
                            fontSize: {
                              xs: "0.68rem",
                              sm: "0.7rem",
                              md: "0.78rem",
                            },
                            fontWeight: 650,
                          }}
                        >
                          <Box sx={{ display: "flex", color: "#93C5FD" }}>
                            {item.icon}
                          </Box>
                          {item.label}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 4, lg: 5 } }}>
          <Card
            variant="outlined"
            sx={{
              mt: { xs: 4, md: 5 },
              borderRadius: "20px",
              borderColor: "#E4E7EC",
              overflow: "hidden",
              background:
                "linear-gradient(110deg, #F8FAFC 0%, #F8FAFC 55%, #EFF6FF 100%)",
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                  gap: 3,
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: "#2563EB",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                    }}
                  >
                    Workforce calculators
                  </Typography>
                  <Typography
                    sx={{
                      color: "#111827",
                      fontWeight: 900,
                      letterSpacing: "-0.025em",
                      fontSize: { xs: "1.4rem", md: "1.7rem" },
                      mt: 0.75,
                    }}
                  >
                    Estimate the labor impact of scheduling inefficiency.
                  </Typography>
                  <Typography
                    sx={{
                      color: "#667085",
                      mt: 0.75,
                      maxWidth: 720,
                      lineHeight: 1.55,
                    }}
                  >
                    Use practical calculators to understand labor cost leakage
                    and evaluate the impact of better scheduling.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  endIcon={<FiArrowRight />}
                  onClick={() => navigate("/calculators")}
                  sx={{
                    minHeight: 50,
                    px: 2.75,
                    borderRadius: "11px",
                    bgcolor: "#111827",
                    color: "#fff",
                    fontWeight: 800,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    "&:hover": { bgcolor: "#1F2937" },
                  }}
                >
                  Open Calculators
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Section>
            <SectionTitle
              eyebrow="Why WiserShifts"
              title="Scheduling built for the reality of healthcare."
              subtitle="Built around the constant changes, call-outs, and coverage challenges healthcare teams deal with every day."
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: { xs: 4, md: 5, lg: 6 },
                maxWidth: 1000,
                mx: "auto",
              }}
            >
              <Feature
                icon={<FiShuffle size={21} />}
                title="Handle call-outs calmly"
                text="Make last-minute changes without rebuilding the entire schedule or relying on scattered messages."
              />
              <Feature
                icon={<FiTrendingDown size={21} />}
                title="See risk before publishing"
                text="Understand overtime and coverage concerns before the schedule goes live."
              />
              <Feature
                icon={<FiUsers size={21} />}
                title="Keep rotating staff organized"
                text="Manage part-time, float, and rotating employees with a clearer scheduling process."
              />
              <Feature
                icon={<FiCheckCircle size={21} />}
                title="Keep everyone informed"
                text="Publish changes from one place so employees have a clear, current schedule."
              />
            </Box>
          </Section>

          <Section sx={{ pt: 1, pb: { xs: 8, md: 10 } }}>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: { xs: "22px", md: "28px" },
                bgcolor: "#0F172A",
                px: { xs: 3, md: 6 },
                py: { xs: 4, md: 5 },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 420,
                  height: 420,
                  borderRadius: "50%",
                  right: -180,
                  top: -200,
                  background:
                    "radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 70%)",
                  pointerEvents: "none",
                }}
              />
              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                  gap: 3,
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    component="h2"
                    sx={{
                      color: "#fff",
                      fontWeight: 900,
                      letterSpacing: "-0.035em",
                      fontSize: { xs: "1.8rem", md: "2.35rem" },
                    }}
                  >
                    Healthcare Scheduling Without the Chaos.
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.70)",
                      mt: 1,
                      maxWidth: 650,
                      lineHeight: 1.55,
                    }}
                  >
                    See how WiserShifts can simplify scheduling, call-outs,
                    shift changes, and team communication.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    variant="contained"
                    startIcon={<FiCalendar />}
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      minHeight: 50,
                      px: 2.75,
                      borderRadius: "11px",
                      bgcolor: "#2563EB",
                      color: "#fff",
                      fontWeight: 800,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                      "&:hover": { bgcolor: "#3B82F6" },
                    }}
                  >
                    Book a Scheduling Audit
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/pricing")}
                    sx={{
                      minHeight: 50,
                      px: 2.75,
                      borderRadius: "11px",
                      borderColor: "rgba(255,255,255,0.28)",
                      color: "#fff",
                      fontWeight: 750,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                      "&:hover": {
                        borderColor: "rgba(255,255,255,0.55)",
                        bgcolor: "rgba(255,255,255,0.05)",
                      },
                    }}
                  >
                    View Pricing
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Section>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
