import { Box, Container, Paper, Typography } from "@mui/material";
import Footer from "../Shared/Footer";

const LAST_UPDATED = "June 8, 2026";

const intro =
  'Please read these Terms and Conditions ("Agreement") carefully before accessing or using the WiserShifts platform ("Service"). By registering for, accessing, or using the Service, you agree to be bound by this Agreement. If you do not agree to these terms, you may not use the Service.';

const sections = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By creating an account or using WiserShifts in any manner, you confirm that you are at least 18 years of age, have the legal authority to enter into this Agreement, and accept all terms set forth herein. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to this Agreement.",
    ],
  },
  {
    title: "2. Description of Service",
    paragraphs: [
      'WiserShifts is a cloud-based workforce management platform that provides tools for employee scheduling, shift management, time tracking, team communication, and related business operations ("Service"). The Service is provided on a subscription basis and may be updated, modified, or discontinued at any time at WiserShifts\' sole discretion.',
    ],
  },
  {
    title: "3. Account Registration and Security",
    paragraphs: [
      "To use the Service, you must create an account and provide accurate, current, and complete information. You are responsible for:",
    ],
    bullets: [
      "Maintaining the confidentiality of your login credentials",
      "All activity that occurs under your account",
      "Notifying WiserShifts immediately of any unauthorized access or security breach",
      "Ensuring all users within your organization comply with this Agreement",
    ],
    tailParagraphs: [
      "WiserShifts reserves the right to suspend or terminate accounts that violate these terms or that we believe, in our sole judgment, pose a risk to the Service or other users.",
    ],
  },
  {
    title: "4. Subscription Plans and Payment",
    subSections: [
      {
        title: "4.1 Fees",
        paragraphs: [
          "Access to the Service requires a valid subscription. Subscription fees are outlined on the WiserShifts pricing page and are subject to change with 30 days' notice to existing subscribers.",
        ],
      },
      {
        title: "4.2 Billing",
        paragraphs: [
          "Subscriptions are billed on a recurring basis (monthly or annually, depending on your selected plan). By providing payment information, you authorize WiserShifts to charge the applicable fees automatically on each renewal date.",
        ],
      },
      {
        title: "4.3 Refunds",
        paragraphs: [
          "All fees are non-refundable except as required by applicable law. WiserShifts may, at its discretion, offer credits or prorated refunds in exceptional circumstances.",
        ],
      },
      {
        title: "4.4 Taxes",
        paragraphs: [
          "You are responsible for all applicable taxes, duties, or levies associated with your use of the Service.",
        ],
      },
    ],
  },
  {
    title: "5. Acceptable Use",
    paragraphs: [
      "You agree to use the Service only for lawful, business-related purposes. You may not:",
    ],
    bullets: [
      "Use the Service to violate any applicable law or regulation",
      "Upload or transmit any harmful, fraudulent, or deceptive content",
      "Attempt to reverse engineer, decompile, or extract the source code of the Service",
      "Resell, sublicense, or otherwise make the Service available to third parties without written consent",
      "Use automated scripts or bots to access the Service without prior authorization",
      "Interfere with or disrupt the integrity or performance of the Service or its infrastructure",
      "Use the Service to store or process personally identifiable information in violation of applicable privacy laws",
    ],
  },
  {
    title: "6. Data and Privacy",
    subSections: [
      {
        title: "6.1 Your Data",
        paragraphs: [
          'You retain ownership of all data you input into the Service ("Customer Data"). By using the Service, you grant WiserShifts a limited, non-exclusive license to access and process Customer Data solely to provide and improve the Service.',
        ],
      },
      {
        title: "6.2 Privacy Policy",
        paragraphs: [
          "Your use of the Service is also governed by our Privacy Policy, which is incorporated into this Agreement by reference. WiserShifts handles all personal data in accordance with applicable data protection laws, including GDPR and CCPA where applicable.",
        ],
      },
      {
        title: "6.3 Data Security",
        paragraphs: [
          "WiserShifts implements industry-standard technical and organizational measures to protect Customer Data. However, no method of transmission or storage is 100% secure, and WiserShifts cannot guarantee absolute security.",
        ],
      },
      {
        title: "6.4 Data Retention",
        paragraphs: [
          "Upon termination of your subscription, WiserShifts will retain your data for 30 days, during which you may request an export. After this period, your data may be permanently deleted.",
        ],
      },
    ],
  },
  {
    title: "7. Intellectual Property",
    paragraphs: [
      "The Service, including all software, features, content, designs, trademarks, and documentation, is the exclusive intellectual property of WiserShifts and its licensors. Nothing in this Agreement transfers any intellectual property rights to you.",
      "You may not copy, modify, distribute, sell, or lease any part of the Service, nor may you reverse engineer or attempt to extract the source code, unless expressly permitted in writing by WiserShifts.",
    ],
  },
  {
    title: "8. Third-Party Integrations",
    paragraphs: [
      "The Service may integrate with or link to third-party services (e.g., payroll providers, HR platforms, calendar tools). WiserShifts is not responsible for the availability, accuracy, or practices of any third-party services. Your use of such services is subject to their respective terms and privacy policies.",
    ],
  },
  {
    title: "9. Uptime and Service Availability",
    paragraphs: [
      "WiserShifts strives to maintain high availability of the Service but does not guarantee uninterrupted access. Planned maintenance windows will be communicated in advance where reasonably practicable. WiserShifts shall not be liable for any losses arising from downtime, interruptions, or service degradation.",
    ],
  },
  {
    title: "10. Disclaimer of Warranties",
    paragraphs: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WISERSHIFTS DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
    ],
  },
  {
    title: "11. Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WISERSHIFTS AND ITS DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.",
      "IN NO EVENT SHALL WISERSHIFTS' TOTAL CUMULATIVE LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO WISERSHIFTS IN THE THREE (3) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USD $100).",
    ],
  },
  {
    title: "12. Indemnification",
    paragraphs: [
      "You agree to indemnify, defend, and hold harmless WiserShifts and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Service; (b) your violation of this Agreement; or (c) your violation of any rights of a third party.",
    ],
  },
  {
    title: "13. Term and Termination",
    paragraphs: [
      "This Agreement remains in effect for the duration of your subscription. Either party may terminate this Agreement:",
    ],
    bullets: [
      "With 30 days' written notice for any reason",
      "Immediately, if the other party materially breaches this Agreement and fails to cure within 10 business days of written notice",
      "Immediately, if you violate the Acceptable Use Policy",
    ],
    tailParagraphs: [
      "Upon termination, your right to access the Service ceases immediately, and the provisions of this Agreement that by their nature should survive will continue in full force and effect.",
    ],
  },
  {
    title: "14. Modifications to Terms",
    paragraphs: [
      "WiserShifts reserves the right to update or modify these Terms and Conditions at any time. We will provide notice of material changes via email or through the Service at least 14 days prior to the changes taking effect. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised terms.",
    ],
  },
  {
    title: "15. Governing Law and Dispute Resolution",
    paragraphs: [
      "This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which WiserShifts is incorporated, without regard to its conflict of law provisions.",
      "Any dispute arising out of or relating to this Agreement shall first be submitted to informal negotiation. If unresolved within 30 days, disputes shall be resolved through binding arbitration in accordance with the applicable arbitration rules, unless either party seeks emergency equitable relief in a court of competent jurisdiction.",
    ],
  },
  {
    title: "16. Miscellaneous",
    subSections: [
      {
        title: "16.1 Entire Agreement",
        paragraphs: [
          "This Agreement, together with our Privacy Policy and any applicable Order Form, constitutes the entire agreement between you and WiserShifts regarding the Service.",
        ],
      },
      {
        title: "16.2 Severability",
        paragraphs: [
          "If any provision of this Agreement is found to be unenforceable, the remaining provisions will continue in full force and effect.",
        ],
      },
      {
        title: "16.3 Waiver",
        paragraphs: [
          "Failure by WiserShifts to enforce any right or provision of this Agreement does not constitute a waiver of that right or provision.",
        ],
      },
      {
        title: "16.4 Assignment",
        paragraphs: [
          "You may not assign or transfer your rights under this Agreement without WiserShifts' prior written consent. WiserShifts may assign its rights and obligations without restriction.",
        ],
      },
      {
        title: "16.5 Force Majeure",
        paragraphs: [
          "WiserShifts shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including natural disasters, government actions, or Internet disruptions.",
        ],
      },
    ],
  },
  {
    title: "17. Contact Information",
    paragraphs: [
      "If you have any questions about these Terms and Conditions, please contact us:",
    ],
    contactLines: [
      "WiserShifts",
      "Email: info@wisershifts.com",
      "Website: https://wisershifts.com",
    ],
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
