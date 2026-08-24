import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SearchIcon from "@mui/icons-material/Search";

const STAFF_MANAGEMENT_VIDEO_URL =
  "https://youtu.be/GEzs9F-LysY?si=GRCGmE4iVgU88Zkj";
const FACILITY_PREFERENCES_VIDEO_URL =
  "https://youtu.be/fI3JscDuFkk?si=AR-_eefXMBQ6UKH3";
const COVERAGE_SAVE_REQUIREMENTS_VIDEO_URL =
  "https://youtu.be/-7mv6I-eqG0?si=R5HL90-Jbcm8Daol";
const COVERAGE_AI_DRAFT_VIDEO_URL =
  "https://youtu.be/qJpZoB-dL7A?si=y3DR44Q0fzPw5MUs";
const SCHEDULE_AI_GENERATED_VIDEO_URL =
  "https://youtu.be/r8kQbvdqWpA?si=FkDBEtKcx3tyJuCd";

const TRACKS = [
  { id: "all", label: "All workflows", tone: "#0f172a" },
  { id: "setup", label: "Set up workspace", tone: "#1d4ed8" },
  { id: "people", label: "Manage people", tone: "#2563eb" },
  { id: "coverage", label: "Plan coverage", tone: "#2563eb" },
  { id: "schedule", label: "Build schedules", tone: "#2563eb" },
  { id: "personal", label: "Use my schedule", tone: "#2563eb" },
];

const ROLE_EXAMPLES = [
  {
    roles: "Staff + facility-defined role",
    access: "Personal schedule, time off, messages, swaps, preferences",
    scheduling: "Can be assigned to shifts that match the facility role",
  },
  {
    roles: "Scheduler + facility-defined role",
    access: "Schedule and coverage tools plus personal staff workflows",
    scheduling: "Can build schedules and still be assigned to matching shifts",
  },
  {
    roles: "Admin + facility-defined role",
    access: "Staff, coverage, facility operations, and personal workflows",
    scheduling: "Can manage staff and still be assigned to matching shifts",
  },
  {
    roles: "Owner",
    access: "Billing, tenant settings, staff and operational controls",
    scheduling: "Not schedulable unless a facility/job role is also added",
  },
];

