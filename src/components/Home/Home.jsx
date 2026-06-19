import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Chip,
  Avatar,
} from "@mui/material";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiPhoneCall,
  FiClock,
  FiShuffle,
  FiTrendingDown,
  FiCheckCircle,
} from "react-icons/fi";

import clinicImage from "../../assets/images/pexels-cottonbro-7579831.jpg";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const INDUSTRIES = [
  "Healthcare",
  "Hospitality",
  "Retail",
  "Warehousing & Logistics",
  "Security Services",
  "Manufacturing",
  "Cleaning & Janitorial",
  "Home Care",
  "Construction",
  "Education",
  "Restaurants",
  "Events & Venues",
  "Transportation",
  "Customer Support",
];

const Section = ({ children, sx }) => (
  <Box sx={{ py: { xs: 6, md: 9 }, ...sx }}>{children}</Box>
);

const SectionTitle = ({ eyebrow, title, subtitle, mb = 4 }) => (
  <Box textAlign="center" mb={mb}>
    {eyebrow && (
      <Typography
        variant="overline"
        sx={{ letterSpacing: 1.2, color: "text.secondary" }}
      >
        {eyebrow}
      </Typography>
    )}
    <Typography
      variant="h3"
      sx={{
        fontWeight: 900,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        mt: 0.5,
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        variant="h6"
        sx={{ color: "text.secondary", maxWidth: 760, mx: "auto", mt: 1.5 }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

const IconBullet = ({ icon, title, text }) => (
  <Box display="flex" gap={2} alignItems="flex-start">
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        display: "grid",
        placeItems: "center",
        bgcolor: "rgba(25,118,210,0.08)",
        color: "primary.main",
        flex: "0 0 auto",
        mt: "2px",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      <Typography sx={{ color: "text.secondary" }}>{text}</Typography>
    </Box>
  </Box>
);

const Stat = ({ value, label }) => (
  <Box textAlign="center">
    <Typography variant="h4" sx={{ fontWeight: 900 }}>
      {value}
    </Typography>
    <Typography sx={{ color: "text.secondary" }}>{label}</Typography>
  </Box>
);

const Testimonial = ({ quote, name, role }) => (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>“{quote}”</Typography>
      <Box display="flex" gap={1.5} alignItems="center">
        <Avatar>{name[0]}</Avatar>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{name}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {role}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function Home() {
  const navigate = useNavigate();
  const clinicImageUrl = new URL(clinicImage, import.meta.url).href;
  const industryRowRef = useRef(null);

  const scrollIndustryRow = useCallback(() => {
    const row = industryRowRef.current;
    if (!row) {
      return;
    }

    const firstItem = row.querySelector("[data-industry-item='true']");
    if (!firstItem) {
      return;
    }

    const firstItemWidth = firstItem.getBoundingClientRect().width;
    const step = firstItemWidth + 8;
    const maxLeft = row.scrollWidth - row.clientWidth;

    if (row.scrollLeft >= maxLeft - 4) {
      row.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    row.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      scrollIndustryRow();
    }, 3200);

    return () => clearInterval(timer);
  }, [scrollIndustryRow]);

  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          bgcolor: "#f8f9fb",
          pt: { xs: 3, md: 5 },
          pb: { xs: 10, md: 6 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100vw",
            height: { xs: 430, md: 700 },
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
            "&::before": {
              content: '""',
              position: "absolute",
              width: { xs: 560, md: 1400 },
              height: { xs: 560, md: 1400 },
              borderRadius: "50%",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "repeating-radial-gradient(circle at center, rgba(0,113,227,0.17) 0px, rgba(0,113,227,0.17) 3px, rgba(0,113,227,0.09) 34px, rgba(0,113,227,0.04) 74px, rgba(29,29,31,0.02) 112px, rgba(0,113,227,0) 156px)",
              filter: "blur(1px)",
              animation:
                "heroRipplePulse 10s cubic-bezier(0.22, 1, 0.36, 1) infinite",
            },
            "@keyframes heroRipplePulse": {
              "0%": {
                transform: "translate(-50%, -50%) scale(0.94)",
                opacity: 0.72,
              },
              "50%": {
                transform: "translate(-50%, -50%) scale(1.08)",
                opacity: 0.38,
              },
              "100%": {
                transform: "translate(-50%, -50%) scale(0.94)",
                opacity: 0.72,
              },
            },
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* HERO */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
              gap: { xs: 4, md: 6 },
              alignItems: { xs: "center", md: "flex-start" },
              py: { xs: 4, md: 7 },
              position: "relative",
              width: "100%",
              maxWidth: "100%",
              overflowX: "clip",
            }}
          >
            {/* LEFT */}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 950,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.02,
                  fontSize: { xs: "2rem", md: "3rem" },
                }}
              >
                Workforce Scheduling
                <br />
                That Works For Your People and Your Profits.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: "text.secondary",
                  mt: { xs: 2, md: 5 },
                  maxWidth: 680,
                }}
              >
                We support various industries like:
              </Typography>

              <Box
                sx={{
                  mt: 1.25,
                  mb: { xs: 2.5, md: 5 },
                  px: { xs: 0.75, md: 1 },
                  py: { xs: 0.75, md: 1 },
                  width: "100%",
                  maxWidth: "100%",
                  border: "1px solid #e5e5ea",
                  borderRadius: 3,
                  bgcolor: "#fafafc",
                  boxSizing: "border-box",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.25}>
                  <Stack
                    ref={industryRowRef}
                    direction="row"
                    spacing={1}
                    justifyContent="flex-start"
                    sx={{
                      width: "100%",
                      minWidth: 0,
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                      scrollBehavior: "smooth",
                      pr: 0.5,
                    }}
                  >
                    {INDUSTRIES.map((industry) => (
                      <Chip
                        data-industry-item="true"
                        key={industry}
                        label={industry}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          color: "#1d1d1f",
                          bgcolor: "transparent",
                          border: "none",
                          borderRadius: 1,
                          height: { xs: 30, md: 34 },
                          flex: { xs: "0 0 auto", md: "0 0 calc(25% - 6px)" },
                          maxWidth: { xs: "none", md: "calc(25% - 6px)" },
                          "& .MuiChip-label": {
                            px: { xs: 0.25, md: 0.5 },
                            fontSize: { xs: "0.78rem", md: "0.86rem" },
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                mt={{ xs: 2.25, md: 3.5 }}
                sx={{
                  width: "100%",
                  alignItems: { xs: "stretch", sm: "center" },
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<FiUser />}
                  onClick={() => navigate("/signup-tenant")}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 999,
                    // bgcolor: "#1d1d1f",
                    color: "#fff",
                    px: { xs: 2.25, sm: 3 },
                    py: 1.2,
                    // boxShadow:
                    //   "0 1px 2px rgba(0,0,0,0.08), 0 6px 18px rgba(0,0,0,0.16)",
                    // "&:hover": {
                    //   bgcolor: "#000",
                    //   boxShadow:
                    //     "0 2px 6px rgba(0,0,0,0.12), 0 10px 24px rgba(0,0,0,0.2)",
                    // },
                  }}
                >
                  Sign Up
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<FiUser />}
                  onClick={() => navigate("/login")}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 999,
                    px: { xs: 2.5, sm: 3.5 },
                    py: 1.2,
                    color: "#1d1d1f",
                    borderColor: "#d2d2d7",
                    bgcolor: "#fff",
                    "&:hover": {
                      borderColor: "#b9b9be",
                      bgcolor: "#f5f5f7",
                    },
                  }}
                >
                  Log in
                </Button>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1.25}>
                <Box display="flex" gap={1.25}>
                  <FiShuffle />
                  <Typography>
                    Resolve call-outs and coverage gaps quickly
                  </Typography>
                </Box>
                <Box display="flex" gap={1.25}>
                  <FiTrendingDown />
                  <Typography>
                    Overtime risk visible before publishing
                  </Typography>
                </Box>
                <Box display="flex" gap={1.25}>
                  <FiUsers />
                  <Typography>Clean handling of rotating staff</Typography>
                </Box>
              </Stack>
            </Box>

            {/* RIGHT */}
            <Box
              display="flex"
              flexDirection="column"
              gap={2}
              sx={{ minWidth: 0 }}
            >
              {/* IMAGE */}
              <Box
                sx={{
                  height: { xs: 180, md: 230 },
                  borderRadius: 5,
                  backgroundImage: `url("${clinicImageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* CARD */}
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 900, mb: 2 }}>
                    Today’s schedule health
                  </Typography>

                  <Stack spacing={1.25}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Coverage gaps</Typography>
                      <Chip label="2" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Overtime risk</Typography>
                      <Chip label="Medium" color="warning" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Last-minute change</Typography>
                      <Chip label="Resolved" color="success" />
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" justifyContent="space-between">
                    <Stat value="↓" label="Fewer gaps" />
                    <Stat value="⚡" label="Faster changes" />
                    <Stat value="✔" label="Clear handoffs" />
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* ROI STRIP */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 4,
              mt: { xs: 1, md: 0 },
              background:
                "linear-gradient(140deg, rgba(25,118,210,0.1) 0%, rgba(25,118,210,0.02) 45%, #fff 100%)",
            }}
          >
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", md: "1fr auto" }}
                gap={2}
                alignItems="center"
              >
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                    New for operators
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    See your annual turnover cost in dollars
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
                    Use the ROI Calculator to estimate turnover impact and
                    projected WiserShifts savings in under 2 minutes.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/turnover-roi-calculator")}
                  sx={{
                    fontWeight: 900,
                    px: 3.5,
                    whiteSpace: "nowrap",
                    borderRadius: 999,
                  }}
                >
                  Open ROI Calculator
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* BENEFITS */}
          <Section>
            <SectionTitle
              eyebrow="Why it works"
              title="Workforce Scheduling built for real business conditions"
              subtitle="Designed around constant change, not ideal scenarios."
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <IconBullet
                icon={<FiShuffle />}
                title="Handle call-outs calmly"
                text="Fill gaps without cascading changes or guesswork."
              />
              <IconBullet
                icon={<FiClock />}
                title="See risk early"
                text="Understand overtime impact before schedules go live."
              />
              <IconBullet
                icon={<FiUsers />}
                title="Rotating staff made manageable"
                text="Keep part-time, float, and rotating roles organized."
              />
              <IconBullet
                icon={<FiCheckCircle />}
                title="Clear communication"
                text="One publish updates everyone at once."
              />
            </Box>
          </Section>

          {/* TESTIMONIALS */}
          <Section>
            <SectionTitle
              eyebrow="What teams experience"
              title="Less chaos. More predictability."
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
                gap: 2.5,
              }}
            >
              <Testimonial
                quote="Call-outs used to derail the entire day. Now they’re manageable."
                name="Nursing Home Operations Lead"
                role="Outpatient services"
              />
              <Testimonial
                quote="We finally see overtime before it becomes a payroll problem."
                name="Practice Manager"
                role="Specialty clinic"
              />
              <Testimonial
                quote="Rotating staff no longer means spreadsheet chaos."
                name="Scheduler"
                role="Multi-site clinic"
              />
            </Box>
          </Section>

          {/* CTA */}
          <Section>
            <Card sx={{ p: { xs: 3, md: 4 }, borderRadius: 5 }}>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", md: "1fr auto" }}
                gap={2.5}
                alignItems="center"
              >
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 950 }}>
                    Start Scheduling The Smart Way
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 1 }}>
                    Walk through your staffing patterns in a short demo.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<FiPhoneCall />}
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontWeight: 900, borderRadius: 999 }}
                  >
                    Request a demo
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate("/signup-tenant")}
                    sx={{ fontWeight: 900, borderRadius: 999 }}
                  >
                    Sign Up
                  </Button>
                </Stack>
              </Box>
            </Card>
          </Section>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
