import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  GlobalStyles,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "react-toastify";

import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import {
  getCertificationTagDisplayName,
  getRoleDisplayName,
  isRoleCompatible,
  getShiftTagDisplayName,
  getShiftTypeDisplayName,
  getUnitAreaDisplayName,
} from "../../../constants/industryRoles";

const toastOptions = {
  position: "top-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const DRAFT_EDITABLE_STATES = new Set([
  "proposed",
  "locked",
  "removed",
  "unfilled",
]);

const DRAFT_STATE_META = {
  proposed: {
    label: "Proposed",
    eventBg: "#1e40af",
    eventBorder: "#1e3a8a",
    textColor: "#ffffff",
    subTextColor: "#dbeafe",
    accentTextColor: "#bfdbfe",
  },
  locked: {
    label: "Locked",
    eventBg: "#0f766e",
    eventBorder: "#115e59",
    textColor: "#ffffff",
    subTextColor: "#ccfbf1",
    accentTextColor: "#99f6e4",
  },
  removed: {
    label: "Removed",
    eventBg: "#f3f4f6",
    eventBorder: "#9ca3af",
    textColor: "#111827",
    subTextColor: "#374151",
    accentTextColor: "#4b5563",
  },
  unfilled: {
    label: "Unfilled",
    eventBg: "#ffedd5",
    eventBorder: "#fb923c",
    textColor: "#9a3412",
    subTextColor: "#c2410c",
    accentTextColor: "#9a3412",
  },
  published: {
    label: "Published",
    eventBg: "#15803d",
    eventBorder: "#15803d",
    textColor: "#ffffff",
    subTextColor: "#dcfce7",
    accentTextColor: "#bbf7d0",
  },
};

const OPEN_COVERAGE_META = {
  label: "Needs coverage",
  eventBg: "#fef3c7",
  eventBorder: "#f59e0b",
  textColor: "#7c2d12",
  subTextColor: "#9a3412",
};

const PAST_GAP_META = {
  label: "Past gap",
  eventBg: "#f3f4f6",
  eventBorder: "#9ca3af",
  textColor: "#374151",
  subTextColor: "#6b7280",
};

const COVERAGE_STATUS_META = {
  unfilled: {
    label: "Needs coverage",
    eventBg: "#ffedd5",
    eventBorder: "#fb923c",
    textColor: "#9a3412",
    subTextColor: "#c2410c",
  },
  partial: {
    label: "Partially filled",
    eventBg: "#fef3c7",
    eventBorder: "#f59e0b",
    textColor: "#92400e",
    subTextColor: "#b45309",
  },
  full: {
    label: "Fully filled",
    eventBg: "#dcfce7",
    eventBorder: "#22c55e",
    textColor: "#166534",
    subTextColor: "#15803d",
  },
  pastGap: PAST_GAP_META,
  pastCovered: {
    label: "Past covered",
    eventBg: "#e5e7eb",
    eventBorder: "#9ca3af",
    textColor: "#374151",
    subTextColor: "#6b7280",
  },
};

const LIVE_SCHEDULE_STATUS_META = {
  scheduled: {
    label: "Live schedule",
    eventBg: "#0f172a",
    eventBorder: "#020617",
    textColor: "#ffffff",
    subTextColor: "#cbd5e1",
    accentTextColor: "#94a3b8",
  },
  completed: {
    label: "Live schedule",
    eventBg: "#0f172a",
    eventBorder: "#020617",
    textColor: "#ffffff",
    subTextColor: "#cbd5e1",
    accentTextColor: "#94a3b8",
  },
  call_out: {
    label: "Call-out schedule",
    eventBg: "#b91c1c",
    eventBorder: "#7f1d1d",
    textColor: "#ffffff",
    subTextColor: "#fee2e2",
    accentTextColor: "#fecaca",
  },
};

const getLiveScheduleMeta = (status) =>
  LIVE_SCHEDULE_STATUS_META[String(status || "").toLowerCase()] || {
    label: "Live schedule",
    eventBg: "#334155",
    eventBorder: "#0f172a",
    textColor: "#ffffff",
    subTextColor: "#cbd5e1",
    accentTextColor: "#94a3b8",
  };

const getDraftStateMeta = (state) =>
  DRAFT_STATE_META[state] || {
    label: String(state || "Draft"),
    eventBg: "#334155",
    eventBorder: "#0f172a",
    textColor: "#ffffff",
    subTextColor: "#cbd5e1",
    accentTextColor: "#94a3b8",
  };

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCoverageId = (coverage) =>
  String(coverage?.coverageId || coverage?._id || "");

const getAssignmentCoverageId = (assignment) =>
  String(assignment?.coverageId?._id || assignment?.coverageId || "");

const formatDatePart = (value) => {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimePart = (value) => {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getLocalDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTimeWindow = (startTime, endTime) =>
  `${formatDatePart(startTime)} | ${formatTimePart(startTime)} - ${formatTimePart(endTime)}`;

const toDateTimeLocalInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoFromLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getAssignmentId = (assignment) =>
  String(assignment?.assignmentId || assignment?._id || "");

const getScopedAssignmentId = (draftId, assignmentId) =>
  `${String(draftId || "")}:${String(assignmentId || "")}`;

const splitScopedAssignmentId = (scopedId) => {
  const [draftId = "", ...assignmentParts] = String(scopedId || "").split(":");
  return {
    draftId,
    assignmentId: assignmentParts.join(":"),
  };
};

const normalizeTag = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNormalizedSet = (values) =>
  new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeTag(value))
      .filter(Boolean),
  );

const doesCoverageMatchStaffTags = (staff, coverage) => {
  const allowedAreas = toNormalizedSet(staff?.allowedAreas);
  const allowedShiftTypes = toNormalizedSet(staff?.allowedShiftTypes);
  const certificationTags = toNormalizedSet(staff?.certificationTags);

  const hasTagRestrictions =
    allowedAreas.size > 0 ||
    allowedShiftTypes.size > 0 ||
    certificationTags.size > 0;

  // Untagged staff are considered float staff for role-compatible coverage.
  if (!hasTagRestrictions) return true;

  if (allowedAreas.size > 0) {
    const coverageArea = normalizeTag(coverage?.unitArea);
    if (!coverageArea || !allowedAreas.has(coverageArea)) return false;
  }

  if (allowedShiftTypes.size > 0) {
    const coverageShiftType = normalizeTag(coverage?.shiftType);
    const coverageShiftTag = normalizeTag(coverage?.shiftTag);

    if (!coverageShiftType) return false;

    const exactShiftSlot = coverageShiftTag
      ? `${coverageShiftType}:${coverageShiftTag}`
      : "";

    const matchesByType = Array.from(allowedShiftTypes).some((allowed) =>
      allowed.startsWith(`${coverageShiftType}:`),
    );

    const isShiftMatch =
      (exactShiftSlot && allowedShiftTypes.has(exactShiftSlot)) ||
      allowedShiftTypes.has(coverageShiftType) ||
      (!coverageShiftTag && matchesByType);

    if (!isShiftMatch) return false;
  }

  if (certificationTags.size > 0) {
    const coverageCertTags = (
      Array.isArray(coverage?.requiredCertificationTags)
        ? coverage.requiredCertificationTags
        : []
    )
      .map((tag) => normalizeTag(tag))
      .filter(Boolean);

    const hasRequiredCerts = coverageCertTags.every((tag) =>
      certificationTags.has(tag),
    );

    if (!hasRequiredCerts) return false;
  }

  return true;
};

const isLiveScheduleMatchingCoverage = (schedule, coverage) => {
  if (!schedule || !coverage) return false;
  if (String(schedule.status || "").toLowerCase() === "call_out") return false;

  const scheduleStartMs = new Date(schedule.startTime).getTime();
  const scheduleEndMs = new Date(schedule.endTime).getTime();
  const coverageStartMs = new Date(coverage.startTime).getTime();
  const coverageEndMs = new Date(coverage.endTime).getTime();

  if (
    Number.isNaN(scheduleStartMs) ||
    Number.isNaN(scheduleEndMs) ||
    Number.isNaN(coverageStartMs) ||
    Number.isNaN(coverageEndMs)
  ) {
    return false;
  }

  if (scheduleStartMs !== coverageStartMs || scheduleEndMs !== coverageEndMs) {
    return false;
  }

  if (!isRoleCompatible(schedule.role, coverage.role)) {
    return false;
  }

  const coverageUnit = normalizeTag(coverage.unitArea);
  const scheduleUnit = normalizeTag(schedule.unitArea);
  if (coverageUnit && coverageUnit !== scheduleUnit) {
    return false;
  }

  const coverageShiftType = normalizeTag(coverage.shiftType);
  const scheduleShiftType = normalizeTag(schedule.shiftType);
  if (coverageShiftType && coverageShiftType !== scheduleShiftType) {
    return false;
  }

  const coverageShiftTag = normalizeTag(coverage.shiftTag);
  const scheduleShiftTag = normalizeTag(schedule.shiftTag);
  if (coverageShiftTag && coverageShiftTag !== scheduleShiftTag) {
    return false;
  }

  return true;
};