const TRAINING_MODULES = [
  {
    id: "roles-permissions",
    track: "setup",
    title: "Roles, Permissions, and Scheduling Identity",
    audience: "Owners, admins, schedulers, and anyone configuring staff access",
    access: "roles.manage or staff.manage",
    summary:
      "Understand the difference between what someone can do in the app and what work they can be scheduled for.",
    steps: [
      "Use system roles for app access: Staff, Scheduler, Admin, and Owner.",
      "Use facility/job roles for scheduling identity. These can be any roles your facility defines, such as clinical, care, administrative, or support roles.",
      "Give hybrid users both sides when needed, such as Scheduler plus a facility-defined role.",
      "Avoid making a person Admin just so they can be scheduled. Add the correct facility/job role instead.",
      "Review the examples table below when assigning access to a new staff member.",
    ],
  },
  {
    id: "facility-preferences",
    track: "setup",
    title: "Configure Facility Preferences",
    audience: "Owners and admins maintaining facility structure",
    access: "facility_preferences.manage",
    summary:
      "Set the taxonomy used by staff profiles, coverage requirements, and schedule matching.",
    videos: [
      {
        label: "Facility Preferences walkthrough",
        url: FACILITY_PREFERENCES_VIDEO_URL,
        description:
          "Configure roles, areas, shift types, certifications, and scheduling rules.",
      },
    ],
    steps: [
      "Create role families that match real scheduling groups at your facility.",
      "Add unit areas and certification tags before assigning them to staff or coverage.",
      "Configure shift types and time slots so coverage requirements use consistent windows.",
      "Update preferences before a new scheduling cycle, not in the middle of a publish review.",
    ],
  },
  {
    id: "staff-management",
    track: "people",
    title: "Manage Staff Profiles",
    audience: "Owners, admins, and staff managers",
    access: "staff.manage",
    summary:
      "Create, edit, filter, import, and maintain staff profiles used throughout scheduling.",
    videos: [
      {
        label: "Staff Management walkthrough",
        url: STAFF_MANAGEMENT_VIDEO_URL,
        description:
          "Add, edit, filter, import, and review staff profiles with role details.",
      },
    ],
    steps: [
      "Use filters to find people by name, status, role, unit, or scheduling attributes.",
      "Assign system access only when the person needs app-level controls.",
      "Assign facility/job roles, unit areas, shift tags, and certifications for schedulable work.",
      "Use bulk import for onboarding waves, then spot-check role and email fields.",
      "Use resend password reset link when someone needs a fresh setup email.",
    ],
  },
  {
    id: "coverage-planning",
    track: "coverage",
    title: "Create Coverage Requirements",
    audience: "Schedulers, admins, and coverage planners",
    access: "coverage.manage",
    summary:
      "Define staffing demand by date, slot, role, area, certification, and required headcount.",
    videos: [
      {
        label: "Create and save requirements",
        url: COVERAGE_SAVE_REQUIREMENTS_VIDEO_URL,
        description:
          "Create coverage requirements without generating a draft schedule.",
      },
      {
        label: "Create and AI-generate a draft",
        url: COVERAGE_AI_DRAFT_VIDEO_URL,
        description:
          "Create coverage and immediately generate a draft schedule with AI.",
      },
    ],
    steps: [
      "Use calendar view for time-based planning and list view for fast review.",
      "Choose a role, date range, time slot, and required count for each requirement.",
      "Add unit area, shift type, shift tag, and certifications when they matter for matching.",
      "Save the requirement only when you are still planning demand.",
      "Save and generate a draft when the requirement is ready for assignment review.",
      "Edit headcount when demand changes; metadata may lock after draft or schedule links exist.",
    ],
  },
  {
    id: "schedule-builder",
    track: "schedule",
    title: "Build, Review, and Publish Schedules",
    audience: "Schedulers and admins responsible for published schedules",
    access: "schedule.manage",
    summary:
      "Create manual shifts, generate drafts from coverage, review warnings, and publish final schedules.",
    videos: [
      {
        label: "AI-generated schedule walkthrough",
        url: SCHEDULE_AI_GENERATED_VIDEO_URL,
        description:
          "Review AI-generated draft schedules before publishing them.",
      },
    ],
    steps: [
      "Create single shifts manually for urgent edits or one-off coverage needs.",
      "Generate drafts from selected open coverage records when planning a broader schedule.",
      "Compare live schedules, open coverage, and draft assignments before publishing.",
      "Use Fill with AI on an unfilled draft slot when one assignment needs another attempt.",
      "Review overtime, consecutive-day, certification, unit, and role compatibility warnings.",
      "Publish selected items or publish all only after review counts look right.",
    ],
  },
  {
    id: "time-off-decisions",
    track: "schedule",
    title: "Review Time Off Requests",
    audience: "Schedulers, admins, and time-off reviewers",
    access: "timeoff.review",
    summary:
      "Approve or deny requests with schedule impact in mind so staffing remains stable.",
    steps: [
      "Check pending requests before schedule review or shift handover.",
      "Compare request timing against coverage and published shifts.",
      "Approve when coverage remains stable or can be adjusted safely.",
      "Deny with clear reason when approval would create unacceptable staffing risk.",
      "After decisions, review open coverage and schedule gaps again.",
    ],
  },
  {
    id: "personal-schedule",
    track: "personal",
    title: "Use My Schedule",
    audience: "Staff members and hybrid users with assigned shifts",
    access: "schedule.view_own or a schedulable facility/job role",
    summary:
      "Review assigned shifts, check changes, and act early when conflicts appear.",
    steps: [
      "Open Overview to check today's shifts and upcoming assignments.",
      "Open My Schedule to review dates, times, assigned role, and location details.",
      "If a conflict appears, start a swap request or submit time off as soon as possible.",
      "Message a manager when a shift detail looks incorrect.",
      "Recheck the dashboard after new schedules are published.",
    ],
  },
  {
    id: "swaps-time-off",
    track: "personal",
    title: "Request Swaps and Time Off",
    audience: "Staff members, schedulable managers, and hybrid users",
    access: "schedule.view_own and timeoff.request",
    summary:
      "Handle unavoidable conflicts while keeping managers and teammates informed.",
    steps: [
      "Create swap requests from the assigned shift that needs coverage.",
      "Respond to incoming swap requests promptly so teammates are not left waiting.",
      "Submit time off with exact start and end date-time values.",
      "Track request status as pending, approved, or denied.",
      "Keep preferences current so future schedules reflect better availability signals.",
    ],
  },
  {
    id: "messages-billing",
    track: "people",
    title: "Messages, Account Health, and Daily Checks",
    audience:
      "Everyone, with billing visible only to billing managers or owners",
    access: "messages plus billing.manage for subscription controls",
    summary:
      "Keep communication clear and make sure account status does not interrupt operations.",
    steps: [
      "Check unread conversations at the beginning and end of each workday.",
      "Use specific subjects and shift details when messaging about schedule changes.",
      "Owners should review billing status before renewal or payment changes.",
      "After billing updates, confirm operational features are available again.",
      "Use the dashboard as the daily home base for urgent items and next actions.",
    ],
  },
];

