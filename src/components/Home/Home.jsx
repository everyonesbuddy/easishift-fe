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
  FiHome,
  FiDownload,
  FiSend,
  FiSmartphone,
  FiRepeat,
  FiLayers,
  FiAlertTriangle,
  FiX,
  FiCheck,
  FiHeart,
} from "react-icons/fi";

import heroImage from "../../assets/images/wisershifts-hero-visual.png";
import gustoLogo from "../../assets/images/gusto.jpg";
import quickbooksLogo from "../../assets/images/quickbooks.jpg";
import ripplingLogo from "../../assets/images/rippling.png";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;

const HEALTHCARE_SETTINGS = [
  { label: "Assisted Living", icon: <FiHome size={18} /> },
  { label: "Memory Care", icon: <FiHeart size={18} /> },
  { label: "Skilled Nursing", icon: <FiUsers size={18} /> },
  { label: "Home Care", icon: <FiHome size={18} /> },
  { label: "Small Clinics", icon: <FiCheckCircle size={18} /> },
];

const STEPS = [
  {
    icon: <FiLayers size={22} />,
    title: "Set your weekly needs once",
    text: "Say how many CNAs, med techs or nurses you need on each shift. Every new week starts from it.",
  },
  {
    icon: <FiCalendar size={22} />,
    title: "Build the week",
    text: "Tap an open spot to put someone in it, or let auto-fill do it, keeping last week's people where they were.",
  },
  {
    icon: <FiSend size={22} />,
    title: "Send it in one click",
    text: "Everyone gets their own link by text or email and sees just their shifts. No app to download, no password to forget.",
  },
];

const BEFORE = [
  "Excel files and paper on the wall",
  "Group texts nobody can scroll back through",
  "\u201cI didn\u2019t know I was on.\u201d",
  "Your Sunday spent rebuilding next week",
];

