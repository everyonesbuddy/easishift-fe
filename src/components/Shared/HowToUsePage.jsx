import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from "@mui/material";

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

function DetailedSection({ section, tone }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderLeft: `5px solid ${tone}`,
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
        height: "100%",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {section.title}
      </Typography>
      <Typography sx={{ color: "#4b5563", mb: 1.5, lineHeight: 1.65 }}>
        {section.purpose}
      </Typography>
      <List sx={{ p: 0 }}>
        {section.steps.map((step, index) => (
          <ListItem
            key={step}
            sx={{ px: 0, py: 0.65, alignItems: "flex-start" }}
          >
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    size="small"
                    label={`Step ${index + 1}`}
                    sx={{
                      bgcolor: "#f3f4f6",
                      color: "#111827",
                      fontWeight: 700,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Typography sx={{ color: "#1f2937", lineHeight: 1.6 }}>
                    {step}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

function SimpleListCard({ title, items }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 3,
        p: { xs: 2, md: 3 },
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <List sx={{ p: 0 }}>
        {items.map((item, index) => (
          <ListItem
            key={item}
            sx={{ px: 0, py: 0.65, alignItems: "flex-start" }}
          >
            <ListItemText
              primary={`${index + 1}. ${item}`}
              primaryTypographyProps={{
                sx: { color: "#374151", lineHeight: 1.6 },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default function HowToUsePage() {
  const [activeRole, setActiveRole] = useState("admin");

  const guide = useMemo(() => GUIDE_DATA[activeRole], [activeRole]);

  const handleRoleChange = (_, nextRole) => {
    if (nextRole) {
      setActiveRole(nextRole);
    }
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
        maxWidth: 1280,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        How to Use WiserShifts
      </Typography>
      <Typography sx={{ color: "#4b5563", mb: 3, lineHeight: 1.7 }}>
        Use this training page for detailed, role-based instructions. Switch
        between Admin and Non-Admin Staff guides to see workflows, daily
        priorities, and common mistakes.
      </Typography>

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
        <List sx={{ p: 0 }}>
          {guide.gettingStarted.map((item, index) => (
            <ListItem key={item} sx={{ px: 0, py: 0.65 }}>
              <ListItemText
                primary={`${index + 1}. ${item}`}
                primaryTypographyProps={{
                  sx: { color: "#374151", lineHeight: 1.6 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Grid container spacing={2.5}>
        {guide.sections.map((section) => (
          <Grid key={section.title} item xs={12} md={6}>
            <DetailedSection section={section} tone={guide.tone} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <SimpleListCard
            title={`${guide.label} Daily Checklist`}
            items={guide.dailyChecklist}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <SimpleListCard
            title="Common Mistakes to Avoid"
            items={guide.commonMistakes}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
