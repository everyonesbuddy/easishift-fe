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
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiPhoneCall,
  FiClock,
  FiShuffle,
  FiTrendingDown,
  FiCheckCircle,
  FiCalendar,
  FiShield,
  FiZap,
} from "react-icons/fi";

import clinicImage from "../../assets/images/pexels-cottonbro-7579831.jpg";

const NAVBAR_HEIGHT = 80;

const Section = ({ children, sx }) => (
  <Box sx={{ py: { xs: 6, md: 9 }, ...sx }}>{children}</Box>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <Box textAlign="center" mb={4}>
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

  return (
    <Box
      sx={{
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        bgcolor: "#fff",
        pt: { xs: 3, md: 5 },
        pb: { xs: 10, md: 6 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="lg">
        {/* HERO */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
            gap: { xs: 4, md: 6 },
            alignItems: "center",
            py: { xs: 4, md: 7 },
          }}
        >
          {/* LEFT */}
          <Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip icon={<FiZap />} label="Outpatient scheduling" />
              <Chip icon={<FiShield />} label="Designed for change" />
              <Chip icon={<FiCalendar />} label="No enterprise overhead" />
            </Stack>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                letterSpacing: "-0.035em",
                lineHeight: 1.02,
              }}
            >
              Stop losing time, money, and staff to broken scheduling
            </Typography>

            <Typography
              variant="h6"
              sx={{ color: "text.secondary", mt: 2, maxWidth: 680 }}
            >
              We help outpatient clinics schedule doctors and nurses without
              spreadsheets, last-minute chaos, or burnout.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={3}>
              <Button
                variant="contained"
                size="large"
                startIcon={<FiPhoneCall />}
                component="a"
                href="https://calendly.com/easishift-info/30min?month=2026-01"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 900, px: 4 }}
              >
                Book a demo
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<FiUser />}
                onClick={() => navigate("/login")}
                sx={{ fontWeight: 900, px: 4 }}
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
                <Typography>Overtime risk visible before publishing</Typography>
              </Box>
              <Box display="flex" gap={1.25}>
                <FiUsers />
                <Typography>Clean handling of rotating staff</Typography>
              </Box>
            </Stack>
          </Box>

          {/* RIGHT */}
          <Box display="flex" flexDirection="column" gap={2}>
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

        {/* BENEFITS */}
        <Section>
          <SectionTitle
            eyebrow="Why it works"
            title="Scheduling built for real clinic conditions"
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
              name="Clinic Operations Lead"
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
                  See if it fits your clinic
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
                  href="https://calendly.com/easishift-info/30min?month=2026-01"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 900 }}
                >
                  Book a demo
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate("/login")}
                  sx={{ fontWeight: 900 }}
                >
                  Log in
                </Button>
              </Stack>
            </Box>
          </Card>
        </Section>
      </Container>

      {/* MOBILE CTA */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: "block", md: "none" },
          bgcolor: "#fff",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          p: 1.5,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<FiPhoneCall />}
          component="a"
          href="https://calendly.com/easishift-info/30min?month=2026-01"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontWeight: 950 }}
        >
          Book a demo
        </Button>
      </Box>
    </Box>
  );
}
