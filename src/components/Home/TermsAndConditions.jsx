import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 6, 2026";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating an account, accessing, or using WiserShifts, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the service.",
  },
  {
    title: "2. Service Overview",
    body: "WiserShifts provides workforce scheduling and related tools for organizations. We may update, improve, or discontinue parts of the service from time to time.",
  },
  {
    title: "3. Account Responsibility",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must provide accurate and current information.",
  },
  {
    title: "4. Billing and Subscription",
    body: "Paid features are governed by your selected plan. Charges, renewal terms, cancellations, and billing details are handled according to your active subscription settings.",
  },
  {
    title: "5. Acceptable Use",
    body: "You agree not to misuse the platform, attempt unauthorized access, disrupt service operations, or use the platform in violation of applicable laws and regulations.",
  },
  {
    title: "6. Data and Privacy",
    body: "You retain ownership of your organizational data. Your use of the service is also subject to our Privacy Policy, which describes how personal and operational data is processed.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the maximum extent permitted by law, WiserShifts is provided on an as-is basis. We are not liable for indirect, incidental, or consequential damages arising from use of the service.",
  },
  {
    title: "8. Changes to Terms",
    body: "We may revise these Terms and Conditions from time to time. Continued use of the service after updates means you accept the revised terms.",
  },
  {
    title: "9. Contact",
    body: "For legal or terms-related questions, contact your support or legal operations channel.",
  },
];

export default function TermsAndConditions() {
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
              Terms and Conditions
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