const DAILY_CHECKS = [
  "Open Overview and handle urgent alerts first.",
  "Review open coverage, pending requests, and draft schedules before publishing.",
  "Check messages tied to staffing changes or conflicts.",
  "Confirm personal shifts if you are also schedulable.",
  "Keep roles, preferences, and staff profile details current.",
];

const COMMON_MISTAKES = [
  "Using system roles when the person only needs to be scheduled for a job role.",
  "Building coverage before facility preferences are configured.",
  "Publishing generated schedules without reviewing warnings.",
  "Leaving time-off decisions pending until after schedule changes become urgent.",
  "Forgetting that hybrid users may need both management permissions and personal schedule access.",
];

const getModuleVideos = (module) => module.videos || [];

const getPanelId = (module) => `panel-${module.id}`;

const normalizeText = (value) => String(value || "").toLowerCase();

function moduleMatchesQuery(module, query) {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return true;

  return [
    module.title,
    module.audience,
    module.access,
    module.summary,
    ...module.steps,
    ...getModuleVideos(module).map((video) => video.label),
  ]
    .map(normalizeText)
    .some((value) => value.includes(normalizedQuery));
}

function HeroBanner({ selectedTrack, onSelectTrack, moduleCount, videoCount }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: { xs: 2.25, md: 3 },
        borderRadius: 2,
        border: "1px solid #E2E8F0",
        bgcolor: "#ffffff",
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2.5}
          justifyContent="space-between"
        >
          <Box sx={{ maxWidth: 780 }}>
            <Chip
              label="Help & Training"
              size="small"
              sx={{ mb: 1.25, fontWeight: 800, bgcolor: "#ffffff" }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                fontSize: { xs: "1.75rem", md: "2.25rem" },
                lineHeight: 1.1,
                mb: 1,
              }}
            >
              How To Use WiserShifts
            </Typography>
            <Typography sx={{ color: "#334155", lineHeight: 1.7 }}>
              Find practical guidance for the work you do in WiserShifts. Use
              the workflow filters or search by feature, role, or permission.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px solid #E2E8F0",
              bgcolor: "#F8FAFC",
              minWidth: { md: 300 },
            }}
          >
            <Typography sx={{ fontWeight: 900, color: "#0f172a", mb: 1 }}>
              What this page covers
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${moduleCount} modules`} size="small" />
              <Chip label={`${videoCount} videos`} size="small" />
              <Chip label="Permissions" size="small" />
              <Chip label="Daily checks" size="small" />
            </Stack>
            <Typography sx={{ color: "#475569", lineHeight: 1.55, mt: 1.5 }}>
              One person can have multiple permissions and facility roles. The
              modules below explain each workflow separately.
            </Typography>
          </Paper>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {TRACKS.map((track) => {
            const selected = selectedTrack === track.id;

            return (
              <Button
                key={track.id}
                variant={selected ? "contained" : "outlined"}
                onClick={() => onSelectTrack(track.id)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 900,
                  px: 1.6,
                  ...(selected
                    ? {
                        bgcolor: "#2563EB",
                        color: "#ffffff",
                        "&:hover": { bgcolor: "#1D4ED8" },
                      }
                    : {
                        borderColor: "#cbd5e1",
                        color: "#1f2937",
                        bgcolor: "#ffffff",
                      }),
                }}
              >
                {track.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}

function RolesPermissionsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid #dbeafe",
        borderRadius: 2,
        mb: 3,
        bgcolor: "#ffffff",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: { xs: 2, md: 2.5 } }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.5, sm: 1.5 }}
        >
          <Chip
            label="Before you begin"
            size="small"
            sx={{
              fontWeight: 900,
              bgcolor: "#eff6ff",
              color: "#1d4ed8",
              alignSelf: "flex-start",
            }}
          />
          <Typography
            sx={{
              fontWeight: 900,
              color: "#0f172a",
              fontSize: "1.08rem",
              mt: { xs: 0.25, sm: 0.35 },
            }}
          >
            How roles and permissions work
          </Typography>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 2, md: 2.5 }, pt: 0 }}>
        <Stack spacing={2.25}>
          <Typography
            sx={{ color: "#475569", lineHeight: 1.65, maxWidth: 980 }}
          >
            Permissions control which features someone can use. Facility/job
            roles control which shifts they can be assigned to. A person can
            have both, such as Scheduler plus a facility-defined role.
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: "100%",
                  p: 1.75,
                  borderRadius: 1.5,
                  border: "1px solid #bfdbfe",
                  bgcolor: "#eff6ff",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#1e3a8a", mb: 0.5 }}>
                  System permissions
                </Typography>
                <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
                  These control app access: schedule management, coverage
                  planning, staff management, billing, facility settings,
                  password reset, time-off review, and tenant controls.
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.8}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 1.25 }}
                >
                  {["Staff", "Scheduler", "Admin", "Owner"].map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: "100%",
                  p: 1.75,
                  borderRadius: 1.5,
                  border: "1px solid #bfdbfe",
                  bgcolor: "#eff6ff",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#1e3a8a", mb: 0.5 }}>
                  Facility/job roles
                </Typography>
                <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
                  These control scheduling identity. Your facility defines the
                  available role families, so they can match your own clinical,
                  care, administrative, or support structure.
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.8}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 1.25 }}
                >
                  {[
                    "Your facility roles",
                    "Clinical roles",
                    "Support roles",
                  ].map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: 1.5,
              overflow: "hidden",
              bgcolor: "#ffffff",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.2fr 1.6fr 1.6fr" },
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                px: 1.5,
                py: 1,
                gap: 1,
              }}
            >
              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                Role setup
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                What they can access
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                How scheduling treats them
              </Typography>
            </Box>

            {ROLE_EXAMPLES.map((item) => (
              <Box
                key={item.roles}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1.2fr 1.6fr 1.6fr" },
                  px: 1.5,
                  py: 1.2,
                  gap: 1,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: "#1f2937" }}>
                  {item.roles}
                </Typography>
                <Typography sx={{ color: "#475569", lineHeight: 1.55 }}>
                  {item.access}
                </Typography>
                <Typography sx={{ color: "#475569", lineHeight: 1.55 }}>
                  {item.scheduling}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "#fffbeb",
              border: "1px solid #fde68a",
            }}
          >
            <Typography sx={{ color: "#78350f", lineHeight: 1.6 }}>
              Rule of thumb: permissions decide what appears in the app;
              facility roles decide whether someone can be assigned to a shift.
            </Typography>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function SummaryCard({ title, items }) {
  return (
    <Paper
      elevation={0}
      sx={{ border: "1px solid #E2E8F0", borderRadius: 2, p: 2 }}
    >
      <Typography sx={{ fontWeight: 900, color: "#0f172a", mb: 1 }}>
        {title}
      </Typography>
      <List sx={{ p: 0 }}>
        {items.map((item) => (
          <ListItem
            key={item}
            sx={{ px: 0, py: 0.55, alignItems: "flex-start" }}
          >
            <CheckCircleOutlineIcon
              sx={{ color: "#16a34a", fontSize: 18, mr: 1, mt: 0.25 }}
            />
            <ListItemText
              primary={item}
              primaryTypographyProps={{
                sx: { color: "#374151", lineHeight: 1.55, fontSize: "0.93rem" },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

function LearningSidebar({ moduleItems, expandedPanel, setExpandedPanel }) {
  return (
    <Stack spacing={2} sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
      <Paper
        elevation={0}
        sx={{ border: "1px solid #E2E8F0", borderRadius: 2, p: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <MenuBookIcon sx={{ color: "#1d4ed8" }} />
          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
            Learning Path
          </Typography>
        </Stack>
        <Typography sx={{ color: "#64748b", mb: 1.5, lineHeight: 1.55 }}>
          Jump to a workflow module, then follow the steps on the right.
        </Typography>
        <Stack spacing={0.8}>
          {moduleItems.map((module) => {
            const panelId = getPanelId(module);
            const videos = getModuleVideos(module);

            return (
              <Button
                key={module.id}
                variant={expandedPanel === panelId ? "contained" : "outlined"}
                onClick={() => setExpandedPanel(panelId)}
                sx={{
                  justifyContent: "space-between",
                  textAlign: "left",
                  textTransform: "none",
                  borderRadius: 1.5,
                  fontWeight: 800,
                  px: 1.25,
                  py: 0.85,
                  gap: 1,
                  ...(expandedPanel === panelId
                    ? { bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }
                    : { borderColor: "#cbd5e1", color: "#1f2937" }),
                }}
              >
                <Box component="span">{module.title}</Box>
                {videos.length > 0 && (
                  <PlayCircleOutlineIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                )}
              </Button>
            );
          })}
        </Stack>
      </Paper>

      <SummaryCard title="Daily Operating Checks" items={DAILY_CHECKS} />
      <SummaryCard title="Common Mistakes to Avoid" items={COMMON_MISTAKES} />
    </Stack>
  );
}

function ModuleVideoCallout({ videos }) {
  if (!videos.length) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 1.5,
        p: 1.5,
        borderRadius: 1.5,
        border: "1px solid #bfdbfe",
        bgcolor: "#eff6ff",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box sx={{ display: "flex", gap: 1.25 }}>
          <PlayCircleOutlineIcon sx={{ color: "#1d4ed8", mt: 0.2 }} />
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
              Video guide{videos.length > 1 ? "s" : ""}
            </Typography>
            <Typography sx={{ color: "#475569", lineHeight: 1.55 }}>
              {videos.length > 1
                ? "Choose the walkthrough that matches your workflow."
                : videos[0].description}
            </Typography>
          </Box>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
        >
          {videos.map((video) => (
            <Button
              key={video.url}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon fontSize="small" />}
              sx={{
                borderColor: "#1d4ed8",
                color: "#1d4ed8",
                fontWeight: 900,
                textTransform: "none",
                whiteSpace: "nowrap",
                bgcolor: "#ffffff",
                "&:hover": {
                  borderColor: "#1d4ed8",
                  bgcolor: "#ffffff",
                },
              }}
            >
              {video.label}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function ModuleAccordion({ module, expandedPanel, onExpand }) {
  const panelId = getPanelId(module);
  const videos = getModuleVideos(module);
  const track = TRACKS.find((item) => item.id === module.track);

  return (
    <Accordion
      expanded={expandedPanel === panelId}
      onChange={onExpand(panelId)}
      disableGutters
      elevation={0}
      sx={{
        mb: 1.25,
        border: "1px solid #e5e7eb",
        borderRadius: "8px !important",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack spacing={0.7} sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label={track?.label || "Workflow"}
              size="small"
              sx={{
                fontWeight: 900,
                bgcolor: "#f8fafc",
                color: "#2563EB",
              }}
            />
            {videos.length > 0 && (
              <Chip
                size="small"
                icon={<PlayCircleOutlineIcon />}
                label={`${videos.length} video${videos.length === 1 ? "" : "s"}`}
                sx={{ fontWeight: 800, bgcolor: "#EFF6FF", color: "#1D4ED8" }}
              />
            )}
          </Stack>
          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
            {module.title}
          </Typography>
          <Typography sx={{ color: "#64748b", lineHeight: 1.5 }}>
            {module.summary}
          </Typography>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0.5 }}>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 1.5 }}
        >
          <Chip label={module.audience} size="small" sx={{ fontWeight: 800 }} />
          <Chip
            label={`Access: ${module.access}`}
            size="small"
            sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}
          />
        </Stack>

        <ModuleVideoCallout videos={videos} />

        <List sx={{ p: 0 }}>
          {module.steps.map((step, stepIndex) => (
            <ListItem
              key={step}
              sx={{ px: 0, py: 0.8, alignItems: "flex-start", gap: 1.2 }}
            >
              <Chip
                label={stepIndex + 1}
                size="small"
                sx={{
                  bgcolor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  fontWeight: 900,
                  minWidth: 28,
                  mt: 0.1,
                }}
              />
              <ListItemText
                primary={step}
                primaryTypographyProps={{
                  sx: { color: "#1f2937", lineHeight: 1.65 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

export default function HowToUsePage() {
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [expandedPanel, setExpandedPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const moduleItems = useMemo(
    () =>
      TRAINING_MODULES.filter(
        (module) =>
          (selectedTrack === "all" || module.track === selectedTrack) &&
          moduleMatchesQuery(module, searchTerm),
      ),
    [selectedTrack, searchTerm],
  );

  const videoCount = useMemo(
    () =>
      TRAINING_MODULES.reduce(
        (count, module) => count + getModuleVideos(module).length,
        0,
      ),
    [],
  );

  const handleSelectTrack = (trackId) => {
    const firstModule = TRAINING_MODULES.find(
      (module) => trackId === "all" || module.track === trackId,
    );

    setSelectedTrack(trackId);
    setExpandedPanel(firstModule ? getPanelId(firstModule) : false);
  };

  const handleExpand = (panel) => (_, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
        maxWidth: 1320,
        mx: "auto",
        bgcolor: "#f8fafc",
        minHeight: "100%",
      }}
    >
      <HeroBanner
        selectedTrack={selectedTrack}
        onSelectTrack={handleSelectTrack}
        moduleCount={TRAINING_MODULES.length}
        videoCount={videoCount}
      />

      <RolesPermissionsPanel />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4} lg={3.6}>
          <LearningSidebar
            moduleItems={moduleItems}
            expandedPanel={expandedPanel}
            setExpandedPanel={setExpandedPanel}
          />
        </Grid>

        <Grid item xs={12} md={8} lg={8.4}>
          <Paper
            elevation={0}
            sx={{ border: "1px solid #E2E8F0", borderRadius: 2, p: 2 }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                  Workflow Modules
                </Typography>
                <Typography sx={{ color: "#64748b", lineHeight: 1.55 }}>
                  Search by task, permission, role, or feature name.
                </Typography>
              </Box>
              <TextField
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search workflows..."
                size="small"
                sx={{ minWidth: { md: 280 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            {moduleItems.length === 0 ? (
              <Paper
                elevation={0}
                sx={{ p: 3, border: "1px dashed #cbd5e1", borderRadius: 2 }}
              >
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  No workflows found
                </Typography>
                <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                  Try another search term or choose All workflows.
                </Typography>
              </Paper>
            ) : (
              moduleItems.map((module) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  expandedPanel={expandedPanel}
                  onExpand={handleExpand}
                />
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #BFDBFE",
          bgcolor: "#EFF6FF",
          color: "#1E3A8A",
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Training Tip</Typography>
        <Typography sx={{ lineHeight: 1.65 }}>
          For onboarding, start with the workflow closest to the person's first
          responsibility. Hybrid users should complete both their management
          workflow and their personal schedule workflow.
        </Typography>
      </Paper>
    </Box>
  );
}