const AFTER = [
  "One schedule, built in minutes",
  "Sent to everyone in one click",
  "Each person sees their shifts on their phone",
  "Next week starts from this week",
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

const Feature = ({ icon, title, text, tag }) => (
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
        {tag && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 0.9,
              py: 0.2,
              borderRadius: 999,
              bgcolor: "#F2F4F7",
              color: "#475467",
              fontSize: "0.7rem",
              fontWeight: 700,
              verticalAlign: "middle",
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </Box>
        )}
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
              <Box sx={{ maxWidth: { xs: 620, md: 760 }, color: "#fff" }}>
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
                  Scheduling for care facilities
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.045em",
                    lineHeight: 1.02,
                    color: "#fff",
                    fontSize: {
                      xs: "2.35rem",
                      sm: "3rem",
                      md: "3.45rem",
                      lg: "3.8rem",
                    },
                  }}
                >
                  Build the schedule in minutes. Text it to your whole team in
                  one click.
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
                  Built for assisted living, memory care, nursing and home care.
                  Free to start, no credit card.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ mt: 3.5, alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<FiArrowRight />}
                    onClick={() => navigate("/signup-tenant")}
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
                    Start free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component="a"
                    href="#how-it-works"
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
                    See how it works
                  </Button>
                </Stack>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.66)",
                    fontSize: "0.88rem",
                    mt: 1.75,
                  }}
                >
                  Free for one scheduler and up to 15 staff.
                </Typography>
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
                    Made for 24/7 care teams
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
                    Free calculators
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
                    What are call-outs and overtime costing you?
                  </Typography>
                  <Typography
                    sx={{
                      color: "#667085",
                      mt: 0.75,
                      maxWidth: 720,
                      lineHeight: 1.55,
                    }}
                  >
                    Put in your own numbers and see what last-minute coverage,
                    overtime and turnover add up to each month.
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
              eyebrow="Sound familiar?"
              title="Scheduling shouldn't eat your weekend."
              subtitle="Most care schedules still live in a spreadsheet and a group chat. WiserShifts replaces both."
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2.5,
                maxWidth: 1000,
                mx: "auto",
              }}
            >
              {[
                { label: "Before", items: BEFORE, good: false },
                { label: "With WiserShifts", items: AFTER, good: true },
              ].map((col) => (
                <Box
                  key={col.label}
                  sx={{
                    borderRadius: "20px",
                    p: { xs: 3, md: 4 },
                    border: "1px solid",
                    borderColor: col.good ? "#BFDBFE" : "#E4E7EC",
                    bgcolor: col.good ? "#EFF6FF" : "#F9FAFB",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: col.good ? "#2563EB" : "#667085",
                      mb: 2,
                    }}
                  >
                    {col.label}
                  </Typography>
                  <Stack spacing={1.5}>
                    {col.items.map((item) => (
                      <Box
                        key={item}
                        sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}
                      >
                        <Box
                          sx={{
                            mt: "3px",
                            display: "flex",
                            color: col.good ? "#2563EB" : "#98A2B3",
                          }}
                        >
                          {col.good ? <FiCheck size={18} /> : <FiX size={18} />}
                        </Box>
                        <Typography
                          sx={{
                            color: col.good ? "#111827" : "#475467",
                            fontWeight: col.good ? 650 : 500,
                            lineHeight: 1.5,
                          }}
                        >
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Section>

          <Section sx={{ pt: 0, scrollMarginTop: `${NAVBAR_HEIGHT}px` }}>
            <Box id="how-it-works" sx={{ scrollMarginTop: `${NAVBAR_HEIGHT + 24}px` }}>
              <SectionTitle
                eyebrow="How it works"
                title="From blank week to everyone's phone."
                subtitle="Three steps. The first week takes a few minutes; every week after starts from the last one."
              />
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: { xs: 2.5, md: 3 },
                maxWidth: 1100,
                mx: "auto",
              }}
            >
              {STEPS.map((step, index) => (
                <Box
                  key={step.title}
                  sx={{
                    position: "relative",
                    borderRadius: "20px",
                    border: "1px solid #E4E7EC",
                    p: { xs: 3, md: 3.5 },
                    bgcolor: "#fff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: "14px",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(37, 99, 235, 0.08)",
                        color: "#2563EB",
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "2rem",
                        color: "#E4E7EC",
                        lineHeight: 1,
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </Box>
                  <Typography
                    component="h3"
                    sx={{ fontWeight: 800, color: "#111827", fontSize: "1.15rem", mb: 1 }}
                  >
                    {step.title}
                  </Typography>
                  <Typography sx={{ color: "#667085", lineHeight: 1.6 }}>
                    {step.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Section>

          <Section sx={{ pt: 0 }}>
            <SectionTitle
              eyebrow="Why schedulers switch"
              title="Less chasing. Fewer surprises."
              subtitle="Everything you need to get the week out, and keep it covered once it's out."
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
                icon={<FiSmartphone size={21} />}
                title="Staff don't need an account"
                text="Each person gets a personal link. It opens the app if they have it, or their browser if they don't, showing just their shifts."
              />
              <Feature
                icon={<FiRepeat size={21} />}
                title="Last week's people, carried forward"
                tag="Starter"
                text="Auto-fill keeps the same people in the same spots, then fills the gaps with whoever is free and qualified."
              />
              <Feature
                icon={<FiLayers size={21} />}
                title="Send everyone, or just one unit"
                text="Publish the whole week, or only Memory Care, or only the med techs, when one part is ready first."
              />
              <Feature
                icon={<FiAlertTriangle size={21} />}
                title="See the gaps before they bite"
                text="Open spots, call-outs and no-shows are flagged right on the week, so you know what still needs covering."
              />
              <Feature
                icon={<FiShuffle size={21} />}
                title="Call-outs without the group text"
                tag="Starter"
                text="Staff can ask to swap or pick up an open shift from their link. You approve it in one tap."
              />
              <Feature
                icon={<FiClock size={21} />}
                title="Clock-ins that match the schedule"
                tag="Starter"
                text="Staff clock in from their phone, on site if you want. Hours line up with their shifts and export straight to payroll."
              />
            </Box>
            <Typography
              sx={{ textAlign: "center", color: "#667085", fontSize: "0.9rem", mt: 5 }}
            >
              Free sends schedules by email. Texting and the{" "}
              <Box component="span" sx={{ fontWeight: 700 }}>Starter</Box>{" "}
              features come with a 14-day free trial, no card needed.
            </Typography>
          </Section>

          <Section sx={{ pb: { xs: 7, md: 8 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
                gap: { xs: 4, md: 7 },
                alignItems: "center",
                borderTop: "1px solid #E5E7EB",
                borderBottom: "1px solid #E5E7EB",
                py: { xs: 5, md: 6 },
              }}
            >
              <Box>
                <Box sx={{ color: "#2563EB", mb: 1.5 }}>
                  <FiDownload size={26} />
                </Box>
                <Typography
                  component="h2"
                  sx={{
                    color: "#111827",
                    fontWeight: 900,
                    fontSize: { xs: "1.8rem", md: "2.35rem" },
                    lineHeight: 1.1,
                  }}
                >
                  Hours that go straight to payroll.
                </Typography>
                <Typography
                  sx={{ color: "#667085", lineHeight: 1.65, mt: 1.5 }}
                >
                  Export clocked or scheduled hours in a file your payroll
                  provider can import. Keep the payroll system you already use.
                </Typography>
                <Button
                  onClick={() => navigate("/integrations")}
                  endIcon={<FiArrowRight />}
                  sx={{ mt: 2, px: 0, textTransform: "none", fontWeight: 800 }}
                >
                  See payroll exports
                </Button>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  border: "1px solid #E5E7EB",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                {[
                  { name: "Gusto", logo: gustoLogo, bg: "#FFF1EE" },
                  { name: "QuickBooks", logo: quickbooksLogo, bg: "#EFFAEE" },
                  { name: "Rippling", logo: ripplingLogo, bg: "#F3F4F6" },
                ].map((provider, index) => (
                  <Box
                    key={provider.name}
                    sx={{
                      minHeight: 150,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.25,
                      borderTop: {
                        xs: index ? "1px solid #E5E7EB" : "none",
                        sm: "none",
                      },
                      borderLeft: {
                        xs: "none",
                        sm: index ? "1px solid #E5E7EB" : "none",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 128,
                        height: 62,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 2,
                        bgcolor: provider.bg,
                        overflow: "hidden",
                        p: provider.name === "Gusto" ? 0 : 0.75,
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
                    <Typography sx={{ fontWeight: 800 }}>
                      {provider.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
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
                    Get next week's schedule out tonight.
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.70)",
                      mt: 1,
                      maxWidth: 650,
                      lineHeight: 1.55,
                    }}
                  >
                    Start free with one scheduler and up to 15 staff. Add your
                    team, build the week and send it. Running several buildings?
                    Book a demo and we'll set it up with you.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    variant="contained"
                    endIcon={<FiArrowRight />}
                    onClick={() => navigate("/signup-tenant")}
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
                    Start free
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FiCalendar />}
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
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
                    Book a demo
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
