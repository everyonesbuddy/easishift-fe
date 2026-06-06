import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 6, 2026";

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly, such as account details, organization setup data, and scheduling-related information entered into the platform.",
  },
  {
    title: "2. How We Use Information",
    body: "We use collected information to operate and improve the service, authenticate users, provide support, communicate important updates, and maintain platform security.",
  },
  {
    title: "3. Data Sharing",
    body: "We do not sell your personal data. We may share data with trusted service providers who support platform operations, and where required by law.",
  },
  {
    title: "4. Data Retention",
    body: "We retain data for as long as needed to provide services, meet legal obligations, resolve disputes, and enforce agreements.",
  },
  {
    title: "5. Security",
    body: "We use reasonable technical and organizational safeguards to protect data. No internet-based system can be guaranteed to be 100% secure.",
  },
  {
    title: "6. Your Choices",
    body: "You may request account data updates or deletion, subject to legal and operational constraints. Contact your account administrator or support channel.",
  },
  {
    title: "7. International Transfers",
    body: "Your data may be processed in countries different from your location, using safeguards aligned with applicable privacy laws.",
  },
  {
    title: "8. Updates to This Policy",
    body: "We may update this Privacy Policy from time to time. Continued use of the service after updates indicates acceptance of the revised policy.",
  },
  {
    title: "9. Contact",
    body: "For privacy questions or requests, contact your support or legal operations channel.",
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          px: 2,
          bgcolor: "#f8f9fb",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Privacy Policy
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
              Last updated: {LAST_UPDATED}
            </Typography>

            {sections.map((section) => (
              <Box key={section.title} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {section.title}
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary" }}>
                  {section.body}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
