import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 8, 2026";

const intro =
  'This Privacy Policy explains how WiserShifts ("WiserShifts," "we," "us," or "our") collects, uses, discloses, and protects information when you access or use our workforce management platform and related services (the "Service"). By accessing or using the Service, you acknowledge this Privacy Policy.';

const sections = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "We collect information you provide directly, information generated through your use of the Service, and certain information from third-party sources where permitted by law.",
    ],
    subSections: [
      {
        title: "1.1 Information You Provide",
        paragraphs: [
          "This includes account registration details, organization profile information, billing contact details, support requests, and any data entered into scheduling, staffing, messaging, and time-tracking workflows.",
        ],
      },
      {
        title: "1.2 Information Collected Automatically",
        paragraphs: [
          "When you use the Service, we may collect log data, device information, browser type, IP address, usage events, and performance diagnostics to operate and secure the platform.",
        ],
      },
      {
        title: "1.3 Information from Third Parties",
        paragraphs: [
          "If you connect third-party integrations (such as payroll, calendar, or HR systems), we may receive related account and synchronization data required to provide integrated features.",
        ],
      },
    ],
  },
  {
    title: "2. How We Use Information",
    paragraphs: [
      "We process personal information to provide, maintain, and improve the Service and to fulfill our contractual and legal obligations.",
    ],
    bullets: [
      "Provide core platform functionality, including scheduling, shift management, communication, and reporting",
      "Authenticate users, manage access controls, and secure accounts",
      "Process subscription billing, invoices, and account administration",
      "Respond to customer support requests and service communications",
      "Monitor, detect, and prevent fraud, abuse, and unauthorized activity",
      "Analyze usage trends and improve product performance and reliability",
      "Comply with legal obligations and enforce our agreements",
    ],
  },
  {
    title: "3. Data Sharing",
    paragraphs: [
      "We do not sell personal information. We disclose information only as described in this Privacy Policy and as necessary to operate the Service.",
    ],
    bullets: [
      "Service providers and subprocessors that support hosting, analytics, payment processing, communications, and security",
      "Integration partners, only where you enable and authorize a connection",
      "Affiliates and corporate entities involved in operating or supporting the Service",
      "Government authorities, regulators, or law enforcement where required by law or valid legal process",
      "Parties involved in a merger, acquisition, financing, or asset sale, subject to confidentiality protections",
    ],
  },
  {
    title: "4. Legal Bases for Processing",
    paragraphs: [
      "Where required by applicable law (including GDPR), we process personal data under one or more legal bases:",
    ],
    bullets: [
      "Performance of a contract",
      "Compliance with legal obligations",
      "Legitimate interests, such as maintaining security and improving services",
      "Consent, where specifically requested and obtained",
    ],
  },
  {
    title: "5. Data Retention",
    paragraphs: [
      "We retain personal information for as long as reasonably necessary to provide the Service, fulfill contractual commitments, resolve disputes, enforce agreements, and comply with legal obligations.",
      "Retention periods vary by data type and applicable legal requirements. Upon termination of services, account data may be retained for a limited period to support export requests and compliance needs before deletion or anonymization.",
    ],
  },
  {
    title: "6. Data Security",
    paragraphs: [
      "WiserShifts implements industry-standard administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, loss, misuse, or alteration.",
      "While we strive to protect information, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "7. International Data Transfers",
    paragraphs: [
      "Your information may be processed in countries other than your own. Where required, WiserShifts uses appropriate transfer safeguards, such as standard contractual clauses or equivalent legal mechanisms, in accordance with applicable data protection laws.",
    ],
  },
  {
    title: "8. Your Privacy Rights",
    paragraphs: [
      "Depending on your location and applicable law, you may have rights regarding your personal information.",
    ],
    bullets: [
      "Access and obtain a copy of your personal data",
      "Request correction of inaccurate or incomplete information",
      "Request deletion of personal data, subject to legal exceptions",
      "Object to or restrict certain processing",
      "Data portability where technically feasible",
      "Withdraw consent where processing is based on consent",
      "Lodge a complaint with a supervisory authority",
    ],
    tailParagraphs: [
      "To exercise rights, contact us using the details below. We may need to verify your identity before processing your request.",
    ],
  },
  {
    title: "9. Cookies and Similar Technologies",
    paragraphs: [
      "We may use cookies and similar technologies to maintain session state, remember preferences, analyze usage, and improve service performance. You can control cookies through browser settings; however, disabling certain cookies may impact functionality.",
    ],
  },
  {
    title: "10. Children's Privacy",
    paragraphs: [
      "The Service is not directed to individuals under 18 years of age, and we do not knowingly collect personal information from children. If we learn that such information has been collected, we will take reasonable steps to delete it.",
    ],
  },
  {
    title: "11. Changes to This Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect legal, technical, or operational changes. We will post the updated policy and revise the Last Updated date. For material changes, we will provide notice through the Service or by email where required by law.",
    ],
  },
  {
    title: "12. Contact Information",
    paragraphs: ["If you have questions or requests regarding this Privacy Policy, please contact us:"],
    contactLines: ["WiserShifts", "Email: info@wisershifts.com", "Website: https://wisershifts.com"],
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

            <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
              {intro}
            </Typography>

            {sections.map((section) => (
              <Box key={section.title} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {section.title}
                </Typography>

                {section.paragraphs?.map((paragraph) => (
                  <Typography
                    key={paragraph}
                    variant="body1"
                    sx={{ color: "text.secondary", mb: 1.5 }}
                  >
                    {paragraph}
                  </Typography>
                ))}

                {section.bullets?.length ? (
                  <Box
                    component="ul"
                    sx={{ color: "text.secondary", mt: 0.5, mb: 1.5, pl: 3 }}
                  >
                    {section.bullets.map((bullet) => (
                      <Box component="li" key={bullet} sx={{ mb: 0.75 }}>
                        <Typography variant="body1" sx={{ color: "text.secondary" }}>
                          {bullet}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}

                {section.tailParagraphs?.map((paragraph) => (
                  <Typography
                    key={paragraph}
                    variant="body1"
                    sx={{ color: "text.secondary", mb: 1.5 }}
                  >
                    {paragraph}
                  </Typography>
                ))}

                {section.subSections?.map((subSection) => (
                  <Box key={subSection.title} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      {subSection.title}
                    </Typography>
                    {subSection.paragraphs?.map((paragraph) => (
                      <Typography
                        key={paragraph}
                        variant="body1"
                        sx={{ color: "text.secondary", mb: 1.25 }}
                      >
                        {paragraph}
                      </Typography>
                    ))}
                  </Box>
                ))}

                {section.contactLines?.map((line) => (
                  <Typography key={line} variant="body1" sx={{ color: "text.secondary" }}>
                    {line}
                  </Typography>
                ))}
              </Box>
            ))}
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