const buildCoverageSignature = (coverage) => {
  const startMs = new Date(
    coverage?.startTime || coverage?.windowStart,
  ).getTime();
  const endMs = new Date(coverage?.endTime || coverage?.windowEnd).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "";

  return [
    startMs,
    endMs,
    normalizeTag(coverage?.role),
    normalizeTag(coverage?.unitArea),
    normalizeTag(coverage?.shiftType),
    normalizeTag(coverage?.shiftTag),
  ].join("|");
};

const isPublishableState = (state) => ["proposed", "locked"].includes(state);

const getWarningChips = (assignment, thresholdHours) => {
  const warnings = assignment?.warnings || {};
  const chips = [];
  const projectedWeekMinutes = Number(warnings.projectedWeekMinutes) || 0;
  const thresholdMinutes = Number(thresholdHours || 40) * 60;
  const closeWindowMinutes = Math.max(0, thresholdMinutes - 4 * 60);

  if (projectedWeekMinutes >= thresholdMinutes) {
    chips.push({ key: "over40", label: "40h+ projected", color: "error" });
  } else if (projectedWeekMinutes >= closeWindowMinutes) {
    chips.push({ key: "near40", label: "Close to 40h", color: "warning" });
  }

  if (Number(warnings.overtimeMinutes) > 0) {
    chips.push({ key: "overtime", label: "Overtime risk", color: "warning" });
  }

  if (Number(warnings.consecutiveDaysIfAssigned) >= 5) {
    chips.push({ key: "streak", label: "Consecutive days", color: "warning" });
  }

  return chips;
};

