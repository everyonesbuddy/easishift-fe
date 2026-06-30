import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  LinearProgress,
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
  getRoleDisplayName,
  getRoleOptionsFromFacilityPreferences,
  getShiftTagDisplayName,
  getShiftTypeDisplayName,
  getUnitAreaDisplayName,
  isRoleCompatible,
} from "../../../constants/industryRoles";

const toastOptions = {
  position: "top-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const DRAFT_EDITABLE_STATES = new Set(["proposed", "locked", "removed"]);

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

export default function AutoGenerateScheduleForm({ onSuccess, onClose }) {
  const { facilityPreferences } = useAuth();

  const [coverages, setCoverages] = useState([]);
  const [selectedCoverageIds, setSelectedCoverageIds] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [fetchingCoverages, setFetchingCoverages] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const roleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const selectableCoverageIds = useMemo(
    () =>
      coverages
        .filter((coverage) => Number(coverage.spotsRemaining) > 0)
        .map((coverage) => coverage._id),
    [coverages],
  );

  const selectedSelectableCount = useMemo(
    () =>
      selectedCoverageIds.filter((id) => selectableCoverageIds.includes(id))
        .length,
    [selectedCoverageIds, selectableCoverageIds],
  );

  const draftCountByCoverageId = useMemo(() => {
    const detailByDraftId = new Map();

    selectedDraftDetails.forEach((item) => {
      if (item?.draftId) {
        detailByDraftId.set(String(item.draftId), item.draft || null);
      }
    });

    if (activeDraft?._id) {
      detailByDraftId.set(String(activeDraft._id), activeDraft);
    }

    const draftIdsByCoverage = new Map();

    drafts.forEach((draft) => {
      const draftId = String(draft?._id || "");
      if (!draftId) return;

      const detail = detailByDraftId.get(draftId) || draft;

      const idCandidates = [
        ...(Array.isArray(detail?.coverageIds) ? detail.coverageIds : []),
        ...(Array.isArray(detail?.sourceCoverageIds)
          ? detail.sourceCoverageIds
          : []),
        ...(Array.isArray(detail?.inputCoverageIds)
          ? detail.inputCoverageIds
          : []),
      ]
        .map((id) => String(id || ""))
        .filter(Boolean);

      const snapshotCandidates =
        [
          detail?.coverageSnapshot,
          detail?.coverages,
          detail?.sourceCoverages,
          detail?.inputCoverages,
          detail?.requestedCoverages,
        ]
          .find((item) => Array.isArray(item) && item.length > 0)
          ?.map((coverage) => getCoverageId(coverage))
          .filter(Boolean) || [];

      const coverageIds = Array.from(
        new Set([...idCandidates, ...snapshotCandidates]),
      );

      coverageIds.forEach((coverageId) => {
        if (!draftIdsByCoverage.has(coverageId)) {
          draftIdsByCoverage.set(coverageId, new Set());
        }
        draftIdsByCoverage.get(coverageId).add(draftId);
      });
    });

    const countMap = new Map();
    draftIdsByCoverage.forEach((draftIdSet, coverageId) => {
      countMap.set(coverageId, draftIdSet.size);
    });

    return countMap;
  }, [activeDraft, drafts, selectedDraftDetails]);

  const sortedCoverages = useMemo(() => {
    const getAssignedCount = (coverage) => {
      const directAssigned = toFiniteNumber(
        coverage?.assignedCount,
        Number.NaN,
      );
      if (Number.isFinite(directAssigned)) {
        return Math.max(0, directAssigned);
      }

      const required = toFiniteNumber(coverage?.requiredCount, 0);
      const remaining = toFiniteNumber(
        coverage?.spotsRemaining ?? coverage?.remaining,
        Number.NaN,
      );

      if (Number.isFinite(remaining)) {
        return Math.max(0, required - remaining);
      }

      return 0;
    };

    return [...coverages].sort((a, b) => {
      const aAssigned = getAssignedCount(a);
      const bAssigned = getAssignedCount(b);

      const aUnfilledPriority = aAssigned <= 0 ? 0 : 1;
      const bUnfilledPriority = bAssigned <= 0 ? 0 : 1;
      if (aUnfilledPriority !== bUnfilledPriority) {
        return aUnfilledPriority - bUnfilledPriority;
      }

      const aRemaining = toFiniteNumber(a?.spotsRemaining ?? a?.remaining, 0);
      const bRemaining = toFiniteNumber(b?.spotsRemaining ?? b?.remaining, 0);
      if (aRemaining !== bRemaining) {
        return bRemaining - aRemaining;
      }

      const aTime = new Date(a?.startTime || a?.date || 0).getTime();
      const bTime = new Date(b?.startTime || b?.date || 0).getTime();
      return aTime - bTime;
    });
  }, [coverages]);

  const allSelectableSelected =
    selectableCoverageIds.length > 0 &&
    selectedSelectableCount === selectableCoverageIds.length;
  const hasSomeSelectableSelected =
    selectedSelectableCount > 0 && !allSelectableSelected;

  const openCoverageInsights = useMemo(() => {
    const dayMap = new Map();
    const roleMap = new Map();
    let totalOpenSpots = 0;
    let totalRequired = 0;
    let totalScheduled = 0;
    let selectableShiftCount = 0;
    let selectedOpenSpots = 0;

    sortedCoverages.forEach((coverage) => {
      const openSpots = Math.max(
        0,
        toFiniteNumber(coverage?.spotsRemaining ?? coverage?.remaining, 0),
      );
      const requiredCount = Math.max(
        0,
        toFiniteNumber(coverage?.requiredCount, 0),
      );
      const directAssigned = Number(coverage?.assignedCount);
      const scheduledCount = Number.isFinite(directAssigned)
        ? Math.max(0, directAssigned)
        : Math.max(0, requiredCount - openSpots);
      const coverageId = String(coverage?._id || "");
      const isSelected = selectedCoverageIds.includes(coverageId);

      if (openSpots > 0) selectableShiftCount += 1;
      totalOpenSpots += openSpots;
      totalRequired += requiredCount;
      totalScheduled += scheduledCount;
      if (isSelected) selectedOpenSpots += openSpots;

      const dayValue = coverage?.startTime || coverage?.date;
      const dayKey = getLocalDayKey(dayValue) || String(dayValue || "unknown");
      const dayTime = new Date(dayValue || 0).getTime();
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          dayKey,
          label: formatDatePart(dayValue),
          time: Number.isFinite(dayTime) ? dayTime : Number.MAX_SAFE_INTEGER,
          shiftCount: 0,
          openSpots: 0,
          selectedCount: 0,
        });
      }
      const daySummary = dayMap.get(dayKey);
      daySummary.shiftCount += 1;
      daySummary.openSpots += openSpots;
      if (isSelected) daySummary.selectedCount += 1;

      const roleKey = String(coverage?.role || "unknown");
      if (!roleMap.has(roleKey)) {
        roleMap.set(roleKey, { role: roleKey, shiftCount: 0, openSpots: 0 });
      }
      const roleSummary = roleMap.get(roleKey);
      roleSummary.shiftCount += 1;
      roleSummary.openSpots += openSpots;
    });

    const dayRows = Array.from(dayMap.values()).sort(
      (a, b) => a.time - b.time || b.openSpots - a.openSpots,
    );

    const roleRows = Array.from(roleMap.values())
      .sort((a, b) => b.openSpots - a.openSpots || b.shiftCount - a.shiftCount)
      .slice(0, 4)
      .map((row) => ({
        ...row,
        roleLabel: getRoleDisplayName(row.role),
      }));

    const fillPct =
      totalRequired > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((totalScheduled / totalRequired) * 100)),
          )
        : 0;

    return {
      totalOpenSpots,
      totalRequired,
      totalScheduled,
      selectableShiftCount,
      selectedOpenSpots,
      fillPct,
      dayRows,
      roleRows,
    };
  }, [selectedCoverageIds, sortedCoverages]);

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

  const selectedDraftSummaryLabel = useMemo(() => {
    if (drafts.length === 0) return "0 selected";
    if (selectedDraftIds.length === drafts.length) return "All drafts selected";
    return `${selectedDraftIds.length}/${drafts.length} selected`;
  }, [drafts.length, selectedDraftIds.length]);

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
          role: coverage?.role,
          unitArea: coverage?.unitArea,
          shiftType: coverage?.shiftType,
          shiftTag: coverage?.shiftTag,
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

  const draftAssignmentEvents = useMemo(
    () =>
      calendarAssignments.map((assignment) => {
        const assignmentId = getAssignmentId(assignment);
        const stateMeta = getDraftStateMeta(assignment?.state);
        const staffId = String(
          assignment?.staffId?._id || assignment?.staffId || "",
        );
        const staffName =
          assignment?.staffId?.name ||
          staffById.get(staffId)?.name ||
          "Unknown";

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

  const draftCalendarEvents = useMemo(
    () => [...draftAssignmentEvents],
    [draftAssignmentEvents],
  );

  const loadCoverages = async () => {
    setFetchingCoverages(true);
    try {
      const res = await api.get("/coverage/unfilled-auto");
      const now = new Date();
      const upcoming = (Array.isArray(res.data) ? res.data : [])
        .filter(
          (coverage) =>
            new Date(coverage.endTime) >= now &&
            (!selectedRole || isRoleCompatible(selectedRole, coverage.role)),
        )
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
      setSelectedCoverageIds((prev) =>
        prev.filter((id) => upcoming.some((coverage) => coverage._id === id)),
      );
    } catch (err) {
      console.error(err);
      setCoverages([]);
    } finally {
      setFetchingCoverages(false);
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
      setSelectedDraftIds((prev) => {
        const filtered = prev.filter((id) =>
          nextSelectedIds.includes(String(id)),
        );
        return filtered;
      });

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
  }, [selectedRole]);

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

  const toggleCoverageSelection = (id) => {
    setSelectedCoverageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectLargestCoverageGaps = () => {
    const prioritizedIds = [...sortedCoverages]
      .filter(
        (coverage) =>
          Math.max(
            0,
            toFiniteNumber(coverage?.spotsRemaining ?? coverage?.remaining, 0),
          ) > 0,
      )
      .sort((a, b) => {
        const aOpen = Math.max(
          0,
          toFiniteNumber(a?.spotsRemaining ?? a?.remaining, 0),
        );
        const bOpen = Math.max(
          0,
          toFiniteNumber(b?.spotsRemaining ?? b?.remaining, 0),
        );
        if (aOpen !== bOpen) return bOpen - aOpen;
        return (
          new Date(a?.startTime || a?.date || 0).getTime() -
          new Date(b?.startTime || b?.date || 0).getTime()
        );
      })
      .slice(0, 8)
      .map((coverage) => String(coverage?._id || ""))
      .filter(Boolean);

    setSelectedCoverageIds((prev) =>
      Array.from(new Set([...prev, ...prioritizedIds])),
    );
  };

  const handleSelectCoverageDay = (dayKey) => {
    if (!dayKey) return;

    const dayCoverageIds = sortedCoverages
      .filter((coverage) => {
        const coverageDayKey =
          getLocalDayKey(coverage?.startTime || coverage?.date) ||
          String(coverage?.startTime || coverage?.date || "unknown");
        const openSpots = Math.max(
          0,
          toFiniteNumber(coverage?.spotsRemaining ?? coverage?.remaining, 0),
        );
        return coverageDayKey === dayKey && openSpots > 0;
      })
      .map((coverage) => String(coverage?._id || ""))
      .filter(Boolean);

    setSelectedCoverageIds((prev) =>
      Array.from(new Set([...prev, ...dayCoverageIds])),
    );
  };

  const handleToggleAllCoverageSelection = (checked) => {
    if (checked) {
      setSelectedCoverageIds((prev) =>
        Array.from(new Set([...prev, ...selectableCoverageIds])),
      );
      return;
    }

    setSelectedCoverageIds((prev) =>
      prev.filter((id) => !selectableCoverageIds.includes(id)),
    );
  };

  const handleCreateDraft = async () => {
    if (!selectedCoverageIds.length) {
      setErrorMsg("Select at least one coverage.");
      return;
    }

    setErrorMsg("");
    setCreatingDraft(true);
    try {
      const res = await api.post("/schedules/auto-generate", {
        coverageIds: selectedCoverageIds,
      });

      const responseData = res?.data || {};
      const newDraftId =
        responseData?.draftSchedule?.draftId ||
        responseData?.draftSchedule?._id;
      const didCreateDraft = Boolean(
        responseData?.draftCreated ?? Boolean(newDraftId),
      );

      if (responseData?.message) {
        if (didCreateDraft) {
          toast.success(responseData.message, toastOptions);
        } else {
          toast.info(responseData.message, toastOptions);
        }
      } else {
        toast.success("Draft created successfully.", toastOptions);
      }

      if (responseData?.warning) {
        toast.warning(responseData.warning, toastOptions);
      }

      await Promise.all([loadCoverages(), loadDrafts()]);
      setSelectedCoverageIds([]);
      if (newDraftId) {
        setActiveDraftId(String(newDraftId));
      }
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || "Failed to create AI draft.";
      setErrorMsg(message);
      toast.error(message, toastOptions);
    } finally {
      setCreatingDraft(false);
    }
  };

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

  const toggleDraftSelection = (draftId) => {
    setSelectedDraftIds((prev) =>
      prev.includes(draftId)
        ? prev.filter((id) => id !== draftId)
        : [...prev, draftId],
    );
  };

  const handleToggleAllDraftSelection = (checked) => {
    const allIds = drafts.map((draft) => String(draft._id));

    if (checked) {
      setSelectedDraftIds(allIds);
      return;
    }

    setSelectedDraftIds([]);
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

  const handleDiscardDraft = async () => {
    if (!activeDraftId) return;

    setActionLoading("discard");
    try {
      await api.post(`/schedules/draft-schedules/${activeDraftId}/discard`);
      toast.info("Draft discarded.", toastOptions);
      await Promise.all([loadDrafts(), loadCoverages()]);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to discard draft.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDraftCalendarEventClick = (eventClickInfo) => {
    const { event } = eventClickInfo;
    const eventType = event?.extendedProps?.type;

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
          Draft Schedule Board
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create drafts from open coverage, edit assignments, review overtime
          risk, and publish selected or all.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={`${selectableCoverageIds.length} open coverage`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="info"
            label={`${drafts.length} active drafts`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="success"
            label={`${publishableAssignments.length} publishable assignments`}
          />
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.25, md: 1.5 },
            borderRadius: 2.5,
            borderColor: "#bfdbfe",
            background:
              "linear-gradient(150deg, #f0f9ff 0%, #f8fbff 45%, #ffffff 100%)",
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Create Draft from Open Coverage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Spot shortage hotspots quickly, then draft only the shifts
                  that matter most.
                </Typography>
              </Box>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${openCoverageInsights.selectableShiftCount} open shifts`}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Paper
                variant="outlined"
                sx={{ p: 1, borderRadius: 2, flex: 1, borderColor: "#bfdbfe" }}
              >
                <Typography variant="caption" color="text.secondary">
                  Open shifts
                </Typography>
                <Typography
                  sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
                >
                  {openCoverageInsights.selectableShiftCount}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 1, borderRadius: 2, flex: 1, borderColor: "#fed7aa" }}
              >
                <Typography variant="caption" color="text.secondary">
                  Open spots
                </Typography>
                <Typography
                  sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
                >
                  {openCoverageInsights.totalOpenSpots}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 1, borderRadius: 2, flex: 1, borderColor: "#bbf7d0" }}
              >
                <Typography variant="caption" color="text.secondary">
                  Current fill level
                </Typography>
                <Typography
                  sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
                >
                  {openCoverageInsights.fillPct}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={openCoverageInsights.fillPct}
                  sx={{
                    mt: 0.7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#15803d" },
                  }}
                />
              </Paper>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <FormControl fullWidth>
                <InputLabel>Role (optional)</InputLabel>
                <Select
                  value={selectedRole}
                  label="Role (optional)"
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roleOptions.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack
                direction={{ xs: "row", md: "column" }}
                spacing={0.75}
                justifyContent="center"
              >
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={handleSelectLargestCoverageGaps}
                  disabled={selectableCoverageIds.length <= 0}
                >
                  Prioritize Largest Gaps
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setSelectedCoverageIds([])}
                  disabled={selectedCoverageIds.length <= 0}
                >
                  Clear Selection
                </Button>
              </Stack>
            </Stack>

            {fetchingCoverages ? (
              <Typography variant="body2">Loading coverages...</Typography>
            ) : (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelectableSelected}
                      indeterminate={hasSomeSelectableSelected}
                      onChange={(e) =>
                        handleToggleAllCoverageSelection(e.target.checked)
                      }
                    />
                  }
                  label={`Select all (${selectedSelectableCount}/${selectableCoverageIds.length})`}
                />

                {openCoverageInsights.dayRows.length > 0 ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 0.75,
                    }}
                  >
                    {openCoverageInsights.dayRows.slice(0, 8).map((day) => {
                      const severityTone =
                        day.openSpots >= 6
                          ? "#7f1d1d"
                          : day.openSpots >= 3
                            ? "#9a3412"
                            : "#1d4ed8";
                      const bgTone =
                        day.openSpots >= 6
                          ? "#fef2f2"
                          : day.openSpots >= 3
                            ? "#fff7ed"
                            : "#eff6ff";

                      return (
                        <Paper
                          key={day.dayKey}
                          variant="outlined"
                          sx={{
                            p: 0.75,
                            borderRadius: 1.75,
                            borderColor: "#dbeafe",
                            backgroundColor: bgTone,
                            cursor: "pointer",
                            "&:hover": { borderColor: "#60a5fa" },
                          }}
                          onClick={() => handleSelectCoverageDay(day.dayKey)}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {day.label}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.35,
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              lineHeight: 1,
                              color: severityTone,
                            }}
                          >
                            {day.openSpots} open
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.64rem",
                              color: "text.secondary",
                            }}
                          >
                            {day.shiftCount} shift
                            {day.shiftCount > 1 ? "s" : ""} ·{" "}
                            {day.selectedCount} selected
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                ) : null}

                {openCoverageInsights.roleRows.length > 0 ? (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {openCoverageInsights.roleRows.map((roleRow) => (
                      <Chip
                        key={roleRow.role}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "#bfdbfe",
                          backgroundColor: "#ffffff",
                        }}
                        label={`${roleRow.roleLabel}: ${roleRow.openSpots} open`}
                      />
                    ))}
                  </Stack>
                ) : null}

                <Box sx={{ maxHeight: 320, overflowY: "auto", pr: 0.5 }}>
                  {sortedCoverages.map((coverage) => {
                    const selected = selectedCoverageIds.includes(coverage._id);
                    const openSpots = Math.max(
                      0,
                      toFiniteNumber(
                        coverage?.spotsRemaining ?? coverage?.remaining,
                        0,
                      ),
                    );
                    const disabled = openSpots <= 0;
                    const coverageId = String(coverage?._id || "");
                    const draftCount =
                      draftCountByCoverageId.get(coverageId) || 0;
                    const requiredCount = Math.max(
                      0,
                      toFiniteNumber(coverage?.requiredCount, 0),
                    );
                    const directAssigned = Number(coverage?.assignedCount);
                    const scheduledCount = Number.isFinite(directAssigned)
                      ? Math.max(0, directAssigned)
                      : Math.max(0, requiredCount - openSpots);
                    const barTotal = Math.max(
                      1,
                      requiredCount,
                      scheduledCount + openSpots,
                    );
                    const scheduledPct = Math.round(
                      (scheduledCount / barTotal) * 100,
                    );
                    const openPct = Math.round((openSpots / barTotal) * 100);
                    const gapColor =
                      openSpots >= 3
                        ? "#b45309"
                        : openSpots > 0
                          ? "#2563eb"
                          : "#166534";

                    return (
                      <Paper
                        key={coverage._id}
                        variant="outlined"
                        sx={{
                          p: 1,
                          mb: 0.75,
                          borderRadius: 2,
                          borderColor: selected ? "#2563eb" : "#dbeafe",
                          borderWidth: selected ? 2 : 1,
                          backgroundColor: selected ? "#eff6ff" : "#ffffff",
                          opacity: disabled ? 0.68 : 1,
                          cursor: disabled ? "default" : "pointer",
                          "&:hover": {
                            borderColor: selected ? "#2563eb" : "#93c5fd",
                            backgroundColor: selected ? "#eff6ff" : "#f8fafc",
                          },
                        }}
                        onClick={() =>
                          !disabled && toggleCoverageSelection(coverage._id)
                        }
                      >
                        <Stack spacing={0.55}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                              }}
                            >
                              <Checkbox
                                checked={selected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleCoverageSelection(coverage._id);
                                }}
                                disabled={disabled}
                                sx={{ mt: -0.5, ml: -0.5 }}
                              />

                              <Box>
                                <Typography
                                  sx={{ fontSize: 13, fontWeight: 700 }}
                                >
                                  {formatDatePart(
                                    coverage.startTime || coverage.date,
                                  )}{" "}
                                  · {formatTimePart(coverage.startTime)}-
                                  {formatTimePart(coverage.endTime)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block", mt: 0.15 }}
                                >
                                  {getRoleDisplayName(coverage.role)}
                                  {coverage.unitArea
                                    ? ` · ${getUnitAreaDisplayName(coverage.unitArea)}`
                                    : ""}
                                  {coverage.shiftType
                                    ? ` · ${getShiftTypeDisplayName(coverage.shiftType)}`
                                    : ""}
                                  {coverage.shiftTag
                                    ? ` · ${getShiftTagDisplayName(coverage.shiftTag)}`
                                    : ""}
                                </Typography>
                              </Box>
                            </Box>

                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <Chip
                                size="small"
                                label={`${openSpots} open`}
                                sx={{
                                  height: 22,
                                  color: gapColor,
                                  backgroundColor: "#fff7ed",
                                  border: "1px solid #fed7aa",
                                  fontWeight: 700,
                                }}
                              />
                              <Chip
                                size="small"
                                label={`${requiredCount} req`}
                                sx={{
                                  height: 22,
                                  color: "#334155",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  fontWeight: 700,
                                }}
                              />
                            </Stack>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              width: "100%",
                              height: 8,
                              borderRadius: 999,
                              overflow: "hidden",
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${scheduledPct}%`,
                                backgroundColor: "#22c55e",
                              }}
                            />
                            <Box
                              sx={{
                                width: `${openPct}%`,
                                backgroundColor: "#f59e0b",
                              }}
                            />
                          </Box>

                          <Typography variant="caption" color="text.secondary">
                            {scheduledCount} scheduled / {openSpots} open
                            {draftCount > 0
                              ? ` · In ${draftCount} draft${draftCount > 1 ? "s" : ""}`
                              : ""}
                          </Typography>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>

                <Button
                  sx={{ mt: 0.35 }}
                  fullWidth
                  variant="contained"
                  color="warning"
                  onClick={handleCreateDraft}
                  disabled={creatingDraft}
                >
                  {creatingDraft ? (
                    <CircularProgress size={20} />
                  ) : (
                    "Create Draft with AI"
                  )}
                </Button>
              </>
            )}
          </Stack>
        </Paper>

        <Divider />

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            borderColor: "#dbeafe",
            backgroundColor: "#f8fbff",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Draft Schedules
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                variant="outlined"
                label={selectedDraftSummaryLabel}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${selectedDrafts.length} shown`}
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
          </Stack>

          {drafts.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      selectedDraftIds.length === drafts.length &&
                      drafts.length > 0
                    }
                    indeterminate={
                      selectedDraftIds.length > 0 &&
                      selectedDraftIds.length < drafts.length
                    }
                    onChange={(e) =>
                      handleToggleAllDraftSelection(e.target.checked)
                    }
                  />
                }
                label="Show all drafts in calendar"
              />
              <Button
                size="small"
                variant="text"
                onClick={() => setSelectedDraftIds([])}
                disabled={selectedDraftIds.length === 0}
              >
                Clear
              </Button>
            </Stack>
          )}

          {drafts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active drafts yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {drafts.map((draft) => (
                <Paper
                  key={draft._id}
                  variant="outlined"
                  onClick={() => setActiveDraftId(draft._id)}
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    borderRadius: 2,
                    backgroundColor:
                      draft._id === activeDraftId ? "#eff6ff" : "#ffffff",
                    borderColor:
                      draft._id === activeDraftId ? "primary.main" : "divider",
                    borderWidth: draft._id === activeDraftId ? 2 : 1,
                    "&:hover": {
                      borderColor:
                        draft._id === activeDraftId
                          ? "primary.main"
                          : "#93c5fd",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Checkbox
                        size="small"
                        checked={selectedDraftIds.includes(String(draft._id))}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDraftSelection(String(draft._id));
                        }}
                      />
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        Created {formatDatePart(draft.createdAt)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={String(draft.status || "draft")
                        .replace("_", " ")
                        .toUpperCase()}
                      color={
                        draft.status === "partially_published"
                          ? "info"
                          : "warning"
                      }
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Number(draft?.summary?.generatedAssignmentCount || 0)}{" "}
                    generated assignment(s)
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {activeDraftId && (
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
                    Draft Workspace ({publishableAssignments.length}{" "}
                    publishable)
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={handleDiscardDraft}
                      disabled={Boolean(actionLoading)}
                    >
                      {actionLoading === "discard"
                        ? "Discarding..."
                        : "Discard Draft"}
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
                        : `Publish Selected (${selectedPublishableCount})`}
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
                        : "Publish All"}
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

                <Alert severity="info">
                  Overtime threshold is {overtimeThresholdHours}h. "Close to
                  40h" appears when projected weekly load is within 4 hours of
                  threshold.
                </Alert>

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
                      label="Proposed"
                      sx={{
                        bgcolor: "#dbeafe",
                        color: "#1e3a8a",
                        fontWeight: 700,
                      }}
                    />
                    <Chip
                      size="small"
                      label="Locked"
                      sx={{
                        bgcolor: "#ccfbf1",
                        color: "#115e59",
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
                      label="Needs Coverage"
                      sx={{
                        bgcolor: "#ffedd5",
                        color: "#9a3412",
                        fontWeight: 700,
                      }}
                    />
                    <Chip
                      size="small"
                      label="Partially Filled"
                      sx={{
                        bgcolor: "#fef3c7",
                        color: "#92400e",
                        fontWeight: 700,
                      }}
                    />
                    <Chip
                      size="small"
                      label="Fully Filled"
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

                    {selectedDraftIds.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Check one or more drafts to show them on the calendar.
                      </Typography>
                    ) : loadingSelectedDrafts ? (
                      <Typography variant="body2" color="text.secondary">
                        Loading selected draft calendars...
                      </Typography>
                    ) : (
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
                          right: "dayGridMonth,timeGridWeek",
                        }}
                        fixedWeekCount={false}
                        showNonCurrentDates
                        dayMaxEvents={2}
                        displayEventTime={false}
                        dayCellContent={(arg) => {
                          const dayKey = getLocalDayKey(arg.date);
                          const summary = coverageSummaryByDay.get(dayKey);
                          const roleEntries = summary
                            ? Object.entries(summary.byRole || {}).sort(
                                (a, b) =>
                                  getRoleDisplayName(a[0]).localeCompare(
                                    getRoleDisplayName(b[0]),
                                  ),
                              )
                            : [];
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
                              {summary ? (
                                <Tooltip
                                  arrow
                                  placement="top"
                                  enterDelay={120}
                                  title={
                                    <Box sx={{ py: 0.25 }}>
                                      <Typography
                                        sx={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                        }}
                                      >
                                        Coverage summary
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.68rem" }}>
                                        Total coverages: {summary.coverageCount}
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.68rem" }}>
                                        Required: {summary.requiredCount}
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.68rem" }}>
                                        Proposed: {summary.proposedCount}
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.68rem" }}>
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
                                              COVERAGE_STATUS_META[row.key] ||
                                              OPEN_COVERAGE_META;

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
                                                  backgroundColor: meta.eventBg,
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
                                                    color: meta.subTextColor,
                                                  }}
                                                >
                                                  {row.count}
                                                </Typography>
                                              </Box>
                                            );
                                          })}
                                      </Box>
                                      {roleEntries.length > 0 ? (
                                        <Box sx={{ mt: 0.45 }}>
                                          <Typography
                                            sx={{
                                              fontSize: "0.68rem",
                                              fontWeight: 700,
                                            }}
                                          >
                                            By role
                                          </Typography>
                                          {roleEntries.map(
                                            ([roleKey, roleSummary]) => (
                                              <Typography
                                                key={roleKey}
                                                sx={{ fontSize: "0.66rem" }}
                                              >
                                                {getRoleDisplayName(roleKey)}:
                                                Req {roleSummary.requiredCount},
                                                Proposed{" "}
                                                {roleSummary.proposedCount},
                                                Open {roleSummary.openCount}
                                              </Typography>
                                            ),
                                          )}
                                        </Box>
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
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      Calendar shows only checked drafts. Coverage cards show
                      needs/partial/full status from proposed, locked, and
                      published assignments.
                    </Typography>
                  </Box>
                )}

                {draftViewMode === "list" &&
                workspaceAssignments.length === 0 ? (
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
                            const staffName =
                              assignment?.staffId?.name ||
                              staffById.get(staffId)?.name ||
                              "Unknown";

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
                                  backgroundColor:
                                    selectedAssignmentIds.includes(
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
                                            !isPublishableState(
                                              assignment.state,
                                            )
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
                                          label={String(
                                            assignment.state || "",
                                          ).toUpperCase()}
                                          color={
                                            assignment.state === "published"
                                              ? "success"
                                              : assignment.state === "removed"
                                                ? "default"
                                                : "warning"
                                          }
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
                                        {assignment.state !== "locked" && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "locked",
                                                assignmentDraftId,
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Lock
                                          </Button>
                                        )}
                                        {assignment.state === "locked" && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "proposed",
                                                assignmentDraftId,
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Unlock
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
                                                "proposed",
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
                                              setEditForm((prev) => ({
                                                ...prev,
                                                staffId: e.target.value,
                                              }))
                                            }
                                          >
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
        )}
      </Stack>
    </Paper>
  );
}
