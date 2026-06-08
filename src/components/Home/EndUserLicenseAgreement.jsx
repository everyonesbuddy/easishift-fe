import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 8, 2026";

const intro =
  'This End User License Agreement ("EULA") is a legal agreement between you ("you" or "Licensee") and WiserShifts ("WiserShifts," "we," "us," or "our") governing your access to and use of the WiserShifts platform and related services (the "Software" or "Service"). By accessing or using the Service, you agree to this EULA.';

const sections = [
  {
    title: "1. License Grant",
    paragraphs: [
      "Subject to your compliance with this EULA and any applicable subscription agreement, WiserShifts grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Service solely for your internal business operations.",
      "This license is granted for the subscription term and does not convey ownership of the Service or any intellectual property rights.",
    ],
  },
  {
    title: "2. Restrictions",
    paragraphs: [
      "Except as expressly permitted under applicable law, you may not:",
    ],
    bullets: [
      "Reverse engineer, decompile, disassemble, or otherwise attempt to derive source code",
      "Modify, adapt, translate, or create derivative works of the Service",
      "Copy, distribute, lease, sell, sublicense, assign, or otherwise transfer access rights",
      "Use the Service to provide timesharing, service bureau, or competing services",
      "Circumvent technical limitations or security controls",
      "Use automated means (bots, scrapers, scripts) without prior written authorization",
    ],
  },
  {
    title: "3. User Accounts",
    paragraphs: [
      "Access to the Service is limited to authorized users under a valid account. You are responsible for maintaining credential confidentiality and for all activities conducted under your account.",
      "You must ensure that users within your organization comply with this EULA and applicable laws.",
    ],
  },
  {
    title: "4. Subscription, Fees, and Payment",
    subSections: [
      {
        title: "4.1 Subscription Requirement",
        paragraphs: [
          "Use of the Service may require an active paid subscription under the selected plan.",
        ],
      },
      {
        title: "4.2 Fees and Billing",
        paragraphs: [
          "Fees are billed on a recurring basis according to your selected billing cycle. By providing payment details, you authorize recurring charges for applicable fees, taxes, and add-ons.",
        ],
      },
      {
        title: "4.3 Non-Payment",
        paragraphs: [
          "Failure to pay fees may result in suspension or termination of access to the Service.",
        ],
      },
      {
        title: "4.4 Fee Changes",
        paragraphs: [
          "WiserShifts may update pricing with prior notice as required by contract or applicable law.",
        ],
      },
    ],
  },
  {
    title: "5. Intellectual Property Rights",
    paragraphs: [
      "The Service, including software, source code, object code, user interfaces, features, workflows, trademarks, documentation, and all related content, is owned by WiserShifts and its licensors and protected by intellectual property laws.",
      "No rights are granted except those expressly stated in this EULA.",
    ],
  },
  {
    title: "6. Customer Data",
    paragraphs: [
      'As between the parties, you retain ownership of data you submit to the Service ("Customer Data"). You grant WiserShifts a limited license to host, process, transmit, and display Customer Data solely to provide, maintain, secure, and improve the Service in accordance with applicable agreements and law.',
    ],
  },
  {
    title: "7. Updates, Maintenance, and Support",
    paragraphs: [
      "WiserShifts may deploy updates, patches, bug fixes, enhancements, and functional changes from time to time. Certain updates may alter or remove features.",
      "Support and service levels, if any, are governed by the applicable subscription plan or separate service agreement.",
    ],
  },
  {
    title: "8. Term and Termination",
    paragraphs: [
      "This EULA remains effective while you use the Service or maintain an active subscription. WiserShifts may suspend or terminate your access immediately if you materially breach this EULA, violate acceptable use requirements, or fail to pay fees when due.",
      "Upon termination, your license rights end immediately and you must cease use of the Service. Provisions that by nature should survive termination will survive, including intellectual property, disclaimers, limitation of liability, indemnification, and dispute terms.",
    ],
  },
  {
    title: "9. Disclaimer of Warranties",
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.',
      "WISERSHIFTS DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WISERSHIFTS AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS INTERRUPTION.",
      "IN NO EVENT SHALL WISERSHIFTS' TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS EULA EXCEED THE GREATER OF (A) THE FEES PAID BY YOU FOR THE SERVICE DURING THE THREE (3) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY OR (B) USD $100.",
    ],
  },
  {
    title: "11. Indemnification",
    paragraphs: [
      "You agree to indemnify, defend, and hold harmless WiserShifts and its affiliates, officers, directors, employees, and agents from and against claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from your use of the Service, violation of this EULA, or violation of third-party rights.",
    ],
  },
  {
    title: "12. Compliance with Laws",
    paragraphs: [
      "You agree to use the Service in compliance with all applicable laws, regulations, and industry requirements, including privacy and employment-related laws applicable to your operations.",
    ],
  },
  {
    title: "13. Export Controls",
    paragraphs: [
      "You may not use, export, or re-export the Service except as authorized by applicable export control and sanctions laws. You represent that you are not located in, under the control of, or a national or resident of any restricted jurisdiction prohibited by law.",
    ],
  },
  {
    title: "14. Governing Law and Dispute Resolution",
    paragraphs: [
      "This EULA is governed by the laws of the jurisdiction in which WiserShifts is incorporated, excluding conflict-of-law rules.",
      "Any disputes arising out of or relating to this EULA shall first be addressed through good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration in accordance with applicable arbitration rules, unless either party seeks urgent equitable relief in a court of competent jurisdiction.",
    ],
  },
  {
    title: "15. Miscellaneous",
    subSections: [
      {
        title: "15.1 Entire Agreement",
        paragraphs: [
          "This EULA, together with applicable subscription terms and referenced policies, constitutes the complete agreement regarding your use of the Service.",
        ],
      },
      {
        title: "15.2 Severability",
        paragraphs: [
          "If any provision of this EULA is found unenforceable, the remaining provisions will remain in effect.",
        ],
      },
      {
        title: "15.3 Waiver",
        paragraphs: [
          "Failure to enforce any right or provision does not constitute a waiver of that right or provision.",
        ],
      },
      {
        title: "15.4 Assignment",
        paragraphs: [
          "You may not assign this EULA without prior written consent from WiserShifts. WiserShifts may assign this EULA without restriction.",
        ],
      },
      {
        title: "15.5 Force Majeure",
        paragraphs: [
          "WiserShifts is not liable for delays or failures caused by events beyond reasonable control.",
        ],
      },
    ],
  },
  {
    title: "16. Contact Information",
    paragraphs: ["For questions about this EULA, contact:"],
    contactLines: [
      "WiserShifts",
      "Email: info@wisershifts.com",
      "Website: https://wisershifts.com",
    ],
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
                        <Typography
                          variant="body1"
                          sx={{ color: "text.secondary" }}
                        >
                          {bullet}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}

                {section.subSections?.map((subSection) => (
                  <Box key={subSection.title} sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
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
                  <Typography
                    key={line}
                    variant="body1"
                    sx={{ color: "text.secondary" }}
                  >
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
