import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const GUIDE_DATA = {
  admin: {
    label: "Admin",
    tone: "#1d4ed8",
    audience:
      "For administrators responsible for staffing strategy, schedules, approvals, communication, and billing.",
    gettingStarted: [
      "Log in and open Overview to confirm you are in the correct tenant workspace.",
      "Open Facility Preferences and verify role families, unit areas, shift types, shift definitions, and certification tags.",
      "Check Staff Management to confirm active staff profiles are complete and current.",
      "Open Coverage Planning and validate upcoming required staffing levels.",
    ],
    sections: [
      {
        title: "1. Dashboard and Alerts",
        purpose:
          "Use the dashboard as your control center for daily operational awareness.",
        steps: [
          "Review KPI cards first: staffing totals, pending decisions, unread messages, and upcoming shifts.",
          "Review chart trends to spot under-coverage risk before it becomes a scheduling issue.",
          "Use quick actions for common tasks such as creating staff, sending a message, and building schedules.",
          "Revisit Overview after approvals or publishing to confirm metrics updated as expected.",
        ],
      },
      {
        title: "2. Facility Preferences and Taxonomy",
        purpose:
          "Maintain one source of truth for role and shift structure used across the app.",
        steps: [
          "Define role families and unit areas based on your facility's operational model.",
          "Create shift types and slot definitions that match real staffing windows.",
          "Add certification tags for compliance-sensitive assignments.",
          "Update taxonomy before schedule cycles so coverage and assignment rules remain consistent.",
        ],
      },
      {
        title: "3. Staff Management",
        purpose:
          "Keep accurate staff records to improve scheduling quality and reduce manual corrections.",
        steps: [
          "Use search and role filters to quickly locate profiles.",
          "Create or edit staff records with capability fields like allowed areas, shift tags, and certifications.",
          "Use CSV bulk import for onboarding waves and seasonal hiring periods.",
          "Regularly clean up inactive records to avoid accidental assignments.",
        ],
      },
      {
        title: "4. Coverage Planning",
        purpose:
          "Define staffing demand accurately so schedules can be built against real requirements.",
        steps: [
          "Use list view for quick updates and calendar view for time-based validation.",
          "For each coverage item, set role, date range, shift slot, and required headcount.",
          "Add unit area, shift type, shift tag, and certification requirements where needed.",
          "Adjust headcount quickly when census or acuity changes.",
        ],
      },
      {
        title: "5. Schedule Builder and Draft Workflow",
        purpose:
          "Publish safer, higher-quality schedules through review-first drafting.",
        steps: [
          "Create single shifts manually for urgent edits or one-off assignments.",
          "Use auto-generate to produce draft schedules from selected open coverage records.",
          "Review each assignment for overtime warnings, consecutive day risks, and role compatibility.",
          "Edit draft assignments as needed, then publish selected items or publish all.",
        ],
      },
      {
        title: "6. Time Off Decisions",
        purpose:
          "Resolve requests quickly to keep schedules stable and predictable.",
        steps: [
          "Open pending requests at least once per shift handover.",
          "Approve or deny based on staffing impact and policy.",
          "After decisions, review open coverage and adjust schedule where needed.",
          "Use My Time Off Requests for your own personal requests.",
        ],
      },
      {
        title: "7. Shift Swaps, Messages, and Billing",
        purpose:
          "Maintain communication and service continuity while keeping account status healthy.",
        steps: [
          "Monitor shift swap statuses and intervene when requests remain pending too long.",
          "Use Messages for urgent staffing coordination and tenant-wide updates.",
          "Visit Billing to maintain active subscription and avoid operational lockout.",
          "After billing updates, confirm full feature access is restored.",
        ],
      },
    ],
    dailyChecklist: [
      "Start with Overview and urgent alerts.",
      "Process Time Off Decisions.",
      "Review open coverage and adjust requirements.",
      "Finalize draft schedules and publish approved updates.",
      "Clear important messages and unresolved swaps.",
    ],
    commonMistakes: [
      "Skipping Facility Preferences before major scheduling cycles.",
      "Publishing drafts without reviewing warnings.",
      "Leaving pending time-off decisions unresolved for too long.",
      "Ignoring capability and certification fields in staff profiles.",
    ],
  },
  staff: {
    label: "Non-Admin Staff",
    tone: "#047857",
    audience:
      "For staff users managing personal schedules, swaps, time-off, messages, and preferences.",
    gettingStarted: [
      "Log in and open Overview to review your current day and upcoming shifts.",
      "Open My Schedule to confirm this week's assignments.",
      "Open Preferences and update preferred days and notifications.",
      "Open Messages to catch unread updates from managers or teammates.",
    ],
    sections: [
      {
        title: "1. Overview and Daily Readiness",
        purpose: "Start each shift day with a quick readiness check.",
        steps: [
          "Review upcoming shifts and any new alerts visible on your dashboard.",
          "Check for newly published schedule changes.",
          "If something conflicts, open shift swaps or submit time-off as needed.",
          "Return to Overview after taking actions to verify your day is clear.",
        ],
      },
      {
        title: "2. My Schedule",
        purpose: "Track assignments and stay aligned with published updates.",
        steps: [
          "Review date, start and end times, and assigned role details.",
          "Use schedule views regularly so late changes do not get missed.",
          "If you find a conflict, start a swap request immediately.",
          "If details look incorrect, message your manager from the Messages page.",
        ],
      },
      {
        title: "3. Shift Swaps",
        purpose: "Handle unavoidable conflicts without losing visibility.",
        steps: [
          "Open a swap request directly from your assigned shift.",
          "Choose a colleague and submit a clear, accurate request.",
          "Monitor Inbox for requests sent to you and respond promptly.",
          "Use Sent to track requests you created and cancel when no longer needed.",
        ],
      },
      {
        title: "4. My Time Off Requests",
        purpose:
          "Request planned leave and track approval status transparently.",
        steps: [
          "Create a request with exact start and end date-time values.",
          "Add a concise reason when useful for decision context.",
          "Track request status as pending, approved, or denied.",
          "Submit early when possible to increase approval success and reduce schedule disruption.",
        ],
      },
      {
        title: "5. Messages",
        purpose:
          "Communicate clearly about staffing, swaps, and schedule updates.",
        steps: [
          "Check unread conversations at the beginning and end of each workday.",
          "Reply in-thread to keep conversation history intact.",
          "Use concise message subjects so conversations are easy to find later.",
          "When urgent, message early and include specific shift details.",
        ],
      },
      {
        title: "6. Preferences",
        purpose:
          "Improve schedule fit by keeping your availability signals current.",
        steps: [
          "Set preferred work days and update them when your routine changes.",
          "Verify notification preferences so you do not miss updates.",
          "Review preferences at least once per month.",
          "Remember: updated preferences improve planning, but do not guarantee every request.",
        ],
      },
    ],
    dailyChecklist: [
      "Open Overview and verify upcoming shifts.",
      "Check My Schedule for newly published changes.",
      "Respond to swap requests in Inbox and Sent.",
      "Track pending time-off requests.",
      "Read and reply to important messages.",
    ],
    commonMistakes: [
      "Submitting swap requests too late.",
      "Not checking messages after schedule publishes.",
      "Entering incorrect date-times for time-off requests.",
      "Leaving preferences outdated for long periods.",
    ],
  },
};