export default function AutoGenerateScheduleForm({
  onSuccess,
  onClose,
  schedules = [],
  onOpenManualSchedule,
}) {
  useAuth();

  const [coverages, setCoverages] = useState([]);

  const [drafts, setDrafts] = useState([]);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [activeDraft, setActiveDraft] = useState(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [selectedDraftDetails, setSelectedDraftDetails] = useState([]);
  const [loadingSelectedDrafts, setLoadingSelectedDrafts] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingDraftDetail, setLoadingDraftDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [staffList, setStaffList] = useState([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState("");
  const [editingAssignmentDraftId, setEditingAssignmentDraftId] = useState("");
  const [draftViewMode, setDraftViewMode] = useState("calendar");
  const [editForm, setEditForm] = useState({
    staffId: "",
    startTime: "",
    endTime: "",
    notes: "",
    state: "proposed",
    force: false,
  });

  const staffById = useMemo(() => {
    const map = new Map();
    staffList.forEach((staff) => {
      if (staff?._id) {
        map.set(String(staff._id), staff);
      }
    });
    return map;
  }, [staffList]);

  const activeAssignments = useMemo(() => {
    const assignments = Array.isArray(activeDraft?.assignments)
      ? activeDraft.assignments
      : [];
    return [...assignments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [activeDraft]);

  const workspaceDraftDetails = useMemo(() => {
    if (selectedDraftDetails.length > 0) {
      return selectedDraftDetails;
    }

    if (activeDraft?._id) {
      return [{ draftId: String(activeDraft._id), draft: activeDraft }];
    }

    return [];
  }, [activeDraft, selectedDraftDetails]);

  const workspaceAssignments = useMemo(() => {
    const assignments = workspaceDraftDetails.flatMap(({ draft, draftId }) =>
      (Array.isArray(draft?.assignments) ? draft.assignments : []).map(
        (assignment) => ({
          ...assignment,
          __workspaceDraftId: String(draftId || ""),
        }),
      ),
    );

    return [...assignments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [workspaceDraftDetails]);

  const selectedDrafts = useMemo(
    () =>
      drafts.filter((draft) => selectedDraftIds.includes(String(draft._id))),
    [drafts, selectedDraftIds],
  );

  const liveSchedules = useMemo(
    () => (Array.isArray(schedules) ? schedules : []),
    [schedules],
  );

  const calendarDraftDetails = useMemo(() => {
    if (selectedDraftDetails.length > 0) {
      return selectedDraftDetails;
    }

    return [];
  }, [selectedDraftDetails]);

  const calendarAssignments = useMemo(() => {
    const assignments = calendarDraftDetails.flatMap(({ draft, draftId }) =>
      (Array.isArray(draft?.assignments) ? draft.assignments : []).map(
        (assignment) => ({
          ...assignment,
          __calendarDraftId: String(draftId || ""),
        }),
      ),
    );

    return [...assignments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [calendarDraftDetails]);

  const publishableAssignments = useMemo(
    () =>
      workspaceAssignments.filter((assignment) =>
        isPublishableState(assignment.state),
      ),
    [workspaceAssignments],
  );

  const publishableAssignmentIdSet = useMemo(
    () =>
      new Set(
        publishableAssignments.map((assignment) =>
          getScopedAssignmentId(
            assignment.__workspaceDraftId,
            getAssignmentId(assignment),
          ),
        ),
      ),
    [publishableAssignments],
  );

  const selectedPublishableCount = selectedAssignmentIds.filter((id) =>
    publishableAssignmentIdSet.has(id),
  ).length;

  const overtimeThresholdHours =
    Number(activeDraft?.facilityPolicy?.weeklyOvertimeThresholdHours) || 40;

  const allPublishableSelected =
    publishableAssignments.length > 0 &&
    publishableAssignments.every((assignment) =>
      selectedAssignmentIds.includes(
        getScopedAssignmentId(
          assignment.__workspaceDraftId,
          getAssignmentId(assignment),
        ),
      ),
    );

  const somePublishableSelected =
    selectedPublishableCount > 0 && !allPublishableSelected;

  const assignmentsByDay = useMemo(() => {
    const grouped = new Map();

    workspaceAssignments.forEach((assignment) => {
      const start = new Date(assignment.startTime);
      const dayLabel = Number.isNaN(start.getTime())
        ? "Unknown date"
        : start.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });

      if (!grouped.has(dayLabel)) {
        grouped.set(dayLabel, []);
      }

      grouped.get(dayLabel).push(assignment);
    });

    return Array.from(grouped.entries()).map(([dayLabel, assignments]) => ({
      dayLabel,
      assignments,
    }));
  }, [workspaceAssignments]);

  const proposedCountByCoverageId = useMemo(() => {
    const counts = new Map();

    calendarAssignments
      .filter((assignment) => assignment?.state === "proposed")
      .forEach((assignment) => {
        const rawCoverageId = getAssignmentCoverageId(assignment);
        if (!rawCoverageId) return;
        const coverageKey = `${assignment.__calendarDraftId}:${rawCoverageId}`;
        counts.set(coverageKey, (counts.get(coverageKey) || 0) + 1);
      });

    return counts;
  }, [calendarAssignments]);

  const draftCoverageCandidates = useMemo(() => {
    const source = calendarDraftDetails.flatMap(({ draft, draftId }) => {
      const direct = [
        draft?.coverageSnapshot,
        draft?.coverages,
        draft?.sourceCoverages,
        draft?.inputCoverages,
        draft?.requestedCoverages,
      ].find((item) => Array.isArray(item) && item.length > 0);

      if (direct) {
        return direct.map((coverage) => ({ coverage, draftId }));
      }

      const draftCoverageIds = [
        ...(Array.isArray(draft?.coverageIds) ? draft.coverageIds : []),
        ...(Array.isArray(draft?.sourceCoverageIds)
          ? draft.sourceCoverageIds
          : []),
        ...(Array.isArray(draft?.inputCoverageIds)
          ? draft.inputCoverageIds
          : []),
      ]
        .map((id) => String(id))
        .filter(Boolean);

      if (draftCoverageIds.length > 0) {
        return coverages
          .filter((coverage) =>
            draftCoverageIds.includes(String(coverage?._id)),
          )
          .map((coverage) => ({ coverage, draftId }));
      }

      return [];
    });

    return source
      .map(({ coverage, draftId }) => {
        const rawCoverageId = getCoverageId(coverage);
        const draftScope = String(draftId || "");
        const coverageKey = `${draftScope}:${rawCoverageId}`;
        const startTime = coverage?.startTime || coverage?.windowStart;
        const endTime = coverage?.endTime || coverage?.windowEnd;
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }

        const requiredCount = toFiniteNumber(coverage?.requiredCount, 0);
        const spotsRemaining = toFiniteNumber(
          coverage?.spotsRemaining ?? coverage?.remaining,
          Number.NaN,
        );

        return {
          coverageKey,
          rawCoverageId,
          draftScope,
          start,
          end,
          startTime,
          endTime,
          role: coverage?.role,
          unitArea: coverage?.unitArea,
          shiftType: coverage?.shiftType,
          shiftTag: coverage?.shiftTag,
          requiredCertificationTags: Array.isArray(
            coverage?.requiredCertificationTags,
          )
            ? coverage.requiredCertificationTags
            : [],
          requiredCount,
          spotsRemaining,
        };
      })
      .filter(Boolean);
  }, [calendarDraftDetails, coverages]);

  const coverageSummaryByDay = useMemo(() => {
    const summaryByDay = new Map();

    draftCoverageCandidates.forEach((coverage) => {
      const proposedCount = coverage.coverageKey
        ? proposedCountByCoverageId.get(coverage.coverageKey) || 0
        : 0;
      const requiredCount = Math.max(
        0,
        toFiniteNumber(coverage.requiredCount, 0),
      );
      const openCount = Math.max(0, requiredCount - proposedCount);
      const fillStatus =
        openCount <= 0 ? "full" : proposedCount > 0 ? "partial" : "unfilled";

      const isPast = coverage.end.getTime() < Date.now();
      const statusKey = isPast
        ? fillStatus === "full"
          ? "pastCovered"
          : "pastGap"
        : fillStatus;

      const dayKey = getLocalDayKey(coverage.start);
      if (!dayKey) return;

      if (!summaryByDay.has(dayKey)) {
        summaryByDay.set(dayKey, {
          coverageCount: 0,
          requiredCount: 0,
          proposedCount: 0,
          openCount: 0,
          byRole: {},
          statusCounts: {
            unfilled: 0,
            partial: 0,
            full: 0,
            pastGap: 0,
            pastCovered: 0,
          },
        });
      }

      const summary = summaryByDay.get(dayKey);
      summary.coverageCount += 1;
      summary.requiredCount += requiredCount;
      summary.proposedCount += proposedCount;
      summary.openCount += openCount;
      summary.statusCounts[statusKey] += 1;

      const roleKey = String(coverage.role || "unknown");
      if (!summary.byRole[roleKey]) {
        summary.byRole[roleKey] = {
          coverageCount: 0,
          requiredCount: 0,
          proposedCount: 0,
          openCount: 0,
        };
      }

      summary.byRole[roleKey].coverageCount += 1;
      summary.byRole[roleKey].requiredCount += requiredCount;
      summary.byRole[roleKey].proposedCount += proposedCount;
      summary.byRole[roleKey].openCount += openCount;
    });

    return summaryByDay;
  }, [proposedCountByCoverageId, draftCoverageCandidates]);

  const coverageDetailsByDay = useMemo(() => {
    const detailsByDay = new Map();

    draftCoverageCandidates.forEach((coverage) => {
      const proposedCount = coverage.coverageKey
        ? proposedCountByCoverageId.get(coverage.coverageKey) || 0
        : 0;
      const requiredCount = Math.max(
        0,
        toFiniteNumber(coverage.requiredCount, 0),
      );
      const openCount = Math.max(0, requiredCount - proposedCount);
      const fillStatus =
        openCount <= 0 ? "full" : proposedCount > 0 ? "partial" : "unfilled";

      const matchingStaffCount = staffList.filter((staff) => {
        if (!isRoleCompatible(staff?.role, coverage?.role)) return false;
        return doesCoverageMatchStaffTags(staff, coverage);
      }).length;

      const dayKey = getLocalDayKey(coverage.start);
      if (!dayKey) return;

      if (!detailsByDay.has(dayKey)) {
        detailsByDay.set(dayKey, []);
      }

      detailsByDay.get(dayKey).push({
        ...coverage,
        proposedCount,
        openCount,
        fillStatus,
        matchingStaffCount,
      });
    });

    detailsByDay.forEach((entries) => {
      entries.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return detailsByDay;
  }, [draftCoverageCandidates, proposedCountByCoverageId, staffList]);

  const draftCoverageIdSet = useMemo(
    () =>
      new Set(
        draftCoverageCandidates
          .map((coverage) => String(coverage.rawCoverageId || ""))
          .filter(Boolean),
      ),
    [draftCoverageCandidates],
  );

  const draftCoverageSignatureSet = useMemo(
    () =>
      new Set(
        draftCoverageCandidates
          .map((coverage) =>
            buildCoverageSignature({
              startTime: coverage.startTime,
              endTime: coverage.endTime,
              role: coverage.role,
              unitArea: coverage.unitArea,
              shiftType: coverage.shiftType,
              shiftTag: coverage.shiftTag,
            }),
          )
          .filter(Boolean),
      ),
    [draftCoverageCandidates],
  );

  const draftAssignmentEvents = useMemo(
    () =>
      calendarAssignments.map((assignment) => {
        const assignmentId = getAssignmentId(assignment);
        const stateMeta = getDraftStateMeta(assignment?.state);
        const staffId = String(
          assignment?.staffId?._id || assignment?.staffId || "",
        );
        const isUnfilled = String(assignment?.state || "") === "unfilled";
        const staffName =
          assignment?.staffId?.name ||
          staffById.get(staffId)?.name ||
          (isUnfilled ? "Unfilled slot" : "Unknown");

        return {
          id: `assignment:${assignmentId}`,
          title: `${staffName} • ${stateMeta.label}`,
          start: assignment?.startTime,
          end: assignment?.endTime,
          backgroundColor: stateMeta.eventBg,
          borderColor: stateMeta.eventBorder,
          textColor: stateMeta.textColor,
          extendedProps: {
            type: "assignment",
            assignmentId,
            role: assignment?.role,
            staffName,
            state: assignment?.state,
            isPublishable: isPublishableState(assignment?.state),
          },
        };
      }),
    [calendarAssignments, staffById],
  );

  const liveScheduleEvents = useMemo(
    () =>
      liveSchedules
        .filter((schedule) => schedule?.startTime && schedule?.endTime)
        .map((schedule) => {
          const scheduleId = String(schedule?._id || "");
          const scheduleStatus = String(schedule?.status || "scheduled");
          const liveMeta = getLiveScheduleMeta(scheduleStatus);
          const staffId = String(
            schedule?.staffId?._id || schedule?.staffId || "",
          );
          const staffName =
            schedule?.staffId?.name ||
            staffById.get(staffId)?.name ||
            "Assigned staff";

          return {
            id: `live:${scheduleId}`,
            title: `${staffName} • ${liveMeta.label}`,
            start: schedule.startTime,
            end: schedule.endTime,
            backgroundColor: liveMeta.eventBg,
            borderColor: liveMeta.eventBorder,
            textColor: liveMeta.textColor,
            extendedProps: {
              type: "live-schedule",
              scheduleId,
              status: scheduleStatus,
              statusLabel: liveMeta.label,
              role: schedule?.role,
              unitArea: schedule?.unitArea,
              shiftType: schedule?.shiftType,
              shiftTag: schedule?.shiftTag,
              staffName,
            },
          };
        }),
    [liveSchedules, staffById],
  );

  const openCoverageEvents = useMemo(
    () =>
      coverages
        .filter((coverage) => {
          const coverageId = getCoverageId(coverage);
          const coverageSignature = buildCoverageSignature(coverage);

          const alreadyRepresentedByDraftId =
            Boolean(coverageId) && draftCoverageIdSet.has(coverageId);
          const alreadyRepresentedBySignature =
            Boolean(coverageSignature) &&
            draftCoverageSignatureSet.has(coverageSignature);

          return !alreadyRepresentedByDraftId && !alreadyRepresentedBySignature;
        })
        .map((coverage) => {
          const coverageId = getCoverageId(coverage);
          const requiredCount = Number(coverage?.requiredCount) || 0;
          const liveAssignedCount = liveSchedules.filter((schedule) =>
            isLiveScheduleMatchingCoverage(schedule, coverage),
          ).length;
          const reportedAssignedCount = Number(coverage?.assignedCount);
          const assignedCount = Number.isFinite(reportedAssignedCount)
            ? Math.max(reportedAssignedCount, liveAssignedCount)
            : liveAssignedCount;
          const openCount = Math.max(0, requiredCount - assignedCount);

          return {
            id: `open-coverage:${coverageId}`,
            title: `Open coverage • ${getRoleDisplayName(coverage?.role)}`,
            start: coverage?.startTime,
            end: coverage?.endTime,
            backgroundColor: OPEN_COVERAGE_META.eventBg,
            borderColor: OPEN_COVERAGE_META.eventBorder,
            textColor: OPEN_COVERAGE_META.textColor,
            extendedProps: {
              type: "open-coverage",
              coverage,
              coverageId,
              coverageSignature: buildCoverageSignature(coverage),
              role: coverage?.role,
              requiredCount,
              openCount,
            },
          };
        })
        .filter((event) => Number(event.extendedProps?.openCount) > 0)
        .filter((event, index, events) => {
          const coverageId = String(event.extendedProps?.coverageId || "");
          const signature = String(
            event.extendedProps?.coverageSignature || "",
          );

          return (
            events.findIndex((candidate) => {
              const candidateId = String(
                candidate.extendedProps?.coverageId || "",
              );
              const candidateSignature = String(
                candidate.extendedProps?.coverageSignature || "",
              );

              if (coverageId && candidateId) {
                return coverageId === candidateId;
              }

              return signature && candidateSignature
                ? signature === candidateSignature
                : false;
            }) === index
          );
        }),
    [coverages, draftCoverageIdSet, draftCoverageSignatureSet, liveSchedules],
  );

  const draftCalendarEvents = useMemo(
    () => [
      ...liveScheduleEvents,
      ...openCoverageEvents,
      ...draftAssignmentEvents,
    ],
    [draftAssignmentEvents, liveScheduleEvents, openCoverageEvents],
  );

  const activitySummaryByDay = useMemo(() => {
    const activity = new Map();

    const ensureDay = (dayKey) => {
      if (!dayKey) return null;
      if (!activity.has(dayKey)) {
        activity.set(dayKey, {
          liveCount: 0,
          proposedCount: 0,
          unfilledDraftCount: 0,
          removedCount: 0,
          openCoverageCount: 0,
          openCoverageSlots: 0,
        });
      }

      return activity.get(dayKey);
    };

    liveScheduleEvents.forEach((event) => {
      const dayKey = getLocalDayKey(event.start);
      const row = ensureDay(dayKey);
      if (!row) return;
      row.liveCount += 1;
    });

    draftAssignmentEvents.forEach((event) => {
      const dayKey = getLocalDayKey(event.start);
      const row = ensureDay(dayKey);
      if (!row) return;

      const state = String(event.extendedProps?.state || "").toLowerCase();
      if (state === "proposed") {
        row.proposedCount += 1;
      } else if (state === "unfilled") {
        row.unfilledDraftCount += 1;
      } else if (state === "removed") {
        row.removedCount += 1;
      }
    });

    openCoverageEvents.forEach((event) => {
      const dayKey = getLocalDayKey(event.start);
      const row = ensureDay(dayKey);
      if (!row) return;

      row.openCoverageCount += 1;
      row.openCoverageSlots += Number(event.extendedProps?.openCount) || 0;
    });

    return activity;
  }, [liveScheduleEvents, draftAssignmentEvents, openCoverageEvents]);

  const loadCoverages = async () => {
    try {
      const res = await api.get("/coverage/unfilled-auto");
      const now = new Date();
      const upcoming = (Array.isArray(res.data) ? res.data : [])
        .filter((coverage) => new Date(coverage.endTime) >= now)
        .map((coverage) => {
          const requiredCount = Number(coverage.requiredCount) || 0;
          const assignedCount = Number(coverage.assignedCount);
          const directRemaining = Number(coverage.remaining);
          const computedRemaining = Number.isFinite(assignedCount)
            ? Math.max(0, requiredCount - assignedCount)
            : Math.max(0, requiredCount);

          return {
            ...coverage,
            requiredCount,
            spotsRemaining: Number.isFinite(directRemaining)
              ? Math.max(0, directRemaining)
              : computedRemaining,
          };
        });

      setCoverages(upcoming);
    } catch (err) {
      console.error(err);
      setCoverages([]);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get("/auth/users");
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setStaffList([]);
    }
  };

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await api.get("/schedules/draft-schedules", {
        params: { status: "all", limit: 25 },
      });
      const list = (Array.isArray(res.data) ? res.data : []).filter((draft) =>
        ["draft", "partially_published"].includes(draft.status),
      );
      setDrafts(list);

      const nextSelectedIds = list.map((draft) => String(draft._id));
      setSelectedDraftIds(nextSelectedIds);

      const stillExists = list.some((draft) => draft._id === activeDraftId);
      if (!activeDraftId && list[0]?._id) {
        setActiveDraftId(list[0]._id);
      } else if (activeDraftId && !stillExists) {
        setActiveDraftId(list[0]?._id || "");
      }
    } catch (err) {
      console.error(err);
      setDrafts([]);
      setActiveDraftId("");
      setActiveDraft(null);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadDraftDetail = async (draftId) => {
    if (!draftId) {
      setActiveDraft(null);
      setEditingAssignmentId("");
      setEditingAssignmentDraftId("");
      return;
    }

    setLoadingDraftDetail(true);
    try {
      const res = await api.get(`/schedules/draft-schedules/${draftId}`);
      const draft = res.data || null;
      setActiveDraft(draft);

      const draftScope = String(draftId || "");
      const publishableIds = (draft?.assignments || [])
        .filter((assignment) => isPublishableState(assignment.state))
        .map((assignment) =>
          getScopedAssignmentId(draftScope, getAssignmentId(assignment)),
        );
      setSelectedAssignmentIds((prev) =>
        prev.filter((id) => {
          if (!id.startsWith(`${draftScope}:`)) return true;
          return publishableIds.includes(id);
        }),
      );
      setEditingAssignmentId("");
      setEditingAssignmentDraftId("");
    } catch (err) {
      console.error(err);
      setActiveDraft(null);
      const draftScope = String(draftId || "");
      setSelectedAssignmentIds((prev) =>
        prev.filter((id) => !id.startsWith(`${draftScope}:`)),
      );
      setEditingAssignmentId("");
      setEditingAssignmentDraftId("");
    } finally {
      setLoadingDraftDetail(false);
    }
  };

  const loadSelectedDraftDetails = async (draftIds) => {
    const ids = Array.from(new Set((draftIds || []).filter(Boolean)));
    if (ids.length === 0) {
      setSelectedDraftDetails([]);
      return;
    }

    setLoadingSelectedDrafts(true);
    try {
      const responses = await Promise.all(
        ids.map((draftId) => api.get(`/schedules/draft-schedules/${draftId}`)),
      );

      setSelectedDraftDetails(
        responses
          .map((response, index) => ({
            draftId: ids[index],
            draft: response.data || null,
          }))
          .filter((item) => Boolean(item.draft)),
      );
    } catch (err) {
      console.error(err);
      setSelectedDraftDetails([]);
    } finally {
      setLoadingSelectedDrafts(false);
    }
  };

  useEffect(() => {
    loadCoverages();
  }, []);

  useEffect(() => {
    loadStaff();
    loadDrafts();
  }, []);

  useEffect(() => {
    loadDraftDetail(activeDraftId);
  }, [activeDraftId]);

  useEffect(() => {
    loadSelectedDraftDetails(selectedDraftIds);
  }, [selectedDraftIds]);

  const beginEditAssignment = (assignment, draftIdOverride) => {
    const assignmentId = getAssignmentId(assignment);
    const draftId =
      String(
        draftIdOverride ||
          assignment?.__workspaceDraftId ||
          assignment?.__calendarDraftId ||
          activeDraftId ||
          "",
      ) || "";
    setEditingAssignmentId(assignmentId);
    setEditingAssignmentDraftId(draftId);
    setEditForm({
      staffId: String(assignment?.staffId?._id || assignment?.staffId || ""),
      startTime: toDateTimeLocalInput(assignment?.startTime),
      endTime: toDateTimeLocalInput(assignment?.endTime),
      notes: assignment?.notes || "",
      state: assignment?.state || "proposed",
      force: false,
    });
  };

  const cancelEditAssignment = () => {
    setEditingAssignmentId("");
    setEditingAssignmentDraftId("");
    setEditForm({
      staffId: "",
      startTime: "",
      endTime: "",
      notes: "",
      state: "proposed",
      force: false,
    });
  };

  const handleSaveAssignment = async () => {
    const targetDraftId = String(
      editingAssignmentDraftId || activeDraftId || "",
    );
    if (!targetDraftId || !editingAssignmentId) return;

    const payload = {
      staffId: editForm.staffId || undefined,
      notes: editForm.notes,
      state: editForm.state,
      force: editForm.force,
    };

    const startIso = toIsoFromLocalInput(editForm.startTime);
    const endIso = toIsoFromLocalInput(editForm.endTime);

    if (startIso) payload.startTime = startIso;
    if (endIso) payload.endTime = endIso;

    setActionLoading(`save:${editingAssignmentId}`);
    try {
      await api.patch(
        `/schedules/draft-schedules/${targetDraftId}/assignments/${editingAssignmentId}`,
        payload,
      );
      toast.success("Draft assignment updated.", toastOptions);
      await Promise.all([
        targetDraftId === String(activeDraftId || "")
          ? loadDraftDetail(activeDraftId)
          : Promise.resolve(),
        loadSelectedDraftDetails(selectedDraftIds),
      ]);
      cancelEditAssignment();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to update draft assignment.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleStateQuickUpdate = async (
    assignment,
    nextState,
    draftIdOverride,
  ) => {
    const assignmentId = getAssignmentId(assignment);
    const targetDraftId =
      String(
        draftIdOverride ||
          assignment?.__workspaceDraftId ||
          activeDraftId ||
          "",
      ) || "";
    if (!targetDraftId || !assignmentId) return;

    setActionLoading(`state:${assignmentId}`);
    try {
      await api.patch(
        `/schedules/draft-schedules/${targetDraftId}/assignments/${assignmentId}`,
        { state: nextState },
      );
      toast.success("Draft updated.", toastOptions);
      await Promise.all([
        targetDraftId === String(activeDraftId || "")
          ? loadDraftDetail(activeDraftId)
          : Promise.resolve(),
        loadSelectedDraftDetails(selectedDraftIds),
      ]);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Failed to update draft assignment state.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleAssignmentSelection = (assignmentId) => {
    setSelectedAssignmentIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId],
    );
  };

  const handleToggleAllPublishableSelection = (checked) => {
    const publishableIds = publishableAssignments.map((assignment) =>
      getScopedAssignmentId(
        assignment.__workspaceDraftId,
        getAssignmentId(assignment),
      ),
    );

    if (checked) {
      setSelectedAssignmentIds((prev) =>
        Array.from(new Set([...prev, ...publishableIds])),
      );
      return;
    }

    setSelectedAssignmentIds((prev) =>
      prev.filter((id) => !publishableIds.includes(id)),
    );
  };

  const handlePublishSelected = async () => {
    if (selectedPublishableCount <= 0) return;

    const idsToPublish = selectedAssignmentIds.filter((id) =>
      publishableAssignmentIdSet.has(id),
    );

    const assignmentIdsByDraft = idsToPublish.reduce((acc, scopedId) => {
      const { draftId, assignmentId } = splitScopedAssignmentId(scopedId);
      if (!draftId || !assignmentId) return acc;
      if (!acc[draftId]) acc[draftId] = [];
      acc[draftId].push(assignmentId);
      return acc;
    }, {});

    const draftIds = Object.keys(assignmentIdsByDraft);
    if (draftIds.length === 0) return;

    setActionLoading("publish:selected");
    try {
      await Promise.all(
        draftIds.map((draftId) =>
          api.post(`/schedules/draft-schedules/${draftId}/publish`, {
            assignmentIds: assignmentIdsByDraft[draftId],
          }),
        ),
      );
      toast.success("Selected draft assignments published.", toastOptions);
      await Promise.all([
        activeDraftId ? loadDraftDetail(activeDraftId) : Promise.resolve(),
        loadSelectedDraftDetails(selectedDraftIds),
        loadDrafts(),
        loadCoverages(),
      ]);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Failed to publish selected assignments.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handlePublishAll = async () => {
    if (publishableAssignments.length <= 0) return;

    const assignmentIdsByDraft = publishableAssignments.reduce(
      (acc, assignment) => {
        const draftId = String(assignment.__workspaceDraftId || "");
        const assignmentId = getAssignmentId(assignment);
        if (!draftId || !assignmentId) return acc;
        if (!acc[draftId]) acc[draftId] = [];
        acc[draftId].push(assignmentId);
        return acc;
      },
      {},
    );

    const draftIds = Object.keys(assignmentIdsByDraft);
    if (draftIds.length === 0) return;

    setActionLoading("publish:all");
    try {
      await Promise.all(
        draftIds.map((draftId) =>
          api.post(`/schedules/draft-schedules/${draftId}/publish`, {
            assignmentIds: assignmentIdsByDraft[draftId],
          }),
        ),
      );
      toast.success(
        "All publishable draft assignments published.",
        toastOptions,
      );
      await Promise.all([
        activeDraftId ? loadDraftDetail(activeDraftId) : Promise.resolve(),
        loadSelectedDraftDetails(selectedDraftIds),
        loadDrafts(),
        loadCoverages(),
      ]);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to publish draft assignments.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPublishableCount <= 0) return;

    const idsToDelete = selectedAssignmentIds.filter((id) =>
      publishableAssignmentIdSet.has(id),
    );

    if (idsToDelete.length === 0) return;

    const parsedTargets = idsToDelete
      .map((scopedId) => splitScopedAssignmentId(scopedId))
      .filter((target) => target.draftId && target.assignmentId);

    if (parsedTargets.length === 0) return;

    setActionLoading("delete:selected");
    try {
      await Promise.all(
        parsedTargets.map((target) =>
          api.patch(
            `/schedules/draft-schedules/${target.draftId}/assignments/${target.assignmentId}`,
            { state: "removed" },
          ),
        ),
      );
      toast.info("Selected draft assignments removed.", toastOptions);
      await Promise.all([
        activeDraftId ? loadDraftDetail(activeDraftId) : Promise.resolve(),
        loadSelectedDraftDetails(selectedDraftIds),
        loadDrafts(),
        loadCoverages(),
      ]);
      setSelectedAssignmentIds((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to delete selected assignments.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDraftCalendarEventClick = (eventClickInfo) => {
    const { event } = eventClickInfo;
    const eventType = event?.extendedProps?.type;

    if (eventType === "live-schedule") {
      const roleName = getRoleDisplayName(event.extendedProps?.role);
      const statusLabel = event.extendedProps?.statusLabel || "Live schedule";
      const unitName = getUnitAreaDisplayName(event.extendedProps?.unitArea);
      toast.info(
        `${statusLabel}: ${event.extendedProps?.staffName || "Assigned staff"} · ${roleName} · ${unitName}`,
        toastOptions,
      );
      return;
    }

    if (eventType === "coverage") {
      const roleName = getRoleDisplayName(event.extendedProps?.role);
      const remaining = Number(event.extendedProps?.remaining) || 0;
      const proposedCount = Number(event.extendedProps?.proposedCount) || 0;
      const requiredCount = Number(event.extendedProps?.requiredCount) || 0;
      const status = String(event.extendedProps?.fillStatus || "");
      const statusLabel =
        status === "full"
          ? "Fully filled"
          : status === "partial"
            ? "Partially filled"
            : "Needs coverage";
      toast.info(
        `${statusLabel}: Req ${requiredCount}, Proposed ${proposedCount}, Open ${Math.max(remaining, 0)} for ${roleName}.`,
        toastOptions,
      );
      return;
    }

    if (eventType === "open-coverage") {
      const coverage = event.extendedProps?.coverage || null;
      if (!coverage) return;

      if (onOpenManualSchedule) {
        onOpenManualSchedule(coverage);
        return;
      }

      toast.info(
        "Open coverage has no draft assignment yet. Use Manual Scheduler to fill it.",
        toastOptions,
      );
      return;
    }

    const assignmentId = String(event?.extendedProps?.assignmentId || "");
    if (!assignmentId) return;

    const assignment = calendarAssignments.find(
      (item) => getAssignmentId(item) === assignmentId,
    );
    if (!assignment) return;

    const eventDraftId = String(assignment.__calendarDraftId || "");

    if (isPublishableState(assignment.state)) {
      toggleAssignmentSelection(
        getScopedAssignmentId(eventDraftId, assignmentId),
      );
    }

    if (DRAFT_EDITABLE_STATES.has(assignment?.state)) {
      beginEditAssignment(assignment, eventDraftId);
      setDraftViewMode("list");
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2.5 },
        borderRadius: 3,
        position: "relative",
        border: "1px solid",
        borderColor: "#dbeafe",
        background:
          "linear-gradient(180deg, rgba(239,246,255,0.65) 0%, rgba(255,255,255,1) 28%)",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      )}

      <Box sx={{ mb: 1.5, pr: onClose ? 4 : 0 }}>
        <Typography variant="h6" sx={{ mb: 0.25, fontWeight: 800 }}>
          Schedule Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review generated schedules, adjust assignments, and publish approved
          shifts.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.35 }}
        >
          Partially filled drafts usually mean there are not enough available,
          qualified staff for some shifts after applying role, certification,
          unit, shift, and overtime rules. Resolve by updating staffing or
          requirements, then finish remaining assignments manually when needed.
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            color="info"
            label={`${liveScheduleEvents.length} live schedules`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            label={`${openCoverageEvents.length} open coverages`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="success"
            label={`${publishableAssignments.length} publishable assignments`}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={loadDrafts}
            disabled={loadingDrafts}
          >
            Refresh
          </Button>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            borderColor: "#93c5fd",
            backgroundColor: "#ffffff",
          }}
        >
          {loadingDraftDetail ? (
            <CircularProgress size={20} />
          ) : (
            <Stack spacing={1.25}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                justifyContent="space-between"
              >
                <Typography variant="subtitle2">
                  Draft Workspace ({publishableAssignments.length} publishable)
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteSelected}
                    disabled={
                      Boolean(actionLoading) || selectedPublishableCount <= 0
                    }
                  >
                    {actionLoading === "delete:selected"
                      ? "Deleting..."
                      : `Delete Selected (${selectedPublishableCount})`}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handlePublishSelected}
                    disabled={
                      Boolean(actionLoading) || selectedPublishableCount <= 0
                    }
                  >
                    {actionLoading === "publish:selected"
                      ? "Publishing..."
                      : `Publish Selected to Schedule (${selectedPublishableCount})`}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handlePublishAll}
                    disabled={
                      Boolean(actionLoading) ||
                      publishableAssignments.length <= 0
                    }
                  >
                    {actionLoading === "publish:all"
                      ? "Publishing..."
                      : "Publish All to Schedule"}
                  </Button>
                </Stack>
              </Stack>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={allPublishableSelected}
                    indeterminate={somePublishableSelected}
                    onChange={(e) =>
                      handleToggleAllPublishableSelection(e.target.checked)
                    }
                    disabled={publishableAssignments.length <= 0}
                  />
                }
                label={`Select all publishable (${selectedPublishableCount}/${publishableAssignments.length})`}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <ToggleButtonGroup
                  size="small"
                  color="primary"
                  value={draftViewMode}
                  exclusive
                  onChange={(_, nextMode) => {
                    if (nextMode) setDraftViewMode(nextMode);
                  }}
                >
                  <ToggleButton value="calendar">Calendar</ToggleButton>
                  <ToggleButton value="list">List</ToggleButton>
                </ToggleButtonGroup>

                <Stack
                  direction="row"
                  spacing={0.75}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    size="small"
                    label="Live schedule"
                    sx={{
                      bgcolor: "#e2e8f0",
                      color: "#0f172a",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Open coverage"
                    sx={{
                      bgcolor: "#ffedd5",
                      color: "#9a3412",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Proposed"
                    sx={{
                      bgcolor: "#dbeafe",
                      color: "#1e3a8a",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Unfilled"
                    sx={{
                      bgcolor: "#ffedd5",
                      color: "#9a3412",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Removed"
                    sx={{
                      bgcolor: "#f3f4f6",
                      color: "#374151",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Needs coverage"
                    sx={{
                      bgcolor: "#ffedd5",
                      color: "#9a3412",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Partially filled"
                    sx={{
                      bgcolor: "#fef3c7",
                      color: "#92400e",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Fully filled"
                    sx={{
                      bgcolor: "#dcfce7",
                      color: "#166534",
                      fontWeight: 700,
                    }}
                  />
                </Stack>
              </Stack>

              {draftViewMode === "calendar" && (
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(239,246,255,0.92) 100%)",
                    borderRadius: 2.5,
                    border: "1px solid #dbeafe",
                    p: { xs: 1, md: 1.5 },
                  }}
                >
                  <GlobalStyles
                    styles={{
                      ".fc": {
                        "--fc-border-color": "#dbeafe",
                        "--fc-page-bg-color": "transparent",
                      },
                      ".fc .fc-toolbar": {
                        marginBottom: "0.85rem",
                      },
                      ".fc .fc-toolbar-title": {
                        color: "#0f172a",
                        fontWeight: 800,
                        fontSize: "1rem",
                      },
                      ".fc .fc-button": {
                        background: "#ffffff",
                        border: "1px solid #bfdbfe",
                        color: "#1e3a8a",
                        boxShadow: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      },
                      ".fc .fc-button:hover": {
                        background: "#eff6ff",
                        borderColor: "#93c5fd",
                      },
                      ".fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active":
                        {
                          background: "#1d4ed8",
                          borderColor: "#1d4ed8",
                          color: "#ffffff",
                        },
                      ".fc .fc-scrollgrid": {
                        border: "1px solid #bfdbfe",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "#fff",
                      },
                      ".fc .fc-popover, .fc .fc-more-popover": {
                        backgroundColor: "#ffffff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "12px",
                        boxShadow: "0 14px 30px rgba(15, 23, 42, 0.22)",
                        overflow: "hidden",
                      },
                      ".fc .fc-popover-header": {
                        backgroundColor: "#eff6ff",
                        borderBottom: "1px solid #dbeafe",
                      },
                      ".fc .fc-popover-body": {
                        backgroundColor: "#ffffff",
                      },
                      ".fc .fc-popover .fc-daygrid-event-harness": {
                        marginBottom: "4px",
                      },
                      ".fc .fc-daygrid-day-frame": {
                        minHeight: "96px",
                      },
                      ".fc .fc-daygrid-day.fc-day-today": {
                        backgroundColor: "#eff6ff",
                      },
                      ".fc .fc-col-header-cell": {
                        backgroundColor: "#eff6ff",
                      },
                      ".fc .fc-daygrid-event": {
                        borderRadius: "8px",
                        borderWidth: "1px",
                        boxShadow: "0 3px 8px rgba(15, 23, 42, 0.15)",
                        marginTop: "3px",
                      },
                      ".fc .fc-daygrid-event:hover, .fc .fc-timegrid-event:hover":
                        {
                          filter: "brightness(0.98)",
                          transform: "translateY(-1px)",
                          boxShadow: "0 6px 14px rgba(15, 23, 42, 0.2)",
                        },
                    }}
                  />

                  {loadingSelectedDrafts ? (
                    <Typography variant="body2" color="text.secondary">
                      Loading selected draft calendars...
                    </Typography>
                  ) : (
                    <>
                      {selectedDraftIds.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          No draft selected. Showing live schedules and open
                          coverage.
                        </Typography>
                      ) : null}

                      <FullCalendar
                        plugins={[
                          dayGridPlugin,
                          timeGridPlugin,
                          interactionPlugin,
                        ]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                          left: "prev,next today",
                          center: "title",
                          right: "",
                        }}
                        fixedWeekCount={false}
                        showNonCurrentDates
                        dayMaxEvents={2}
                        displayEventTime={false}
                        dayCellContent={(arg) => {
                          const dayKey = getLocalDayKey(arg.date);
                          const summary = coverageSummaryByDay.get(dayKey);
                          const dayCoverages =
                            coverageDetailsByDay.get(dayKey) || [];
                          const dayActivity = activitySummaryByDay.get(dayKey);
                          const hasAnyDayData =
                            Boolean(summary) ||
                            (Boolean(dayActivity) &&
                              (dayActivity.liveCount > 0 ||
                                dayActivity.proposedCount > 0 ||
                                dayActivity.unfilledDraftCount > 0 ||
                                dayActivity.removedCount > 0 ||
                                dayActivity.openCoverageCount > 0));
                          const dayStatusMessage = dayActivity
                            ? dayActivity.openCoverageCount > 0
                              ? `${dayActivity.openCoverageCount} open coverage item(s) require manual scheduling (${dayActivity.openCoverageSlots} open slot(s)).`
                              : dayActivity.unfilledDraftCount > 0
                                ? `${dayActivity.unfilledDraftCount} AI draft slot(s) are still unfilled.`
                                : dayActivity.proposedCount > 0 &&
                                    dayActivity.liveCount > 0
                                  ? "Mixed day: live schedules plus AI proposals pending review."
                                  : dayActivity.proposedCount > 0
                                    ? "AI draft proposals are ready for review/publish."
                                    : dayActivity.liveCount > 0
                                      ? "All live: all visible shifts in this cell are already published."
                                      : "Day has scheduling activity."
                            : "Day has scheduling activity.";
                          const statusRows = summary
                            ? [
                                {
                                  key: "unfilled",
                                  label: "Needs coverage",
                                  count: summary.statusCounts.unfilled,
                                },
                                {
                                  key: "partial",
                                  label: "Partially filled",
                                  count: summary.statusCounts.partial,
                                },
                                {
                                  key: "full",
                                  label: "Fully filled",
                                  count: summary.statusCounts.full,
                                },
                                {
                                  key: "pastGap",
                                  label: "Past gap",
                                  count: summary.statusCounts.pastGap,
                                },
                                {
                                  key: "pastCovered",
                                  label: "Past covered",
                                  count: summary.statusCounts.pastCovered,
                                },
                              ]
                            : [];

                          return (
                            <Box
                              sx={{
                                width: "100%",
                                pl: 0.35,
                                pr: 0.55,
                                pt: 0.35,
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 1.35,
                                minHeight: 21,
                              }}
                            >
                              {hasAnyDayData ? (
                                <Tooltip
                                  arrow
                                  placement="top"
                                  enterDelay={120}
                                  slotProps={{
                                    tooltip: {
                                      sx: {
                                        maxWidth: { xs: 360, sm: 520 },
                                        width: {
                                          xs: "calc(100vw - 32px)",
                                          sm: 520,
                                        },
                                        maxHeight: { xs: 280, sm: 360 },
                                        overflowY: "auto",
                                      },
                                    },
                                  }}
                                  title={
                                    <Box sx={{ py: 0.25 }}>
                                      <Typography
                                        sx={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                        }}
                                      >
                                        Coverage & schedule summary
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: "0.68rem",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {dayStatusMessage}
                                      </Typography>
                                      {dayActivity ? (
                                        <Box sx={{ mt: 0.4 }}>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Live schedules:{" "}
                                            {dayActivity.liveCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            AI proposed:{" "}
                                            {dayActivity.proposedCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            AI unfilled:{" "}
                                            {dayActivity.unfilledDraftCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Open coverage (manual):{" "}
                                            {dayActivity.openCoverageCount}
                                          </Typography>
                                        </Box>
                                      ) : null}
                                      {summary ? (
                                        <>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Total coverages:{" "}
                                            {summary.coverageCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Required: {summary.requiredCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Proposed: {summary.proposedCount}
                                          </Typography>
                                          <Typography
                                            sx={{ fontSize: "0.68rem" }}
                                          >
                                            Open: {summary.openCount}
                                          </Typography>
                                          <Box
                                            sx={{
                                              mt: 0.55,
                                              display: "grid",
                                              gap: 0.3,
                                            }}
                                          >
                                            {statusRows
                                              .filter((row) => row.count > 0)
                                              .map((row) => {
                                                const meta =
                                                  COVERAGE_STATUS_META[
                                                    row.key
                                                  ] || OPEN_COVERAGE_META;

                                                return (
                                                  <Box
                                                    key={row.key}
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent:
                                                        "space-between",
                                                      gap: 0.75,
                                                      px: 0.55,
                                                      py: 0.25,
                                                      borderRadius: 0.75,
                                                      border: `1px solid ${meta.eventBorder}`,
                                                      backgroundColor:
                                                        meta.eventBg,
                                                    }}
                                                  >
                                                    <Typography
                                                      sx={{
                                                        fontSize: "0.66rem",
                                                        fontWeight: 700,
                                                        color: meta.textColor,
                                                      }}
                                                    >
                                                      {row.label}
                                                    </Typography>
                                                    <Typography
                                                      sx={{
                                                        fontSize: "0.66rem",
                                                        fontWeight: 800,
                                                        color:
                                                          meta.subTextColor,
                                                      }}
                                                    >
                                                      {row.count}
                                                    </Typography>
                                                  </Box>
                                                );
                                              })}
                                          </Box>
                                          {dayCoverages.length > 0 ? (
                                            <Box
                                              sx={{
                                                mt: 0.65,
                                                display: "grid",
                                                gap: 0.55,
                                              }}
                                            >
                                              <Typography
                                                sx={{
                                                  fontSize: "0.68rem",
                                                  fontWeight: 700,
                                                }}
                                              >
                                                Coverage details
                                              </Typography>
                                              {dayCoverages.map(
                                                (coverage, index) => {
                                                  const statusMeta =
                                                    COVERAGE_STATUS_META[
                                                      coverage.fillStatus
                                                    ] || OPEN_COVERAGE_META;
                                                  const certTags =
                                                    Array.isArray(
                                                      coverage.requiredCertificationTags,
                                                    )
                                                      ? coverage.requiredCertificationTags
                                                      : [];
                                                  const certDisplay =
                                                    certTags.length
                                                      ? certTags
                                                          .map((tag) =>
                                                            getCertificationTagDisplayName(
                                                              tag,
                                                            ),
                                                          )
                                                          .join(", ")
                                                      : "None";

                                                  return (
                                                    <Box
                                                      key={`${coverage.coverageKey || dayKey}-${index}`}
                                                      sx={{
                                                        px: 0.7,
                                                        py: 0.55,
                                                        borderRadius: 1,
                                                        border: `1px solid ${statusMeta.eventBorder}`,
                                                        backgroundColor:
                                                          statusMeta.eventBg,
                                                      }}
                                                    >
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          fontWeight: 800,
                                                          color: "#0f172a",
                                                        }}
                                                      >
                                                        {statusMeta.label}
                                                      </Typography>
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          color: "#111827",
                                                        }}
                                                      >
                                                        Time:{" "}
                                                        {formatTimePart(
                                                          coverage.startTime,
                                                        )}{" "}
                                                        -{" "}
                                                        {formatTimePart(
                                                          coverage.endTime,
                                                        )}
                                                      </Typography>
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          color: "#111827",
                                                        }}
                                                      >
                                                        Role:{" "}
                                                        {getRoleDisplayName(
                                                          coverage.role,
                                                        )}
                                                      </Typography>
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          color: "#111827",
                                                        }}
                                                      >
                                                        Unit:{" "}
                                                        {getUnitAreaDisplayName(
                                                          coverage.unitArea,
                                                        )}
                                                      </Typography>
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          color: "#111827",
                                                        }}
                                                      >
                                                        Certification:{" "}
                                                        {certDisplay}
                                                      </Typography>
                                                      <Typography
                                                        sx={{
                                                          fontSize: "0.66rem",
                                                          fontWeight: 700,
                                                          color: "#1f2937",
                                                        }}
                                                      >
                                                        Need{" "}
                                                        {coverage.requiredCount}{" "}
                                                        | Fit{" "}
                                                        {
                                                          coverage.matchingStaffCount
                                                        }{" "}
                                                        | Proposed{" "}
                                                        {coverage.proposedCount}{" "}
                                                        | Open{" "}
                                                        {coverage.openCount}
                                                      </Typography>
                                                    </Box>
                                                  );
                                                },
                                              )}
                                            </Box>
                                          ) : null}
                                        </>
                                      ) : null}
                                    </Box>
                                  }
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.35,
                                      color: "#7f1d1d",
                                      px: 0.5,
                                      py: 0.2,
                                      borderRadius: 1,
                                      border: "1px solid #fecaca",
                                      backgroundColor: "#fff1f2",
                                      boxShadow:
                                        "0 1px 2px rgba(15, 23, 42, 0.06)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <InfoOutlinedIcon sx={{ fontSize: 11.5 }} />
                                    <Typography
                                      sx={{
                                        fontSize: "0.54rem",
                                        fontWeight: 700,
                                        lineHeight: 1,
                                        letterSpacing: 0.1,
                                      }}
                                    >
                                      Coverage info
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              ) : null}

                              <Typography
                                sx={{
                                  fontSize: "0.76rem",
                                  fontWeight: 800,
                                  lineHeight: 1,
                                  color: arg.isOther ? "#94A3B8" : "#0F172A",
                                  flexShrink: 0,
                                  minWidth: 16,
                                  textAlign: "right",
                                }}
                              >
                                {arg.dayNumberText}
                              </Typography>
                            </Box>
                          );
                        }}
                        height="66vh"
                        events={draftCalendarEvents}
                        eventClick={handleDraftCalendarEventClick}
                        eventContent={(arg) => {
                          if (
                            arg.event.extendedProps?.type === "open-coverage"
                          ) {
                            const openCount =
                              Number(arg.event.extendedProps?.openCount) || 0;

                            return (
                              <Box
                                sx={{
                                  px: 0.7,
                                  py: 0.45,
                                  width: "100%",
                                  minHeight: 34,
                                  borderRadius: 1,
                                  backgroundColor: OPEN_COVERAGE_META.eventBg,
                                  border: `1px solid ${OPEN_COVERAGE_META.eventBorder}`,
                                  boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.12)",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.64rem",
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    color: OPEN_COVERAGE_META.textColor,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Open coverage
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    lineHeight: 1.1,
                                    color: OPEN_COVERAGE_META.subTextColor,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {getRoleDisplayName(
                                    arg.event.extendedProps?.role,
                                  )}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.58rem",
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    color: OPEN_COVERAGE_META.subTextColor,
                                  }}
                                >
                                  {openCount} open slot
                                  {openCount === 1 ? "" : "s"}
                                </Typography>
                              </Box>
                            );
                          }

                          if (
                            arg.event.extendedProps?.type === "live-schedule"
                          ) {
                            const liveMeta = getLiveScheduleMeta(
                              arg.event.extendedProps?.status,
                            );

                            return (
                              <Box
                                sx={{
                                  px: 0.7,
                                  py: 0.45,
                                  width: "100%",
                                  minHeight: 34,
                                  borderRadius: 1,
                                  backgroundColor: liveMeta.eventBg,
                                  border: `1px solid ${liveMeta.eventBorder}`,
                                  boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.12)",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.64rem",
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    color: liveMeta.textColor,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {arg.event.extendedProps?.staffName ||
                                    "Assigned staff"}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    lineHeight: 1.1,
                                    color: liveMeta.subTextColor,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {getRoleDisplayName(
                                    arg.event.extendedProps?.role,
                                  )}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.58rem",
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    color: liveMeta.accentTextColor,
                                  }}
                                >
                                  {liveMeta.label}
                                </Typography>
                              </Box>
                            );
                          }

                          const stateMeta = getDraftStateMeta(
                            arg.event.extendedProps?.state,
                          );

                          return (
                            <Box
                              sx={{
                                px: 0.7,
                                py: 0.45,
                                width: "100%",
                                minHeight: 34,
                                borderRadius: 1,
                                backgroundColor: stateMeta.eventBg,
                                border: `1px solid ${stateMeta.eventBorder}`,
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.12)",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.64rem",
                                  fontWeight: 700,
                                  lineHeight: 1.1,
                                  color: stateMeta.textColor,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {arg.event.extendedProps?.staffName ||
                                  "Unknown"}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "0.6rem",
                                  fontWeight: 600,
                                  lineHeight: 1.1,
                                  color: stateMeta.subTextColor,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getRoleDisplayName(
                                  arg.event.extendedProps?.role,
                                )}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "0.58rem",
                                  fontWeight: 700,
                                  lineHeight: 1.1,
                                  color: stateMeta.accentTextColor,
                                }}
                              >
                                {stateMeta.label}
                              </Typography>
                            </Box>
                          );
                        }}
                      />
                    </>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Calendar overlays live schedules and draft assignments so
                    schedulers can compare current published staffing against
                    draft changes in one place.
                  </Typography>
                </Box>
              )}

              {draftViewMode === "list" && workspaceAssignments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  This draft has no assignments.
                </Typography>
              ) : null}

              {draftViewMode === "list" && workspaceAssignments.length > 0 ? (
                <Stack spacing={1}>
                  {assignmentsByDay.map((group) => (
                    <Box key={group.dayLabel}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mb: 0.75,
                          mt: 0.25,
                          fontWeight: 700,
                          color: "text.secondary",
                        }}
                      >
                        {group.dayLabel}
                      </Typography>

                      <Stack spacing={1}>
                        {group.assignments.map((assignment) => {
                          const assignmentId = getAssignmentId(assignment);
                          const assignmentDraftId = String(
                            assignment.__workspaceDraftId ||
                              activeDraftId ||
                              "",
                          );
                          const scopedAssignmentId = getScopedAssignmentId(
                            assignmentDraftId,
                            assignmentId,
                          );
                          const chips = getWarningChips(
                            assignment,
                            overtimeThresholdHours,
                          );
                          const isEditable = DRAFT_EDITABLE_STATES.has(
                            assignment?.state,
                          );
                          const isEditing =
                            editingAssignmentId === assignmentId &&
                            editingAssignmentDraftId === assignmentDraftId;
                          const staffId = String(
                            assignment?.staffId?._id ||
                              assignment?.staffId ||
                              "",
                          );
                          const isUnfilled =
                            String(assignment?.state || "") === "unfilled";
                          const staffName =
                            assignment?.staffId?.name ||
                            staffById.get(staffId)?.name ||
                            (isUnfilled ? "Unfilled slot" : "Unknown");
                          const assignmentStateMeta = getDraftStateMeta(
                            assignment?.state,
                          );
                          const restoreTargetState = isUnfilled
                            ? "unfilled"
                            : "proposed";

                          return (
                            <Paper
                              key={assignmentId}
                              variant="outlined"
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                borderColor: selectedAssignmentIds.includes(
                                  scopedAssignmentId,
                                )
                                  ? "primary.main"
                                  : "divider",
                                backgroundColor: selectedAssignmentIds.includes(
                                  scopedAssignmentId,
                                )
                                  ? "#eff6ff"
                                  : "#fff",
                              }}
                            >
                              <Stack spacing={1}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 1,
                                  }}
                                >
                                  <Box>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                    >
                                      <Checkbox
                                        size="small"
                                        checked={selectedAssignmentIds.includes(
                                          scopedAssignmentId,
                                        )}
                                        disabled={
                                          !isPublishableState(assignment.state)
                                        }
                                        onChange={() =>
                                          toggleAssignmentSelection(
                                            scopedAssignmentId,
                                          )
                                        }
                                      />
                                      <Typography
                                        sx={{ fontWeight: 700, fontSize: 13 }}
                                      >
                                        {staffName} ·{" "}
                                        {getRoleDisplayName(assignment.role)}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={assignmentStateMeta.label}
                                        sx={{
                                          bgcolor: assignmentStateMeta.eventBg,
                                          color: assignmentStateMeta.textColor,
                                          border: `1px solid ${assignmentStateMeta.eventBorder}`,
                                          fontWeight: 700,
                                        }}
                                      />
                                    </Stack>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {formatDateTimeWindow(
                                        assignment.startTime,
                                        assignment.endTime,
                                      )}
                                      {assignment.unitArea
                                        ? ` · ${getUnitAreaDisplayName(assignment.unitArea)}`
                                        : ""}
                                      {assignment.shiftType
                                        ? ` · ${getShiftTypeDisplayName(assignment.shiftType)}`
                                        : ""}
                                      {assignment.shiftTag
                                        ? ` · ${getShiftTagDisplayName(assignment.shiftTag)}`
                                        : ""}
                                    </Typography>
                                  </Box>

                                  {isEditable && (
                                    <Stack direction="row" spacing={0.75}>
                                      {!isEditing && (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() =>
                                            beginEditAssignment(
                                              assignment,
                                              assignmentDraftId,
                                            )
                                          }
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      {assignment.state !== "removed" ? (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="error"
                                          onClick={() =>
                                            handleStateQuickUpdate(
                                              assignment,
                                              "removed",
                                              assignmentDraftId,
                                            )
                                          }
                                          disabled={Boolean(actionLoading)}
                                        >
                                          Remove
                                        </Button>
                                      ) : (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() =>
                                            handleStateQuickUpdate(
                                              assignment,
                                              restoreTargetState,
                                              assignmentDraftId,
                                            )
                                          }
                                          disabled={Boolean(actionLoading)}
                                        >
                                          Restore
                                        </Button>
                                      )}
                                    </Stack>
                                  )}
                                </Box>

                                {chips.length > 0 && (
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    flexWrap="wrap"
                                    useFlexGap
                                  >
                                    {chips.map((chip) => (
                                      <Chip
                                        key={`${assignmentId}-${chip.key}`}
                                        size="small"
                                        label={chip.label}
                                        color={chip.color}
                                        variant="outlined"
                                      />
                                    ))}
                                  </Stack>
                                )}

                                {isEditing && (
                                  <Paper variant="outlined" sx={{ p: 1 }}>
                                    <Stack spacing={1}>
                                      <FormControl fullWidth size="small">
                                        <InputLabel>Staff</InputLabel>
                                        <Select
                                          value={editForm.staffId}
                                          label="Staff"
                                          onChange={(e) =>
                                            setEditForm((prev) => {
                                              const nextStaffId =
                                                e.target.value;
                                              const nextState =
                                                nextStaffId &&
                                                prev.state === "unfilled"
                                                  ? "proposed"
                                                  : prev.state;

                                              return {
                                                ...prev,
                                                staffId: nextStaffId,
                                                state: nextState,
                                              };
                                            })
                                          }
                                        >
                                          <MenuItem value="">
                                            Unassigned (leave unfilled)
                                          </MenuItem>
                                          {staffList.map((member) => (
                                            <MenuItem
                                              key={member._id}
                                              value={member._id}
                                            >
                                              {member.name ||
                                                member.email ||
                                                member._id}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>

                                      <Stack
                                        direction={{
                                          xs: "column",
                                          sm: "row",
                                        }}
                                        spacing={1}
                                      >
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Start"
                                          type="datetime-local"
                                          InputLabelProps={{ shrink: true }}
                                          value={editForm.startTime}
                                          onChange={(e) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              startTime: e.target.value,
                                            }))
                                          }
                                        />
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="End"
                                          type="datetime-local"
                                          InputLabelProps={{ shrink: true }}
                                          value={editForm.endTime}
                                          onChange={(e) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              endTime: e.target.value,
                                            }))
                                          }
                                        />
                                      </Stack>

                                      <FormControl fullWidth size="small">
                                        <InputLabel>State</InputLabel>
                                        <Select
                                          value={editForm.state}
                                          label="State"
                                          onChange={(e) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              state: e.target.value,
                                            }))
                                          }
                                        >
                                          <MenuItem value="proposed">
                                            Proposed
                                          </MenuItem>
                                          <MenuItem value="unfilled">
                                            Unfilled
                                          </MenuItem>
                                          <MenuItem value="locked">
                                            Locked
                                          </MenuItem>
                                          <MenuItem value="removed">
                                            Removed
                                          </MenuItem>
                                        </Select>
                                      </FormControl>

                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="Notes"
                                        value={editForm.notes}
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            notes: e.target.value,
                                          }))
                                        }
                                      />

                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={editForm.force}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                force: e.target.checked,
                                              }))
                                            }
                                          />
                                        }
                                        label="Force override checks"
                                      />

                                      <Stack direction="row" spacing={1}>
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={handleSaveAssignment}
                                          disabled={
                                            actionLoading ===
                                            `save:${editingAssignmentId}`
                                          }
                                        >
                                          {actionLoading ===
                                          `save:${editingAssignmentId}`
                                            ? "Saving..."
                                            : "Save"}
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={cancelEditAssignment}
                                        >
                                          Cancel
                                        </Button>
                                      </Stack>
                                    </Stack>
                                  </Paper>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}
