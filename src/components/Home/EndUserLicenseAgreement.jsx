import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 6, 2026";

const sections = [
  {
    title: "1. License Grant",
    body: "Subject to these terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use WiserShifts for your internal business operations.",
  },
  {
    title: "2. Restrictions",
    body: "You may not reverse engineer, decompile, distribute, sublicense, or create derivative works from the platform except where expressly permitted by law.",
  },
  {
    title: "3. User Accounts",
    body: "Access is limited to authorized users under a valid tenant account. You are responsible for account security and compliance with your organization policies.",
  },
  {
    title: "4. Intellectual Property",
    body: "The platform, software, and related content are owned by WiserShifts and protected by intellectual property laws. No ownership rights are transferred to you.",
  },
  {
    title: "5. Updates and Changes",
    body: "We may release updates, improvements, or fixes. Some features may change or be removed as the service evolves.",
  },
  {
    title: "6. Termination",
    body: "This license remains active while your account is in good standing and may be suspended or terminated for breach of these terms or non-payment.",
  },
  {
    title: "7. Disclaimer",
    body: "Except as required by law, the software is provided as is and as available without warranties of any kind, express or implied.",
  },
  {
    title: "8. Limitation of Liability",
    body: "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages arising from use of the platform.",
  },
  {
    title: "9. Governing Law",
    body: "This EULA is governed by applicable laws in the jurisdiction defined by your service agreement, unless otherwise required by local law.",
  },
];

export default function EndUserLicenseAgreement() {
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
              End User License Agreement (EULA)
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