function HeroBanner({ activeRole, guide }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: { xs: 2.25, md: 3 },
        borderRadius: 4,
        border: "1px solid #dbeafe",
        background:
          activeRole === "admin"
            ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
            : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        How to Use WiserShifts
      </Typography>
      <Typography sx={{ color: "#334155", lineHeight: 1.65, maxWidth: 900 }}>
        This page is designed as an interactive training center. Pick your role,
        follow the quick-start path, then work through each learning module.
        Everything is organized for fast scanning on mobile and desktop.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
        <Chip
          label={`${guide.sections.length} Training Modules`}
          sx={{
            fontWeight: 700,
            bgcolor: "#ffffff",
            border: "1px solid #bfdbfe",
          }}
        />
        <Chip
          label="Role-Specific Steps"
          sx={{
            fontWeight: 700,
            bgcolor: "#ffffff",
            border: "1px solid #bfdbfe",
          }}
        />
        <Chip
          label="Daily Checklist Included"
          sx={{
            fontWeight: 700,
            bgcolor: "#ffffff",
            border: "1px solid #bfdbfe",
          }}
        />
      </Stack>
    </Paper>
  );
}

function LearningSidebar({ guide, expandedPanel, setExpandedPanel }) {
  return (
    <Stack spacing={2} sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
      <Paper
        elevation={0}
        sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
          Learning Path
        </Typography>
        <Typography sx={{ color: "#475569", mb: 1.5, lineHeight: 1.6 }}>
          Use these shortcuts to jump to a module.
        </Typography>
        <Stack spacing={1}>
          {guide.sections.map((section, index) => (
            <Button
              key={section.title}
              variant={
                expandedPanel === `panel-${index}` ? "contained" : "outlined"
              }
              onClick={() => setExpandedPanel(`panel-${index}`)}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                px: 1.25,
                py: 0.8,
                ...(expandedPanel === `panel-${index}`
                  ? { bgcolor: guide.tone, "&:hover": { bgcolor: guide.tone } }
                  : { borderColor: "#cbd5e1", color: "#1f2937" }),
              }}
            >
              {section.title}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
          {guide.label} Daily Checklist
        </Typography>
        <List sx={{ p: 0 }}>
          {guide.dailyChecklist.map((item, index) => (
            <ListItem
              key={item}
              sx={{ px: 0, py: 0.5, alignItems: "flex-start" }}
            >
              <ListItemText
                primary={`${index + 1}. ${item}`}
                primaryTypographyProps={{
                  sx: { color: "#374151", lineHeight: 1.55 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper
        elevation={0}
        sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
          Common Mistakes to Avoid
        </Typography>
        <List sx={{ p: 0 }}>
          {guide.commonMistakes.map((item, index) => (
            <ListItem
              key={item}
              sx={{ px: 0, py: 0.5, alignItems: "flex-start" }}
            >
              <ListItemText
                primary={`${index + 1}. ${item}`}
                primaryTypographyProps={{
                  sx: { color: "#374151", lineHeight: 1.55 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );
}

export default function HowToUsePage() {
  const [activeRole, setActiveRole] = useState("admin");
  const [expandedPanel, setExpandedPanel] = useState("panel-0");

  const guide = useMemo(() => GUIDE_DATA[activeRole], [activeRole]);

  const handleRoleChange = (_, nextRole) => {
    if (nextRole) {
      setActiveRole(nextRole);
      setExpandedPanel("panel-0");
    }
  };

  const handleExpand = (panel) => (_, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
        maxWidth: 1280,
      }}
    >
      <HeroBanner activeRole={activeRole} guide={guide} />

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e5e7eb",
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Select Your Role
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={activeRole}
          onChange={handleRoleChange}
          sx={{
            mb: 2,
            flexWrap: "wrap",
            "& .MuiToggleButton-root": {
              textTransform: "none",
              px: 2,
              py: 0.9,
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="admin">Admin Instructions</ToggleButton>
          <ToggleButton value="staff">
            Non-Admin Staff Instructions
          </ToggleButton>
        </ToggleButtonGroup>

        <Alert
          severity="info"
          sx={{
            border: "1px solid #bfdbfe",
            bgcolor: "#eff6ff",
            color: "#1e3a8a",
            "& .MuiAlert-icon": { color: "#2563eb" },
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.25 }}>
            {guide.label} Guide
          </Typography>
          <Typography sx={{ lineHeight: 1.6 }}>{guide.audience}</Typography>
        </Alert>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e5e7eb",
          borderLeft: `5px solid ${guide.tone}`,
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
          First 10 Minutes: Quick Start
        </Typography>
        <Stack spacing={1.25}>
          {guide.gettingStarted.map((item, index) => (
            <Box
              key={item}
              sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}
            >
              <Chip
                label={index + 1}
                size="small"
                sx={{
                  mt: 0.3,
                  bgcolor: guide.tone,
                  color: "#ffffff",
                  fontWeight: 800,
                  minWidth: 28,
                }}
              />
              <Typography sx={{ color: "#374151", lineHeight: 1.65 }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <LearningSidebar
            guide={guide}
            expandedPanel={expandedPanel}
            setExpandedPanel={setExpandedPanel}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
              Training Modules
            </Typography>
            <Typography sx={{ color: "#4b5563", mb: 1.5, lineHeight: 1.6 }}>
              Expand each module for step-by-step instructions. The active
              module is highlighted in the learning path panel.
            </Typography>

            {guide.sections.map((section, index) => (
              <Accordion
                key={section.title}
                expanded={expandedPanel === `panel-${index}`}
                onChange={handleExpand(`panel-${index}`)}
                disableGutters
                elevation={0}
                sx={{
                  mb: 1.25,
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px !important",
                  overflow: "hidden",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                      {section.title}
                    </Typography>
                    <Typography sx={{ color: "#64748b", mt: 0.25 }}>
                      {section.purpose}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0.5 }}>
                  <List sx={{ p: 0 }}>
                    {section.steps.map((step, stepIndex) => (
                      <ListItem
                        key={step}
                        sx={{
                          px: 0,
                          py: 0.7,
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                      >
                        <Chip
                          label={`Step ${stepIndex + 1}`}
                          size="small"
                          sx={{
                            bgcolor: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            fontWeight: 700,
                            mt: 0.2,
                          }}
                        />
                        <ListItemText
                          primary={step}
                          primaryTypographyProps={{
                            sx: { color: "#1f2937", lineHeight: 1.6 },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Alert
        severity="success"
        sx={{
          border: "1px solid #86efac",
          bgcolor: "#f0fdf4",
          color: "#14532d",
          "& .MuiAlert-icon": { color: "#16a34a" },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.25 }}>Training Tip</Typography>
        <Typography sx={{ lineHeight: 1.6 }}>
          For onboarding sessions, walk through Quick Start first, then complete
          one module at a time using the Learning Path buttons. This improves
          retention and reduces overwhelm.
        </Typography>
      </Alert>
    </Box>
  );
}
