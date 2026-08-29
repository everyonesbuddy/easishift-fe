import { useEffect, useState, useMemo, useRef } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Paper,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  Menu,
  FormControl,
  InputLabel,
  GlobalStyles,
  Checkbox,
  IconButton,
  TextField,
  Tooltip,
  Chip,
  ListItemText,
  InputAdornment,
} from "@mui/material";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import api from "../../../config/api";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiList,
  FiPlus,
  FiEye,
  FiEdit,
  FiEdit2,
  FiDelete,
  FiRepeat,
  FiPrinter,
  FiDownload,
  FiChevronDown,
  FiClock,
  FiPlayCircle,
  FiMove,
  FiSearch,
  FiX,
  FiFilter,
} from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import ScheduleForm from "./ScheduleForm";
import AutoGenerateScheduleForm from "./AutoGenerateScheduleForm";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import ShiftSwapRequestModal from "./ShiftSwapRequestModal";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Stack from "@mui/material/Stack";
import { useLocation, useNavigate } from "react-router-dom";
import QrScannerDialog from "../../Shared/QrScannerDialog";
import GuideVideoDialog from "../../Shared/GuideVideoDialog";
import {
  getRoleColor,
  getRoleDisplayName,
  getUnitAreaDisplayName,
  getShiftTypeDisplayName,
  getShiftTagDisplayName,
  getCertificationTagDisplayName,
  getFacilityRolesFromUser,
  getRoleOptionsFromFacilityPreferences,
  getUserRoles,
} from "../../../constants/industryRoles";

const SCHEDULE_STATUS_META = {
  scheduled: { label: "Scheduled", color: "#fbc02d", bg: "#DBEAFE" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#DBEAFE" },
  completed: { label: "Completed", color: "#66bb6a", bg: "#DCFCE7" },
  left_early: { label: "Left Early", color: "#f97316", bg: "#FFEDD5" },
  no_show: { label: "No Show", color: "#6b7280", bg: "#FEE2E2" },
  call_out: { label: "Call Out", color: "#ef5350", bg: "#FEE2E2" },
};

const SCHEDULE_STATUS_FILTER_OPTIONS = [
  "scheduled",
  "in_progress",
  "completed",
  "left_early",
  "no_show",
  "call_out",
];

// Statuses that must stand out immediately (red), same precedence as coverage-gap cells
const URGENT_SCHEDULE_STATUSES = new Set(["call_out", "no_show"]);

const SCHEDULE_GUIDE_VIDEOS = [
  {
    id: "ai-generated-schedule",
    label: "AI-generated schedule",
    title: "AI-Generated Schedule Guide",
    description:
      "Learn how to review AI-generated draft schedules before publishing.",
    embedUrl: "https://www.youtube.com/embed/r8kQbvdqWpA",
  },
];

const getScheduleStatusColor = (status) =>
  SCHEDULE_STATUS_META[String(status || "").toLowerCase()]?.color || "#9e9e9e";

const getScheduleStatusLabel = (status) =>
  SCHEDULE_STATUS_META[String(status || "").toLowerCase()]?.label ||
  String(status || "unknown")
    .replace(/_/g, " ")
    .toUpperCase();

// Weekend column tint; only shown on cells with no real assignment/coverage data
const WEEKEND_BG = "#FEF9C3";

export default function ScheduleList() {
  const { user, can, facilityPreferences } = useAuth();
  const canManageSchedules = can("schedule.manage");
  const canViewAllSchedules = can("schedule.view");
  const hasSchedulableRole =
    getFacilityRolesFromUser(user, facilityPreferences).length > 0;
  const canUsePersonalSchedule = hasSchedulableRole;
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [openAutoModal, setOpenAutoModal] = useState(() =>
    Boolean(location.state?.openDraftReview),
  );
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleFormMode, setScheduleFormMode] = useState("manual");
  const [manualCoverageFromAuto, setManualCoverageFromAuto] = useState(null);
  const [view, setView] = useState("table");
  const [listGroupBy, setListGroupBy] = useState("date");

  // Scoped storage keys for individual user preferences
  const userScopeId = user?._id || user?.id || user?.tenantId || "default";
  const ROSTER_ORDER_STORAGE_KEY = `wisershifts_roster_order_${userScopeId}`;
  const SCHEDULE_FILTERS_STORAGE_KEY = `wisershifts_schedule_filters_${userScopeId}`;

  // Initial filter state from localStorage (with fallback to legacy key if needed)
  const savedFilters = useMemo(() => {
    try {
      const stored =
        localStorage.getItem(SCHEDULE_FILTERS_STORAGE_KEY) ||
        localStorage.getItem(`easishift_schedule_filters_${userScopeId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to read schedule filters from localStorage", e);
      return null;
    }
  }, [SCHEDULE_FILTERS_STORAGE_KEY, userScopeId]);

  const [selectedRoles, setSelectedRoles] = useState(() =>
    Array.isArray(savedFilters?.roles) ? savedFilters.roles : [],
  );
  const [selectedStatuses, setSelectedStatuses] = useState(() =>
    Array.isArray(savedFilters?.statuses) ? savedFilters.statuses : [],
  );
  const [selectedUnitAreas, setSelectedUnitAreas] = useState(() =>
    Array.isArray(savedFilters?.unitAreas) ? savedFilters.unitAreas : [],
  );
  const [selectedShiftTimes, setSelectedShiftTimes] = useState(() =>
    Array.isArray(savedFilters?.shiftTimes) ? savedFilters.shiftTimes : [],
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof savedFilters?.searchQuery === "string"
      ? savedFilters.searchQuery
      : "",
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSchedule, setSwapSchedule] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [timeEntryOpen, setTimeEntryOpen] = useState(false);
  const [timeEntrySchedule, setTimeEntrySchedule] = useState(null);
  const [timeEntrySubmitting, setTimeEntrySubmitting] = useState(false);
  const [timeEntryLoading, setTimeEntryLoading] = useState(false);
  const [activeTimeEntry, setActiveTimeEntry] = useState(null);
  const [qrScanAction, setQrScanAction] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [monthDate, setMonthDate] = useState(new Date());

  const currentMonthKey = useMemo(() => {
    const month = String(monthDate.getMonth() + 1).padStart(2, "0");
    const year = monthDate.getFullYear();
    return `${year}-${month}`;
  }, [monthDate]);

  const [calendarRange, setCalendarRange] = useState({
    start: null,
    end: null,
    title: "",
  });
  const [staffVisibility, setStaffVisibility] = useState(
    () => savedFilters?.staffVisibility || "mine",
  );
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [coverageGaps, setCoverageGaps] = useState([]);

  // Manual per-group staff ordering set by dragging Roster rows; keyed by unit/shift-block group
  const [staffOrderByGroup, setStaffOrderByGroup] = useState(() => {
    try {
      const stored =
        localStorage.getItem(ROSTER_ORDER_STORAGE_KEY) ||
        localStorage.getItem(`easishift_roster_order_${userScopeId}`);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Failed to read roster order from localStorage", e);
      return {};
    }
  });
  const dragStaffRef = useRef(null);

  // Sync filters to localStorage whenever they change
  useEffect(() => {
    try {
      const filterState = {
        roles: selectedRoles,
        statuses: selectedStatuses,
        unitAreas: selectedUnitAreas,
        shiftTimes: selectedShiftTimes,
        searchQuery,
        staffVisibility,
      };
      localStorage.setItem(
        SCHEDULE_FILTERS_STORAGE_KEY,
        JSON.stringify(filterState),
      );
    } catch (e) {
      console.error("Failed to save schedule filters to localStorage", e);
    }
  }, [
    selectedRoles,
    selectedStatuses,
    selectedUnitAreas,
    selectedShiftTimes,
    searchQuery,
    staffVisibility,
    SCHEDULE_FILTERS_STORAGE_KEY,
  ]);

  // Sync custom roster ordering to localStorage whenever it changes
  useEffect(() => {
    try {
      if (Object.keys(staffOrderByGroup).length > 0) {
        localStorage.setItem(
          ROSTER_ORDER_STORAGE_KEY,
          JSON.stringify(staffOrderByGroup),
        );
      }
    } catch (e) {
      console.error("Failed to save roster order to localStorage", e);
    }
  }, [staffOrderByGroup, ROSTER_ORDER_STORAGE_KEY]);

  const roleFilterOptions = useMemo(() => {
    const facilityRoleValues = getRoleOptionsFromFacilityPreferences(
      facilityPreferences,
    ).map((option) => option.value);
    const scheduleRoles = schedules.map((s) => s.role).filter(Boolean);
    const staffRoles = staff.flatMap((member) => getUserRoles(member));
    return Array.from(
      new Set([...facilityRoleValues, ...scheduleRoles, ...staffRoles]),
    ).filter(Boolean);
  }, [schedules, staff, facilityPreferences]);

  const legendRoles = roleFilterOptions;

  const unitAreaFilterOptions = useMemo(() => {
    const prefUnits = Array.isArray(facilityPreferences?.unitAreas)
      ? facilityPreferences.unitAreas
      : [];
    const scheduleUnits = schedules.map((s) => s.unitArea).filter(Boolean);
    const gapUnits = coverageGaps.map((c) => c.unitArea).filter(Boolean);
    return Array.from(new Set([...prefUnits, ...scheduleUnits, ...gapUnits]))
      .filter(Boolean)
      .sort();
  }, [facilityPreferences?.unitAreas, schedules, coverageGaps]);

  const hasActiveFilters =
    selectedRoles.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedUnitAreas.length > 0 ||
    selectedShiftTimes.length > 0 ||
    searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setSelectedRoles([]);
    setSelectedStatuses([]);
    setSelectedUnitAreas([]);
    setSelectedShiftTimes([]);
    setSearchQuery("");
  };

  const getRoleChipStyles = (role) => ({
    px: 1,
    py: 0.35,
    borderRadius: 1,
    backgroundColor: getRoleColor(role),
    color: "#fff",
    fontSize: "0.72rem",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  });

  const getTimeKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const isOvernightShift = (schedule) => {
    if (!schedule?.startTime || !schedule?.endTime) return false;
    const start = new Date(schedule.startTime);
    const end = new Date(schedule.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }
    return end.getTime() <= start.getTime();
  };

  const formatScheduleTimeRange = (schedule, options = {}) => {
    const start = new Date(schedule?.startTime);
    const end = new Date(schedule?.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "";
    }

    const startTime = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTime = end.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const overnightHint =
      options.withNextDayHint && isOvernightShift(schedule) ? " (+1 day)" : "";

    return `${startTime} - ${endTime}${overnightHint}`;
  };

  const formatCompactDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { date: "", time: "" };
    }

    return {
      date: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const formatScheduleDateRange = (schedule) => {
    const start = new Date(schedule?.startTime);
    const end = new Date(schedule?.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "-";
    }

    const startDate = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endDate = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
  };

  const formatCertificationTags = (schedule) => {
    const tags = schedule?.certificationTags;
    if (!Array.isArray(tags) || tags.length === 0) return "-";

    return tags
      .map((tag) => getCertificationTagDisplayName(tag) || String(tag))
      .join(", ");
  };

  const parseLocalDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateKeyToLocalDate = (dateKey) => {
    const [year, month, day] = String(dateKey)
      .split("-")
      .map((part) => Number(part));
    if (!year || !month || !day) return new Date(NaN);
    return new Date(year, month - 1, day);
  };

  const getLocalDateKey = parseLocalDateKey;

  // ---------------------------
  // Roster grouping / short-code helpers
  // ---------------------------
  const roundTimeToHour = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const rounded = new Date(date);
    if (rounded.getMinutes() >= 30) rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(0, 0, 0);
    return rounded;
  };

  const formatHourLabel = (date) =>
    date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const getShiftBlockKey = (schedule) => {
    const start = roundTimeToHour(schedule?.startTime);
    const end = roundTimeToHour(schedule?.endTime);
    if (!start || !end) return "";
    return `${start.getHours()}-${end.getHours()}`;
  };

  const getShiftBlockLabel = (schedule) => {
    const start = roundTimeToHour(schedule?.startTime);
    const end = roundTimeToHour(schedule?.endTime);
    if (!start || !end) return "";
    return `${formatHourLabel(start)}\u2013${formatHourLabel(end)}`;
  };

  const getDistinctBlockKeys = (memberSchedules) => {
    const keys = new Set();
    memberSchedules.forEach((schedule) => {
      const key = getShiftBlockKey(schedule);
      if (key) keys.add(key);
    });
    return keys;
  };

  // Every distinct shift-specific role worked this month, not a single guessed role
  const getScheduleRolesLabel = (memberSchedules) => {
    const roles = new Set();
    memberSchedules.forEach((schedule) => {
      if (schedule.role) roles.add(schedule.role);
    });
    return Array.from(roles)
      .map((role) => getRoleDisplayName(role))
      .join(", ");
  };

  const getDominantGroupInfo = (memberSchedules) => {
    const groups = new Map();
    memberSchedules.forEach((schedule) => {
      const blockKey = getShiftBlockKey(schedule);
      const key = `${schedule.unitArea || ""}||${blockKey}`;
      if (!groups.has(key)) {
        groups.set(key, {
          count: 0,
          sample: schedule,
          unitArea: schedule.unitArea || "",
          blockKey,
        });
      }
      groups.get(key).count += 1;
    });

    let best = null;
    groups.forEach((value) => {
      if (!best) {
        best = value;
        return;
      }

      const hasBestUnit = Boolean(best.unitArea);
      const hasValueUnit = Boolean(value.unitArea);

      if (hasValueUnit !== hasBestUnit) {
        if (hasValueUnit) best = value;
        return;
      }

      if (value.count > best.count) {
        best = value;
        return;
      }

      if (
        value.count === best.count &&
        value.sample.startTime < best.sample.startTime
      ) {
        best = value;
      }
    });

    if (!best) {
      return {
        unitArea: "",
        blockKey: "",
        startHour: 0,
        isRotating: false,
        label: "Unassigned",
      };
    }

    const isRotating = getDistinctBlockKeys(memberSchedules).size > 1;
    const unitLabel = best.unitArea
      ? getUnitAreaDisplayName(best.unitArea)
      : "No Unit Area";
    const roundedStart = roundTimeToHour(best.sample.startTime);

    return {
      unitArea: best.unitArea,
      blockKey: isRotating ? "ROTATING" : best.blockKey,
      startHour: isRotating ? 99 : roundedStart ? roundedStart.getHours() : 0,
      isRotating,
      label: isRotating
        ? `${unitLabel} \u2022 Rotating Shifts`
        : `${unitLabel} \u2022 ${getShiftBlockLabel(best.sample)}`,
    };
  };

  // Export cell text mirrors the on-screen roster card; unit area lives in the group header row
  const getExportShiftCellText = (shift) =>
    [
      getRoleDisplayName(shift.role),
      formatScheduleTimeRange(shift, { withNextDayHint: true }),
    ]
      .filter(Boolean)
      .join("\n");

  const getExportCoverageCellText = (gap, role) => {
    if (!gap) return "";
    return [
      `Needs ${getRoleDisplayName(role)}`,
      gap.startTime || gap.endTime ? formatScheduleTimeRange(gap) : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const getExportEmployeeCellText = (member) =>
    [
      member.name || "Unknown",
      member.groupIsRotating ? "Rotating shifts" : member.rolesLabel,
    ]
      .filter(Boolean)
      .join("\n");

  const getExportEmployeeRolesText = (member) =>
    member.groupIsRotating ? "Rotating shifts" : member.rolesLabel || "";

  // ---------------------------
  // Fetch staff
  // ---------------------------

  // ---------------------------
  // Fetch staff
  // ---------------------------
  const fetchStaff = async () => {
    try {
      const res = await api.get("/auth/users");
      setStaff(res.data);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch schedules", err);
    }
  };

  // Facility-wide open coverage; only managers see this, never personal-schedule-only staff
  const fetchCoverageGaps = async () => {
    if (!canManageSchedules) {
      setCoverageGaps([]);
      return;
    }
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
        })
        .filter((coverage) => coverage.spotsRemaining > 0);
      setCoverageGaps(upcoming);
    } catch (err) {
      console.error("Failed to fetch coverage gaps", err);
      setCoverageGaps([]);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchSchedules();
    fetchCoverageGaps();
  }, []);

  useEffect(() => {
    if (canViewAllSchedules) {
      setStaffVisibility("all");
    }
  }, [canViewAllSchedules]);

  useEffect(() => {
    if (location.state?.openDraftReview) {
      setOpenAutoModal(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (location.state?.openView) {
      setView(location.state.openView);
      // Re-fetch since client-side navigation to the same route may not remount this component
      fetchSchedules();
      fetchCoverageGaps();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  // ---------------------------
  // Modals
  // ---------------------------
  const openEdit = (sched) => {
    setEditingSchedule(sched);
    setOpen(true);
  };

  const openCreate = () => {
    if (!canManageSchedules) return;
    setScheduleFormMode("manual");
    setEditingSchedule(null);
    setManualCoverageFromAuto(null);
    setOpen(true);
  };

  const closeModal = (refresh = false) => {
    setOpen(false);
    setEditingSchedule(null);
    setScheduleFormMode("manual");
    setManualCoverageFromAuto(null);
    if (refresh) {
      fetchSchedules();
      fetchCoverageGaps();
    }
  };

  const openManualFromCoverage = (coverage) => {
    setOpenAutoModal(false);
    setScheduleFormMode("manual");
    setEditingSchedule(null);
    setManualCoverageFromAuto(coverage || null);
    setOpen(true);
  };

  // ---------------------------
  // Delete
  // ---------------------------
  const askDelete = (id) => {
    if (!canManageSchedules) return;
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/schedules/${deleteId}`);
      fetchSchedules();
      fetchCoverageGaps();
    } catch (err) {
      console.error("Failed to delete schedule", err);
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const toggleScheduleSelection = (id) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllPaginated = () => {
    const paginatedIds = paginatedSchedules.map((schedule) => schedule._id);
    const allSelected =
      paginatedIds.length > 0 &&
      paginatedIds.every((id) => selectedScheduleIds.includes(id));

    if (allSelected) {
      setSelectedScheduleIds((prev) =>
        prev.filter((id) => !paginatedIds.includes(id)),
      );
      return;
    }

    setSelectedScheduleIds((prev) =>
      Array.from(new Set([...prev, ...paginatedIds])),
    );
  };

  const confirmBulkDelete = async () => {
    try {
      await api.delete("/schedules/bulk", {
        data: { ids: selectedScheduleIds },
      });
      await fetchSchedules();
      await fetchCoverageGaps();
      setSelectedScheduleIds([]);
    } catch (err) {
      console.error("Failed to delete selected schedules", err);
    } finally {
      setBulkConfirmOpen(false);
    }
  };

  const openSwapRequestModal = (sched) => {
    setSwapSchedule(sched);
    setSwapModalOpen(true);
  };

  const closeSwapRequestModal = () => {
    setSwapModalOpen(false);
    setSwapSchedule(null);
  };

  const openDetailsModal = (sched) => {
    setSelectedSchedule(sched);
    setDetailsOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsOpen(false);
    setSelectedSchedule(null);
  };

  const getEntityId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value?._id || value?.id || "";
  };

  const isCurrentUserSchedule = (schedule) => {
    const scheduleStaffId = String(getEntityId(schedule?.staffId) || "");
    const currentUserId = String(getEntityId(user) || "");
    return Boolean(
      scheduleStaffId && currentUserId && scheduleStaffId === currentUserId,
    );
  };

  const canManageSchedule = (schedule) => {
    if (canManageSchedules) return true;
    return isCurrentUserSchedule(schedule);
  };

  const timeTrackingEnabled = Boolean(
    facilityPreferences?.timeTracking?.enabled,
  );
  const configuredTimeTrackingMode =
    facilityPreferences?.timeTracking?.mode || "open";
  const timeTrackingMode =
    configuredTimeTrackingMode === "geofence"
      ? "qr"
      : configuredTimeTrackingMode === "manual"
        ? "open"
        : configuredTimeTrackingMode;
  const requiresQrToken = timeTrackingMode === "qr";

  const normalizeTimeEntries = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.entries)) return data.entries;
    if (Array.isArray(data?.timeEntries)) return data.timeEntries;
    if (data?.entry) return [data.entry];
    return [];
  };

  const fetchActiveTimeEntry = async () => {
    try {
      setTimeEntryLoading(true);
      const res = await api.get("/time-tracking/me");
      const entries = normalizeTimeEntries(res.data);
      const active =
        res.data?.activeEntry ||
        entries.find((item) => item?.status === "in_progress") ||
        null;
      setActiveTimeEntry(active);
    } catch (err) {
      console.error("Failed to fetch active time entry", err);
      setActiveTimeEntry(null);
    } finally {
      setTimeEntryLoading(false);
    }
  };

  const openTimeEntryModal = async (schedule) => {
    setTimeEntrySchedule(schedule || null);
    setTimeEntryOpen(true);
    await fetchActiveTimeEntry();
  };

  const closeTimeEntryModal = () => {
    setTimeEntryOpen(false);
    setTimeEntrySchedule(null);
    setActiveTimeEntry(null);
    setQrScanAction(null);
  };

  const submitClockInFromSchedule = async (qrToken = "") => {
    if (!timeEntrySchedule?._id) return;

    try {
      setTimeEntrySubmitting(true);
      await api.post("/time-tracking/clock-in", {
        at: new Date().toISOString(),
        source: "web",
        scheduleId: timeEntrySchedule._id,
        ...(requiresQrToken ? { qrToken: String(qrToken || "").trim() } : {}),
      });
      await fetchActiveTimeEntry();
      await fetchSchedules();
      toast.success("Clocked in successfully.");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to clock in for this schedule.",
      );
    } finally {
      setTimeEntrySubmitting(false);
    }
  };

  const handleClockInFromSchedule = async () => {
    if (requiresQrToken) {
      setQrScanAction("clock-in");
      return;
    }
    await submitClockInFromSchedule();
  };

  const submitClockOutFromSchedule = async (qrToken = "") => {
    try {
      setTimeEntrySubmitting(true);
      await api.post("/time-tracking/clock-out", {
        at: new Date().toISOString(),
        source: "web",
        ...(requiresQrToken ? { qrToken: String(qrToken || "").trim() } : {}),
      });
      await fetchActiveTimeEntry();
      await fetchSchedules();
      toast.success("Clocked out successfully.");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to clock out for this schedule.",
      );
    } finally {
      setTimeEntrySubmitting(false);
    }
  };

  const handleClockOutFromSchedule = async () => {
    if (requiresQrToken) {
      setQrScanAction("clock-out");
      return;
    }
    await submitClockOutFromSchedule();
  };

  const handleQrScannedForSchedule = async (token) => {
    const action = qrScanAction;
    const trimmedToken = String(token || "").trim();
    setQrScanAction(null);

    if (!trimmedToken) {
      toast.warning("Invalid QR code. Please try again.");
      return;
    }

    if (action === "clock-in") {
      await submitClockInFromSchedule(trimmedToken);
      return;
    }

    if (action === "clock-out") {
      await submitClockOutFromSchedule(trimmedToken);
    }
  };

  const getOpenBreak = (entry) => {
    if (!entry || !Array.isArray(entry.breaks)) return null;
    return entry.breaks.find((item) => item && !item.endAt) || null;
  };

  const handleStartBreakFromSchedule = async () => {
    if (!activeTimeEntry) {
      toast.warning("Clock in first before starting a break.");
      return;
    }

    if (getOpenBreak(activeTimeEntry)) {
      toast.warning("You already have an active break.");
      return;
    }

    try {
      setTimeEntrySubmitting(true);
      await api.post("/time-tracking/breaks/start", {
        at: new Date().toISOString(),
        type: "rest",
        paid: false,
        source: "web",
      });
      await fetchActiveTimeEntry();
      toast.success("Break started.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start break.");
    } finally {
      setTimeEntrySubmitting(false);
    }
  };

  const handleEndBreakFromSchedule = async () => {
    if (!activeTimeEntry) {
      toast.warning("No active time entry found.");
      return;
    }

    if (!getOpenBreak(activeTimeEntry)) {
      toast.warning("No active break to end.");
      return;
    }

    try {
      setTimeEntrySubmitting(true);
      await api.post("/time-tracking/breaks/end", {
        at: new Date().toISOString(),
      });
      await fetchActiveTimeEntry();
      toast.success("Break ended.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to end break.");
    } finally {
      setTimeEntrySubmitting(false);
    }
  };

  const canOpenTimeEntryForSchedule = (schedule) => {
    if (!timeTrackingEnabled) return false;
    if (!canUsePersonalSchedule) return false;
    return isCurrentUserSchedule(schedule);
  };

  const uniqueShiftTimes = useMemo(() => {
    const seen = new Set();
    const options = [];
    schedules.forEach((s) => {
      if (!s.startTime || !s.endTime) return;
      const key = `${getTimeKey(s.startTime)}|${getTimeKey(s.endTime)}`;
      if (!seen.has(key)) {
        seen.add(key);
        const overnightLabel = isOvernightShift(s) ? " (+1 day)" : "";
        options.push({
          key,
          label: `${formatScheduleTimeRange(s, { withNextDayHint: false })}${overnightLabel}`,
        });
      }
    });
    return options.sort((a, b) => a.key.localeCompare(b.key));
  }, [schedules]);

  // ---------------------------
  // Filtered schedules
  // ---------------------------
  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return schedules.filter((s) => {
      const shouldShowMineOnly = canViewAllSchedules
        ? staffVisibility === "mine"
        : true;

      if (shouldShowMineOnly && !isCurrentUserSchedule(s)) return false;

      // Multi-select Role
      if (selectedRoles.length > 0 && !selectedRoles.includes(s.role)) {
        return false;
      }

      // Multi-select Status
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(s.status)) {
        return false;
      }

      // Multi-select Unit Area
      if (
        selectedUnitAreas.length > 0 &&
        !selectedUnitAreas.includes(s.unitArea || "")
      ) {
        return false;
      }

      // Multi-select Shift Time
      if (selectedShiftTimes.length > 0) {
        const shiftKey = `${getTimeKey(s.startTime)}|${getTimeKey(s.endTime)}`;
        if (!selectedShiftTimes.includes(shiftKey)) return false;
      }

      // Search Query (Staff name, notes, role display name, unit area)
      if (query) {
        const staffName = (s.staffId?.name || "").toLowerCase();
        const roleName = getRoleDisplayName(s.role).toLowerCase();
        const unitName = (
          getUnitAreaDisplayName(s.unitArea) || ""
        ).toLowerCase();
        const notes = (s.notes || "").toLowerCase();
        if (
          !staffName.includes(query) &&
          !roleName.includes(query) &&
          !unitName.includes(query) &&
          !notes.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    schedules,
    selectedRoles,
    selectedStatuses,
    selectedUnitAreas,
    selectedShiftTimes,
    searchQuery,
    canViewAllSchedules,
    staffVisibility,
    user,
  ]);

  const paginatedSchedules = useMemo(() => {
    const listOrdered = [...filteredSchedules].sort(
      (a, b) =>
        new Date(b?.startTime).getTime() - new Date(a?.startTime).getTime(),
    );

    return listOrdered.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredSchedules, page, rowsPerPage]);

  const paginatedScheduleIds = paginatedSchedules.map(
    (schedule) => schedule._id,
  );
  const allPaginatedSelected =
    paginatedScheduleIds.length > 0 &&
    paginatedScheduleIds.every((id) => selectedScheduleIds.includes(id));

  // Coverage gaps are a global staffing signal, so hide them in personal-only mode.
  const showCoverageGaps =
    canManageSchedules &&
    !(canViewAllSchedules ? staffVisibility === "mine" : true);

  // Filtered coverage gaps respecting active role, unit area, time, and search filters
  const filteredCoverageGaps = useMemo(() => {
    if (!showCoverageGaps) return [];
    if (selectedStatuses.length > 0) return [];

    return coverageGaps.filter((coverage) => {
      if (selectedRoles.length > 0 && !selectedRoles.includes(coverage.role)) {
        return false;
      }
      if (
        selectedUnitAreas.length > 0 &&
        !selectedUnitAreas.includes(coverage.unitArea || "")
      ) {
        return false;
      }
      if (selectedShiftTimes.length > 0) {
        const shiftKey = `${getTimeKey(coverage.startTime)}|${getTimeKey(coverage.endTime)}`;
        if (!selectedShiftTimes.includes(shiftKey)) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const roleName = getRoleDisplayName(coverage.role).toLowerCase();
        const unitName = (
          getUnitAreaDisplayName(coverage.unitArea) || ""
        ).toLowerCase();
        if (!roleName.includes(query) && !unitName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [
    coverageGaps,
    showCoverageGaps,
    selectedRoles,
    selectedStatuses,
    selectedUnitAreas,
    selectedShiftTimes,
    searchQuery,
  ]);

  // Groups the List view by employee or unit area (Roster's header/coverage-row pattern);
  // "date" mode keeps the existing flat paginated behavior (returns null as a signal).
  const listGroupedRows = useMemo(() => {
    if (listGroupBy === "date") return null;

    const sortedSchedules = [...filteredSchedules].sort(
      (a, b) =>
        new Date(b?.startTime).getTime() - new Date(a?.startTime).getTime(),
    );

    const groupKeyFor = (s) =>
      listGroupBy === "employee"
        ? s.staffId?.name || "Unknown"
        : getUnitAreaDisplayName(s.unitArea) || "No Unit Area";

    const groupsMap = new Map();
    sortedSchedules.forEach((s) => {
      const key = groupKeyFor(s);
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(s);
    });

    const gapsByUnit = new Map();
    if (listGroupBy === "unitArea" && showCoverageGaps) {
      filteredCoverageGaps.forEach((coverage) => {
        const key = getUnitAreaDisplayName(coverage.unitArea) || "No Unit Area";
        if (!gapsByUnit.has(key)) gapsByUnit.set(key, []);
        gapsByUnit.get(key).push(coverage);
      });
    }

    const sortedGroupKeys = Array.from(
      new Set([...groupsMap.keys(), ...gapsByUnit.keys()]),
    ).sort((a, b) => a.localeCompare(b));

    const items = [];
    sortedGroupKeys.forEach((key) => {
      const groupSchedules = groupsMap.get(key) || [];
      items.push({
        type: "header",
        key: `header-${key}`,
        label: key,
        count: groupSchedules.length,
      });
      groupSchedules.forEach((s) => {
        items.push({ type: "schedule", key: s._id, schedule: s });
      });

      (gapsByUnit.get(key) || []).forEach((coverage) => {
        items.push({
          type: "coverage",
          key: `coverage-${coverage._id}`,
          coverage,
        });
      });
    });

    return items;
  }, [filteredSchedules, listGroupBy, filteredCoverageGaps, showCoverageGaps]);

  // Reset page when filters change or filtered length shrinks
  useEffect(() => {
    setPage(0);
  }, [
    selectedRoles,
    selectedStatuses,
    selectedUnitAreas,
    selectedShiftTimes,
    searchQuery,
    staffVisibility,
  ]);

  // ---------------------------
  // Month view helpers
  // ---------------------------
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getMonthStartDay = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getShiftsForStaffOnDate = (staffId, dateStr) => {
    return schedules.filter(
      (s) =>
        s.staffId?._id === staffId && getLocalDateKey(s.startTime) === dateStr,
    );
  };

  const getAllStaffInMonth = useMemo(() => {
    const staffMap = new Map();
    schedules.forEach((s) => {
      const date = new Date(s.startTime);
      if (
        date.getFullYear() === monthDate.getFullYear() &&
        date.getMonth() === monthDate.getMonth()
      ) {
        if (s.staffId?._id && !staffMap.has(s.staffId._id)) {
          staffMap.set(s.staffId._id, s.staffId);
        }
      }
    });
    return Array.from(staffMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [schedules, monthDate]);

  const monthDays = useMemo(() => {
    const daysCount = getDaysInMonth(monthDate);
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push(
        getLocalDateKey(
          new Date(monthDate.getFullYear(), monthDate.getMonth(), i),
        ),
      );
    }
    return days;
  }, [monthDate]);

  const monthYear = monthDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const monthRosterStaffRows = useMemo(() => {
    const inMonthSchedules = filteredSchedules.filter((schedule) => {
      const start = new Date(schedule.startTime);
      return (
        !Number.isNaN(start.getTime()) &&
        start.getFullYear() === monthDate.getFullYear() &&
        start.getMonth() === monthDate.getMonth()
      );
    });

    const staffMap = new Map();
    inMonthSchedules.forEach((schedule) => {
      const staffId = String(schedule?.staffId?._id || "");
      if (!staffId) return;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          staffId,
          name: schedule?.staffId?.name || "Unknown",
        });
      }
    });

    const rows = [];
    staffMap.forEach((member) => {
      const memberSchedules = inMonthSchedules.filter(
        (schedule) => String(schedule?.staffId?._id || "") === member.staffId,
      );

      const groupsByKey = new Map();
      memberSchedules.forEach((schedule) => {
        const blockKey = getShiftBlockKey(schedule);
        const groupKey = `${schedule.unitArea || ""}|${blockKey}`;
        if (!groupsByKey.has(groupKey)) {
          groupsByKey.set(groupKey, []);
        }
        groupsByKey.get(groupKey).push(schedule);
      });

      groupsByKey.forEach((groupSchedules, groupKey) => {
        const shiftsByDay = monthDays.reduce((acc, dayKey) => {
          acc[dayKey] = groupSchedules
            .filter(
              (schedule) =>
                getLocalDateKey(schedule.startTime) === dayKey &&
                `${schedule.unitArea || ""}|${getShiftBlockKey(schedule)}` ===
                  groupKey,
            )
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime(),
            );
          return acc;
        }, {});

        const distinctBlockKeys = getDistinctBlockKeys(groupSchedules);
        const unitArea = groupSchedules[0]?.unitArea || "";
        const unitLabel = unitArea
          ? getUnitAreaDisplayName(unitArea)
          : "No Unit Area";
        const firstShift = groupSchedules[0];
        const roundedStart = roundTimeToHour(firstShift?.startTime);
        const groupStartHour = roundedStart ? roundedStart.getHours() : 0;

        rows.push({
          ...member,
          rolesLabel: getScheduleRolesLabel(groupSchedules),
          shiftsByDay,
          groupKey,
          groupUnitArea: unitArea,
          groupBlockKey:
            distinctBlockKeys.size > 1
              ? "ROTATING"
              : getShiftBlockKey(firstShift),
          groupStartHour,
          groupIsRotating: distinctBlockKeys.size > 1,
          groupLabel:
            distinctBlockKeys.size > 1
              ? `${unitLabel} • Rotating Shifts`
              : `${unitLabel} • ${getShiftBlockLabel(firstShift)}`,
        });
      });
    });

    return rows.sort((a, b) => {
      const unitCompare = getUnitAreaDisplayName(a.groupUnitArea).localeCompare(
        getUnitAreaDisplayName(b.groupUnitArea),
      );
      if (unitCompare !== 0) return unitCompare;
      if (a.groupStartHour !== b.groupStartHour) {
        return a.groupStartHour - b.groupStartHour;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [filteredSchedules, monthDate, monthDays]);

  // One merged gap per unit+block+role+day cell, so each coverage row only ever holds a single role's data
  const coverageGapCellsByRowAndDay = useMemo(() => {
    if (!showCoverageGaps) return new Map();

    const map = new Map();
    filteredCoverageGaps.forEach((coverage) => {
      const start = new Date(coverage.startTime);
      if (
        Number.isNaN(start.getTime()) ||
        start.getFullYear() !== monthDate.getFullYear() ||
        start.getMonth() !== monthDate.getMonth()
      ) {
        return;
      }
      const dayKey = getLocalDateKey(coverage.startTime);
      const groupKey = `${coverage.unitArea || ""}|${getShiftBlockKey(coverage)}`;
      const rowKey = `${groupKey}||${coverage.role || ""}`;
      const cellKey = `${rowKey}|${dayKey}`;

      const existing = map.get(cellKey);
      if (existing) {
        existing.spotsRemaining += Number(coverage.spotsRemaining) || 0;
      } else {
        map.set(cellKey, {
          ...coverage,
          spotsRemaining: Number(coverage.spotsRemaining) || 0,
        });
      }
    });
    return map;
  }, [filteredCoverageGaps, monthDate, showCoverageGaps]);

  // Group info for unit/shift-block combos that only exist in coverage gaps (no staff assigned yet)
  const coverageGapGroupInfoByKey = useMemo(() => {
    const map = new Map();
    if (!showCoverageGaps) return map;

    filteredCoverageGaps.forEach((coverage) => {
      const start = new Date(coverage.startTime);
      if (
        Number.isNaN(start.getTime()) ||
        start.getFullYear() !== monthDate.getFullYear() ||
        start.getMonth() !== monthDate.getMonth()
      ) {
        return;
      }

      const blockKey = getShiftBlockKey(coverage);
      const groupKey = `${coverage.unitArea || ""}|${blockKey}`;
      if (map.has(groupKey)) return;

      const unitLabel = coverage.unitArea
        ? getUnitAreaDisplayName(coverage.unitArea)
        : "No Unit Area";
      const roundedStart = roundTimeToHour(coverage.startTime);

      map.set(groupKey, {
        unitArea: coverage.unitArea || "",
        startHour: roundedStart ? roundedStart.getHours() : 0,
        label: `${unitLabel} \u2022 ${getShiftBlockLabel(coverage)}`,
      });
    });

    return map;
  }, [filteredCoverageGaps, monthDate, showCoverageGaps]);

  // One row key per unit+block+role combo, so each role gets its own dedicated coverage row
  const coverageRowInfoByRowKey = useMemo(() => {
    const map = new Map();
    if (!showCoverageGaps) return map;

    filteredCoverageGaps.forEach((coverage) => {
      const start = new Date(coverage.startTime);
      if (
        Number.isNaN(start.getTime()) ||
        start.getFullYear() !== monthDate.getFullYear() ||
        start.getMonth() !== monthDate.getMonth()
      ) {
        return;
      }

      const blockKey = getShiftBlockKey(coverage);
      const groupKey = `${coverage.unitArea || ""}|${blockKey}`;
      const rowKey = `${groupKey}||${coverage.role || ""}`;
      if (map.has(rowKey)) return;

      map.set(rowKey, {
        groupKey,
        role: coverage.role || "",
      });
    });

    return map;
  }, [filteredCoverageGaps, monthDate, showCoverageGaps]);

  // Coverage row keys bucketed per group, sorted alphabetically by role for stable ordering
  const coverageRowKeysByGroupKey = useMemo(() => {
    const map = new Map();
    coverageRowInfoByRowKey.forEach((info, rowKey) => {
      if (!map.has(info.groupKey)) map.set(info.groupKey, []);
      map.get(info.groupKey).push(rowKey);
    });
    map.forEach((rowKeys) => {
      rowKeys.sort((a, b) =>
        getRoleDisplayName(coverageRowInfoByRowKey.get(a)?.role).localeCompare(
          getRoleDisplayName(coverageRowInfoByRowKey.get(b)?.role),
        ),
      );
    });
    return map;
  }, [coverageRowInfoByRowKey]);

  // Interleaves group-header rows into the sorted roster for on-screen rendering
  const monthRosterGroupedRows = useMemo(() => {
    const items = [];

    const staffGroupsByKey = new Map();
    monthRosterStaffRows.forEach((member) => {
      const groupKey = `${member.groupUnitArea}|${member.groupBlockKey}`;
      if (!staffGroupsByKey.has(groupKey)) {
        staffGroupsByKey.set(groupKey, {
          label: member.groupLabel,
          unitArea: member.groupUnitArea,
          startHour: member.groupStartHour,
          members: [],
        });
      }
      staffGroupsByKey.get(groupKey).members.push(member);
    });

    // Union of staff-only, gap-only, and shared unit/shift-block keys so gaps with
    // zero scheduled staff still get their own group section instead of being dropped.
    const allGroupKeys = new Set([
      ...staffGroupsByKey.keys(),
      ...coverageGapGroupInfoByKey.keys(),
    ]);

    const monthOrderOverride =
      staffOrderByGroup[currentMonthKey] ||
      (!Object.keys(staffOrderByGroup).some((k) => /^\d{4}-\d{2}$/.test(k))
        ? staffOrderByGroup
        : {});

    const groupEntries = Array.from(allGroupKeys).map((groupKey) => {
      const staffGroup = staffGroupsByKey.get(groupKey);
      const gapGroupInfo = coverageGapGroupInfoByKey.get(groupKey);
      const orderOverride = monthOrderOverride[groupKey];
      let members = staffGroup?.members || [];
      if (orderOverride && orderOverride.length > 0) {
        const orderIndex = new Map(
          orderOverride.map((staffId, idx) => [staffId, idx]),
        );
        members = [...members].sort((a, b) => {
          const hasA = orderIndex.has(a.staffId);
          const hasB = orderIndex.has(b.staffId);
          if (hasA && hasB) {
            return orderIndex.get(a.staffId) - orderIndex.get(b.staffId);
          }
          if (hasA) return -1;
          if (hasB) return 1;
          return String(a.name || "").localeCompare(String(b.name || ""));
        });
      }
      return {
        groupKey,
        label: staffGroup?.label || gapGroupInfo?.label || groupKey,
        unitArea: staffGroup?.unitArea ?? gapGroupInfo?.unitArea ?? "",
        startHour: staffGroup?.startHour ?? gapGroupInfo?.startHour ?? 0,
        members,
      };
    });

    groupEntries.sort((a, b) => {
      const unitCompare = getUnitAreaDisplayName(a.unitArea).localeCompare(
        getUnitAreaDisplayName(b.unitArea),
      );
      if (unitCompare !== 0) return unitCompare;
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return String(a.label || "").localeCompare(String(b.label || ""));
    });

    const pushCoverageRowsForGroup = (groupKey) => {
      const rowKeys = coverageRowKeysByGroupKey.get(groupKey) || [];

      rowKeys.forEach((rowKey) => {
        const rowInfo = coverageRowInfoByRowKey.get(rowKey);
        if (!rowInfo) return;

        const gapsByDay = {};
        let maxSlots = 0;
        monthDays.forEach((day) => {
          const cell =
            coverageGapCellsByRowAndDay.get(`${rowKey}|${day}`) || null;
          gapsByDay[day] = cell;
          if (cell) maxSlots = Math.max(maxSlots, cell.spotsRemaining);
        });

        if (maxSlots <= 0) return;

        // One row per open slot, so "3 open" becomes 3 individually clickable rows/cards
        for (let slotIndex = 0; slotIndex < maxSlots; slotIndex += 1) {
          const slotGapsByDay = {};
          monthDays.forEach((day) => {
            const cell = gapsByDay[day];
            slotGapsByDay[day] =
              cell && cell.spotsRemaining > slotIndex ? cell : null;
          });

          items.push({
            type: "coverage",
            key: `coverage-${rowKey}-slot-${slotIndex}`,
            role: rowInfo.role,
            slotIndex,
            slotCount: maxSlots,
            gapsByDay: slotGapsByDay,
          });
        }
      });
    };

    groupEntries.forEach((entry) => {
      items.push({
        type: "header",
        key: `header-${entry.groupKey}-${items.length}`,
        label: entry.label,
      });
      entry.members.forEach((member) => {
        items.push({
          type: "staff",
          key: member.staffId,
          member,
          groupKey: entry.groupKey,
        });
      });
      pushCoverageRowsForGroup(entry.groupKey);
    });

    return items;
  }, [
    monthRosterStaffRows,
    coverageGapGroupInfoByKey,
    coverageRowKeysByGroupKey,
    coverageRowInfoByRowKey,
    coverageGapCellsByRowAndDay,
    monthDays,
    staffOrderByGroup,
    currentMonthKey,
  ]);

  // Current staffId order per group, derived from the rendered rows, used to compute drag/drop reordering
  const groupStaffIdsByGroupKey = useMemo(() => {
    const map = new Map();
    monthRosterGroupedRows.forEach((item) => {
      if (item.type !== "staff") return;
      if (!map.has(item.groupKey)) map.set(item.groupKey, []);
      map.get(item.groupKey).push(item.member.staffId);
    });
    return map;
  }, [monthRosterGroupedRows]);

  const handleStaffDragStart = (e, member, groupKey) => {
    dragStaffRef.current = { staffId: member.staffId, groupKey };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", member.staffId);
    }
  };

  const handleStaffDragEnd = () => {
    dragStaffRef.current = null;
  };

  const handleStaffDropOnRow = (e, targetMember, groupKey) => {
    e.preventDefault();
    const dragged = dragStaffRef.current;
    dragStaffRef.current = null;

    if (!dragged || dragged.groupKey !== groupKey) return;
    if (dragged.staffId === targetMember.staffId) return;

    setStaffOrderByGroup((prev) => {
      const monthOrder = prev[currentMonthKey] || {};
      const existingOrder = monthOrder[groupKey] || [];
      const visibleOrder = groupStaffIdsByGroupKey.get(groupKey) || [];

      // Create a master list that contains all known IDs in order + any visible IDs not yet in the list
      const masterList = [...existingOrder];
      visibleOrder.forEach((id) => {
        if (!masterList.includes(id)) {
          masterList.push(id);
        }
      });

      const fromIndex = masterList.indexOf(dragged.staffId);
      const toIndex = masterList.indexOf(targetMember.staffId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      // Move dragged item to the target position
      const reordered = [...masterList];
      reordered.splice(fromIndex, 1);
      const insertAt = reordered.indexOf(targetMember.staffId);
      if (insertAt === -1) return prev;
      reordered.splice(insertAt, 0, dragged.staffId);

      return {
        ...prev,
        [currentMonthKey]: {
          ...monthOrder,
          [groupKey]: reordered,
        },
      };
    });
  };

  const triggerDownload = (blob, fileName) => {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const getMonthFileStamp = () => {
    const month = String(monthDate.getMonth() + 1).padStart(2, "0");
    const year = monthDate.getFullYear();
    return `${year}-${month}`;
  };

  const getCalendarFileStamp = () => {
    const baseDate =
      calendarRange.start &&
      !Number.isNaN(new Date(calendarRange.start).getTime())
        ? new Date(calendarRange.start)
        : new Date();
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, "0");
    const day = String(baseDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calendarWeekdayLabels = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const visibleCalendarDays = useMemo(() => {
    if (!calendarRange.start || !calendarRange.end) {
      return [];
    }

    const start = new Date(calendarRange.start);
    const end = new Date(calendarRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }

    const days = [];
    const cursor = new Date(start);
    while (cursor < end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [calendarRange]);

  const calendarGridWeeks = useMemo(() => {
    if (visibleCalendarDays.length === 0) return [];

    const schedulesByDay = new Map();
    filteredSchedules.forEach((schedule) => {
      const dayKey = getLocalDateKey(schedule.startTime);
      if (!schedulesByDay.has(dayKey)) {
        schedulesByDay.set(dayKey, []);
      }
      schedulesByDay.get(dayKey).push(schedule);
    });

    const cells = visibleCalendarDays.map((date) => {
      const dayKey = getLocalDateKey(date);
      const shifts = (schedulesByDay.get(dayKey) || []).sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      const lines = shifts.map((shift) => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const startTime = Number.isNaN(start.getTime())
          ? ""
          : start.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
        const endTime = Number.isNaN(end.getTime())
          ? ""
          : end.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
        const unit = getUnitAreaDisplayName(shift.unitArea) || "No unit";
        return `${shift.staffId?.name || "Unknown"} (${startTime}-${endTime}, ${unit})`;
      });

      return {
        dayNumber: date.getDate(),
        text: [`${date.getDate()}`, ...lines].join("\n"),
      };
    });

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [filteredSchedules, visibleCalendarDays]);

  // Coverage gaps within the calendar's visible date range, styled like Roster's "Needs Coverage" cells
  const calendarCoverageGapEvents = useMemo(() => {
    if (!showCoverageGaps) return [];
    if (!calendarRange.start || !calendarRange.end) return [];
    const rangeStartMs = new Date(calendarRange.start).getTime();
    const rangeEndMs = new Date(calendarRange.end).getTime();
    if (Number.isNaN(rangeStartMs) || Number.isNaN(rangeEndMs)) return [];

    return filteredCoverageGaps
      .filter((coverage) => {
        const startMs = new Date(coverage.startTime).getTime();
        return (
          !Number.isNaN(startMs) &&
          startMs >= rangeStartMs &&
          startMs < rangeEndMs
        );
      })
      .map((coverage) => ({
        id: `coverage-gap-${coverage._id}`,
        title: `${coverage.spotsRemaining} open \u2022 ${getRoleDisplayName(coverage.role)}`,
        start: coverage.startTime,
        end: coverage.endTime,
        backgroundColor: "#FECACA",
        borderColor: "#EF4444",
        textColor: "#111827",
        extendedProps: {
          type: "coverage-gap",
          coverage,
        },
      }));
  }, [filteredCoverageGaps, calendarRange, showCoverageGaps]);

  const openExportMenu = (event) => {
    setExportMenuAnchorEl(event.currentTarget);
  };

  const closeExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  const csvEscape = (value) => {
    const stringValue = String(value ?? "");
    if (/[,"\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportRosterToXlsx = async () => {
    try {
      closeExportMenu();
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Wisershifts";
      workbook.lastModifiedBy = "Wisershifts";
      workbook.created = new Date();
      workbook.modified = new Date();

      const sheet = workbook.addWorksheet("Roster", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", xSplit: 1, ySplit: 3 }],
      });

      const headers = [
        "Employee",
        ...monthDays.map((day) => {
          const date = parseDateKeyToLocalDate(day);
          const weekday = date.toLocaleDateString(undefined, {
            weekday: "short",
          });
          const monthDay = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return `${monthDay} (${weekday})`;
        }),
      ];

      sheet.addRow([`${monthYear} Roster`]);
      sheet.mergeCells(1, 1, 1, headers.length);
      sheet.getRow(1).height = 24;
      sheet.getRow(1).font = {
        bold: true,
        size: 14,
        color: { argb: "111827" },
      };
      sheet.getRow(1).alignment = { vertical: "middle", horizontal: "left" };

      sheet.addRow([""]);

      const headerRow = sheet.addRow(headers);
      headerRow.height = 22;
      headerRow.eachCell((cell, colNumber) => {
        const day = monthDays[colNumber - 2];
        const isWeekendCol =
          colNumber > 1 &&
          [0, 6].includes(parseDateKeyToLocalDate(day).getDay());
        cell.font = {
          bold: true,
          size: 9,
          color: { argb: isWeekendCol ? "111827" : "0F172A" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isWeekendCol ? "FEF9C3" : "BDD7EE" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: "CBD5E1" } },
          left: { style: "thin", color: { argb: "CBD5E1" } },
          bottom: { style: "thin", color: { argb: "CBD5E1" } },
          right: { style: "thin", color: { argb: "CBD5E1" } },
        };
      });

      monthRosterGroupedRows.forEach((item) => {
        if (item.type === "header") {
          const groupRow = sheet.addRow([item.label]);
          sheet.mergeCells(groupRow.number, 1, groupRow.number, headers.length);
          groupRow.height = 20;
          const groupCell = groupRow.getCell(1);
          groupCell.font = { bold: true, size: 9, color: { argb: "0F172A" } };
          groupCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "BDD7EE" },
          };
          groupCell.alignment = { vertical: "middle", horizontal: "left" };
          return;
        }

        if (item.type === "coverage") {
          const dayCells = monthDays.map((day) =>
            getExportCoverageCellText(item.gapsByDay[day], item.role),
          );

          const coverageRow = sheet.addRow(["", ...dayCells]);
          coverageRow.eachCell((cell, colNumber) => {
            const isDayCell = colNumber > 1;
            cell.alignment = {
              vertical: isDayCell ? "top" : "middle",
              horizontal: "left",
              wrapText: true,
            };
            cell.border = {
              top: { style: "thin", color: { argb: "E5E7EB" } },
              left: { style: "thin", color: { argb: "E5E7EB" } },
              bottom: { style: "thin", color: { argb: "E5E7EB" } },
              right: { style: "thin", color: { argb: "E5E7EB" } },
            };
            if (isDayCell) {
              const day = monthDays[colNumber - 2];
              const gap = item.gapsByDay[day];
              const isWeekendCol = [0, 6].includes(
                parseDateKeyToLocalDate(day).getDay(),
              );
              cell.font = gap
                ? { size: 8, color: { argb: "B91C1C" } }
                : { size: 8, color: { argb: "334155" } };
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isWeekendCol ? "FEF9C3" : "FFFFFF" },
              };
            }
          });
          return;
        }

        const member = item.member;
        const dayCells = monthDays.map((day) => {
          const shifts = member.shiftsByDay?.[day] || [];
          if (shifts.length === 0) return "";
          return shifts
            .map((shift) => getExportShiftCellText(shift))
            .join("\n");
        });

        const worksheetRow = sheet.addRow(["", ...dayCells]);
        // Rich text so only the name is bold, roles stay regular weight
        worksheetRow.getCell(1).value = {
          richText: [
            {
              font: { bold: true, size: 8, color: { argb: "111827" } },
              text: member.name || "Unknown",
            },
            ...(getExportEmployeeRolesText(member)
              ? [
                  {
                    font: { size: 8, color: { argb: "475569" } },
                    text: `\n${getExportEmployeeRolesText(member)}`,
                  },
                ]
              : []),
          ],
        };
        worksheetRow.eachCell((cell, colNumber) => {
          const isDayCell = colNumber > 1;
          cell.alignment = {
            vertical: "top",
            horizontal: "left",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "E5E7EB" } },
            left: { style: "thin", color: { argb: "E5E7EB" } },
            bottom: { style: "thin", color: { argb: "E5E7EB" } },
            right: { style: "thin", color: { argb: "E5E7EB" } },
          };
          if (isDayCell) {
            const day = monthDays[colNumber - 2];
            const isWeekendCol = [0, 6].includes(
              parseDateKeyToLocalDate(day).getDay(),
            );
            const bg = isWeekendCol ? "FEF9C3" : "FFFFFF";
            cell.font = { size: 8, color: { argb: "334155" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bg },
            };
          }
        });
      });

      sheet.columns = [
        { width: 24 },
        ...monthDays.map(() => ({
          width: 20,
          style: {
            alignment: { wrapText: true, vertical: "top" },
          },
        })),
      ];

      sheet.getRow(3).height = 22;

      const buffer = await workbook.xlsx.writeBuffer();

      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `roster-${getMonthFileStamp()}.xlsx`,
      );
    } catch (error) {
      console.error("Failed to export roster to Excel", error);
      window.alert("Unable to export roster to Excel. Please try again.");
    }
  };

  const exportRosterToPdf = () => {
    try {
      closeExportMenu();
      const generatedAt = new Date();
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const headers = [
        "Employee",
        ...monthDays.map((day) => {
          const date = parseDateKeyToLocalDate(day);
          const weekday = date.toLocaleDateString(undefined, {
            weekday: "short",
          });
          const monthDay = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return `${monthDay} (${weekday})`;
        }),
      ];

      const isWeekendByDay = monthDays.map((day) =>
        [0, 6].includes(parseDateKeyToLocalDate(day).getDay()),
      );

      const pdfBody = [];
      const pdfBodyMeta = [];

      monthRosterGroupedRows.forEach((item) => {
        if (item.type === "header") {
          pdfBody.push([
            {
              content: item.label,
              colSpan: headers.length,
              styles: { halign: "left", fontStyle: "bold" },
            },
          ]);
          pdfBodyMeta.push({ type: "header" });
          return;
        }

        if (item.type === "coverage") {
          const dayCells = monthDays.map((day) =>
            getExportCoverageCellText(item.gapsByDay[day], item.role),
          );
          const dayHasGap = monthDays.map((day) =>
            Boolean(item.gapsByDay[day]),
          );

          pdfBody.push(["", ...dayCells]);
          pdfBodyMeta.push({ type: "coverage", dayHasGap });
          return;
        }

        const member = item.member;
        const dayCells = monthDays.map((day) => {
          const shifts = member.shiftsByDay?.[day] || [];
          if (shifts.length === 0) return "";
          return shifts
            .map((shift) => getExportShiftCellText(shift))
            .join("\n");
        });
        const dayStatuses = monthDays.map((day) => {
          const shifts = member.shiftsByDay?.[day] || [];
          return shifts[0]?.status || null;
        });

        pdfBody.push([getExportEmployeeCellText(member), ...dayCells]);
        pdfBodyMeta.push({
          type: "data",
          dayStatuses,
          name: member.name || "Unknown",
          roles: getExportEmployeeRolesText(member),
        });
      });

      const drawRosterHeader = () => {
        doc.setFillColor(17, 24, 39);
        doc.rect(18, 16, doc.internal.pageSize.getWidth() - 36, 34, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text(`Roster - ${monthYear}`, 30, 37);
        doc.setFontSize(8.5);
        doc.setFont(undefined, "normal");
        doc.text(
          `Generated ${generatedAt.toLocaleString()}`,
          doc.internal.pageSize.getWidth() - 30,
          37,
          { align: "right" },
        );
      };

      drawRosterHeader();

      autoTable(doc, {
        startY: 58,
        head: [headers],
        body: pdfBody,
        styles: {
          fontSize: 5.4,
          cellPadding: 2.2,
          overflow: "linebreak",
          valign: "top",
          textColor: [51, 65, 85],
          lineColor: [229, 231, 235],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [189, 215, 238],
          textColor: [15, 23, 42],
          fontSize: 5.6,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 96, textColor: [17, 24, 39] },
          ...monthDays.reduce((acc, _day, index) => {
            acc[index + 1] = { cellWidth: 68 };
            return acc;
          }, {}),
        },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0],
        margin: { left: 18, right: 18, top: 62, bottom: 24 },
        didParseCell: (data) => {
          if (data.section === "head") {
            if (
              data.column.index > 0 &&
              isWeekendByDay[data.column.index - 1]
            ) {
              data.cell.styles.fillColor = [254, 249, 195];
              data.cell.styles.textColor = [17, 24, 39];
            }
            return;
          }

          const meta = pdfBodyMeta[data.row.index];
          if (!meta) return;

          if (meta.type === "header") {
            data.cell.styles.fillColor = [189, 215, 238];
            data.cell.styles.textColor = [15, 23, 42];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "left";
            return;
          }

          if (meta.type === "coverage") {
            if (data.column.index > 0) {
              const hasGap = meta.dayHasGap[data.column.index - 1];
              const isWeekendCol = isWeekendByDay[data.column.index - 1];
              data.cell.styles.fillColor = isWeekendCol
                ? [254, 249, 195]
                : [255, 255, 255];
              data.cell.styles.textColor = hasGap
                ? [185, 28, 28]
                : [71, 85, 105];
              data.cell.styles.minCellHeight = 24;
            } else {
              data.cell.styles.fillColor = [255, 255, 255];
            }
            return;
          }

          if (data.column.index > 0) {
            const isWeekendCol = isWeekendByDay[data.column.index - 1];
            data.cell.styles.fillColor = isWeekendCol
              ? [254, 249, 195]
              : [255, 255, 255];
            data.cell.styles.textColor = [71, 85, 105];
            data.cell.styles.minCellHeight = 24;
          }

          if (data.column.index === 0) {
            data.cell.styles.fillColor = [239, 246, 255];
            // Drawn manually in didDrawCell so the name can be bold and roles regular
            data.cell.text = [];
            data.cell.styles.minCellHeight = 24;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 0) return;
          const meta = pdfBodyMeta[data.row.index];
          if (!meta || meta.type !== "data") return;

          const textX = data.cell.x + 2.2;
          let textY = data.cell.y + 6.4;

          doc.setFontSize(5.8);
          doc.setFont(undefined, "bold");
          doc.setTextColor(17, 24, 39);
          doc.text(meta.name, textX, textY);

          if (meta.roles) {
            textY += 6;
            doc.setFontSize(5.4);
            doc.setFont(undefined, "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(meta.roles, textX, textY, {
              maxWidth: data.cell.width - 4.4,
            });
          }
        },
        didDrawPage: (data) => {
          drawRosterHeader();
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            data.settings.margin.left,
            doc.internal.pageSize.getHeight() - 14,
          );
        },
      });

      doc.save(`roster-${getMonthFileStamp()}.pdf`);
    } catch (error) {
      console.error("Failed to export roster to PDF", error);
      window.alert("Unable to export roster to PDF. Please try again.");
    }
  };

  // Printable sign-up sheet: one line per unfilled slot with a blank rule for a name
  const exportOpenCoverageToPdf = () => {
    try {
      closeExportMenu();

      const slots = [];
      coverageGaps.forEach((coverage) => {
        const start = new Date(coverage.startTime);
        if (
          Number.isNaN(start.getTime()) ||
          start.getFullYear() !== monthDate.getFullYear() ||
          start.getMonth() !== monthDate.getMonth()
        ) {
          return;
        }
        for (let i = 0; i < coverage.spotsRemaining; i += 1) {
          slots.push(coverage);
        }
      });

      if (slots.length === 0) {
        window.alert("No open coverage to export for this month.");
        return;
      }

      slots.sort((a, b) => {
        const timeCompare =
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (timeCompare !== 0) return timeCompare;
        const unitCompare = getUnitAreaDisplayName(a.unitArea).localeCompare(
          getUnitAreaDisplayName(b.unitArea),
        );
        if (unitCompare !== 0) return unitCompare;
        return getRoleDisplayName(a.role).localeCompare(
          getRoleDisplayName(b.role),
        );
      });

      const slotsByDay = new Map();
      slots.forEach((slot) => {
        const dayKey = getLocalDateKey(slot.startTime);
        if (!slotsByDay.has(dayKey)) slotsByDay.set(dayKey, []);
        slotsByDay.get(dayKey).push(slot);
      });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 42;
      const bottomLimit = pageHeight - 46;
      const nameLineWidth = 150;
      let y = 0;

      const drawPageHeader = () => {
        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, pageWidth, 62, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont(undefined, "bold");
        doc.text(`Open Shifts - ${monthYear}`, marginX, 30);
        doc.setFontSize(8.5);
        doc.setFont(undefined, "normal");
        doc.text("Write your name next to a shift you can cover.", marginX, 46);
        y = 92;
      };

      const ensureSpace = (needed) => {
        if (y + needed <= bottomLimit) return;
        doc.addPage();
        drawPageHeader();
      };

      drawPageHeader();

      Array.from(slotsByDay.keys()).forEach((dayKey) => {
        const date = parseDateKeyToLocalDate(dayKey);
        ensureSpace(40);

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(
          date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          marginX,
          y,
        );
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.6);
        doc.line(marginX, y + 4, pageWidth - marginX, y + 4);
        y += 20;

        slotsByDay.get(dayKey).forEach((slot) => {
          ensureSpace(22);

          doc.setFontSize(9);
          doc.setFont(undefined, "normal");
          doc.setTextColor(51, 65, 85);

          const label = [
            getRoleDisplayName(slot.role),
            slot.unitArea ? getUnitAreaDisplayName(slot.unitArea) : "",
            formatScheduleTimeRange(slot),
          ]
            .filter(Boolean)
            .join("  |  ");

          doc.text(`-  ${label}`, marginX + 6, y);

          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.5);
          doc.line(
            pageWidth - marginX - nameLineWidth,
            y + 2,
            pageWidth - marginX,
            y + 2,
          );

          y += 22;
        });

        y += 8;
      });

      doc.save(`open-shifts-${getMonthFileStamp()}.pdf`);
    } catch (error) {
      console.error("Failed to export open coverage to PDF", error);
      window.alert("Unable to export open coverage. Please try again.");
    }
  };

  const exportCalendarToPdf = () => {
    try {
      closeExportMenu();

      if (calendarGridWeeks.length === 0) {
        window.alert("No calendar data to export for this view.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const generatedAt = new Date();
      const drawCalendarHeader = () => {
        doc.setFillColor(15, 23, 42);
        doc.rect(18, 16, doc.internal.pageSize.getWidth() - 36, 34, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text(
          `Calendar Export${calendarRange.title ? ` - ${calendarRange.title}` : ""}`,
          30,
          37,
        );
        doc.setFontSize(8.5);
        doc.setFont(undefined, "normal");
        doc.text(
          `Generated ${generatedAt.toLocaleString()}`,
          doc.internal.pageSize.getWidth() - 30,
          37,
          { align: "right" },
        );
      };

      drawCalendarHeader();

      autoTable(doc, {
        startY: 58,
        head: [calendarWeekdayLabels],
        body: calendarGridWeeks.map((week) => week.map((cell) => cell.text)),
        styles: {
          fontSize: 6.2,
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.15,
          overflow: "linebreak",
          valign: "top",
          minCellHeight: 88,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        theme: "grid",
        margin: { left: 20, right: 20, top: 62, bottom: 24 },
        didParseCell: (data) => {
          if (data.section === "head") {
            return;
          }

          const columnIndex = data.column.index;
          if (columnIndex === 0 || columnIndex === 6) {
            data.cell.styles.fillColor = [239, 246, 255];
          } else {
            data.cell.styles.fillColor = [248, 250, 252];
          }

          if (typeof data.cell.raw === "string") {
            const lines = data.cell.raw.split("\n");
            if (lines.length > 0) {
              data.cell.styles.fontStyle = lines.length > 1 ? "normal" : "bold";
            }
          }
        },
        didDrawPage: () => {
          drawCalendarHeader();
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            20,
            doc.internal.pageSize.getHeight() - 14,
          );
        },
      });

      doc.save(`calendar-${getCalendarFileStamp()}.pdf`);
    } catch (error) {
      console.error("Failed to export calendar to PDF", error);
      window.alert("Unable to export calendar to PDF. Please try again.");
    }
  };

  // Shared desktop List-view row, used for both the flat "Date" order and grouped modes
  const renderScheduleTableRow = (s) => (
    <TableRow key={s._id} sx={{ "&:hover": { background: "#f3f4f6" } }}>
      {canManageSchedules && (
        <TableCell padding="checkbox">
          <Checkbox
            size="small"
            checked={selectedScheduleIds.includes(s._id)}
            onChange={() => toggleScheduleSelection(s._id)}
          />
        </TableCell>
      )}
      <TableCell sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: getRoleColor(s.role),
            }}
          />
          <Box sx={{ fontSize: "0.7rem", fontWeight: 600, lineHeight: 1.2 }}>
            {s.staffId?.name || "Unknown"}
          </Box>
        </Box>
      </TableCell>
      <TableCell sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}>
        <Box component="span" sx={getRoleChipStyles(s.role)}>
          {getRoleDisplayName(s.role)}
        </Box>
      </TableCell>
      <TableCell sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}>
        <Typography
          sx={{ fontSize: "0.72rem", fontWeight: 600, lineHeight: 1.2 }}
        >
          {formatCompactDateTime(s.startTime).date}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.66rem", color: "text.secondary", lineHeight: 1.1 }}
        >
          {formatCompactDateTime(s.startTime).time}
        </Typography>
      </TableCell>
      <TableCell sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}>
        <Typography
          sx={{ fontSize: "0.72rem", fontWeight: 600, lineHeight: 1.2 }}
        >
          {formatCompactDateTime(s.endTime).date}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.66rem", color: "text.secondary", lineHeight: 1.1 }}
        >
          {formatCompactDateTime(s.endTime).time}
        </Typography>
      </TableCell>
      <TableCell sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}>
        {getUnitAreaDisplayName(s.unitArea)}
      </TableCell>
      <TableCell sx={{ py: 0.75 }}>
        <Box
          component="span"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.3,
            borderRadius: 1,
            border: `1px solid ${getScheduleStatusColor(s.status)}`,
            color: getScheduleStatusColor(s.status),
            fontWeight: 700,
            fontSize: "0.64rem",
            background: "#fff",
            letterSpacing: 0.2,
          }}
        >
          {getScheduleStatusLabel(s.status)}
        </Box>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap", py: 0.75 }}>
        <Tooltip title="View details">
          <IconButton
            size="small"
            onClick={() => openDetailsModal(s)}
            sx={{ mr: 0.5, color: "#475569" }}
          >
            <FiEye />
          </IconButton>
        </Tooltip>
        {canOpenTimeEntryForSchedule(s) && (
          <Tooltip title="Time entry">
            <IconButton
              size="small"
              onClick={() => openTimeEntryModal(s)}
              sx={{ mr: 0.5, color: "#0f766e" }}
            >
              <FiClock />
            </IconButton>
          </Tooltip>
        )}
        {canManageSchedule(s) && (
          <Tooltip title="Edit schedule">
            <IconButton
              size="small"
              color="info"
              onClick={() => openEdit(s)}
              sx={{ mr: 0.5 }}
            >
              <FiEdit />
            </IconButton>
          </Tooltip>
        )}
        {canUsePersonalSchedule &&
          isCurrentUserSchedule(s) &&
          s.status === "scheduled" && (
            <Tooltip title="Swap shift">
              <IconButton
                size="small"
                onClick={() => openSwapRequestModal(s)}
                sx={{ mr: 0.5, color: "#7c3aed" }}
              >
                <FiRepeat />
              </IconButton>
            </Tooltip>
          )}
        {canManageSchedules && (
          <Tooltip title="Delete schedule">
            <IconButton
              size="small"
              color="error"
              onClick={() => askDelete(s._id)}
            >
              <FiDelete />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );

  // "Needs Coverage" row for the List view, styled like Roster's coverage-gap cells
  const renderCoverageTableRow = (coverage) => (
    <TableRow
      key={`coverage-${coverage._id}`}
      sx={{ background: "#FECACA", "&:hover": { background: "#FCA5A5" } }}
    >
      {canManageSchedules && <TableCell padding="checkbox" />}
      <TableCell sx={{ py: 0.75 }} colSpan={2}>
        <Typography
          sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#111827" }}
        >
          Needs Coverage
        </Typography>
        <Typography sx={{ fontSize: "0.68rem", color: "#111827" }}>
          {coverage.spotsRemaining} open &bull;{" "}
          {getRoleDisplayName(coverage.role)}
        </Typography>
      </TableCell>
      <TableCell sx={{ color: "#111827", fontSize: "0.72rem", py: 0.75 }}>
        {formatCompactDateTime(coverage.startTime).date}
        <Typography
          variant="caption"
          sx={{ display: "block", color: "#111827" }}
        >
          {formatCompactDateTime(coverage.startTime).time}
        </Typography>
      </TableCell>
      <TableCell sx={{ color: "#111827", fontSize: "0.72rem", py: 0.75 }}>
        {formatCompactDateTime(coverage.endTime).date}
        <Typography
          variant="caption"
          sx={{ display: "block", color: "#111827" }}
        >
          {formatCompactDateTime(coverage.endTime).time}
        </Typography>
      </TableCell>
      <TableCell sx={{ color: "#111827", fontSize: "0.72rem", py: 0.75 }}>
        {getUnitAreaDisplayName(coverage.unitArea)}
      </TableCell>
      <TableCell sx={{ py: 0.75 }}>
        <Box
          component="span"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.3,
            borderRadius: 1,
            border: "1px solid #EF4444",
            color: "#111827",
            fontWeight: 700,
            fontSize: "0.64rem",
            background: "#fff",
          }}
        >
          Unfilled
        </Box>
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap", py: 0.75 }}>
        {canManageSchedules && (
          <Tooltip title="Open manual scheduler for this coverage">
            <IconButton
              size="small"
              onClick={() => openManualFromCoverage(coverage)}
              sx={{ color: "#B91C1C" }}
            >
              <FiPlus />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <GlobalStyles
        styles={{
          "@media print": {
            "@page": {
              margin: "0",
            },
            "body:not(.printing-roster) *": { visibility: "hidden" },
            "body.printing-roster *": { visibility: "hidden" },
            "body.printing-roster #roster-print-section, body.printing-roster #roster-print-section *":
              { visibility: "visible" },
            "body.printing-roster #roster-print-section": {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              width: "100%",
              height: "auto",
              overflow: "visible",
              margin: "0 !important",
              padding: "6mm 0 0 0 !important",
            },
            "body.printing-roster #roster-print-section .no-print": {
              display: "none !important",
            },
            "body.printing-roster #roster-print-section table": {
              marginLeft: "0 !important",
            },
            "body.printing-roster #roster-print-section th, body.printing-roster #roster-print-section td":
              {
                paddingLeft: "8px",
              },
            "body.printing-roster table": {
              pageBreakInside: "auto",
            },
            "body.printing-roster tr": {
              pageBreakInside: "avoid",
              breakInside: "avoid",
            },
          },
        }}
      />
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ flexDirection: { xs: "column", md: "row" }, gap: 2 }}
      >
        <Typography
          variant="h5"
          sx={{ fontSize: { xs: "1.1rem", md: "1.25rem" } }}
        >
          Staff Scheduling
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "stretch", md: "flex-end" },
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* View toggle moved next to actions */}
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(e, next) => next && setView(next)}
            sx={{
              backgroundColor: "#f3f4f6",
              borderRadius: 2,
              width: { xs: "100%", md: "auto" },
              "& .MuiToggleButton-root": {
                textTransform: "none",
                color: "#374151",
                px: 1.5,
                py: 0.55,
                fontSize: "0.78rem",
              },
              "& .MuiToggleButton-root.Mui-selected": {
                backgroundColor: "#2563eb",
                color: "#fff",
              },
            }}
            size="small"
          >
            <ToggleButton
              value="table"
              sx={{ width: { xs: "33%", md: "auto" } }}
            >
              <FiList style={{ marginRight: 6 }} /> List
            </ToggleButton>
            <ToggleButton
              value="calendar"
              sx={{ width: { xs: "33%", md: "auto" } }}
            >
              <FiCalendar style={{ marginRight: 6 }} /> Calendar
            </ToggleButton>
            <ToggleButton
              value="month"
              sx={{ width: { xs: "34%", md: "auto" } }}
            >
              <FiPrinter style={{ marginRight: 6 }} /> Roster
            </ToggleButton>
          </ToggleButtonGroup>

          {canManageSchedules && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FiPlayCircle />}
              onClick={() => setGuideOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 1.5,
                py: 0.55,
                minHeight: 32,
                fontSize: "0.78rem",
                width: { xs: "100%", md: "auto" },
                borderColor: "#cbd5e1",
                color: "#334155",
                bgcolor: "#f8fafc",
                fontWeight: 700,
                "&:hover": {
                  borderColor: "#2563EB",
                  bgcolor: "#eff6ff",
                  color: "#1D4ED8",
                },
              }}
            >
              Watch Guide
            </Button>
          )}

          {canManageSchedules && (
            <Button
              size="small"
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => setOpenAutoModal(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 1.75,
                py: 0.55,
                minHeight: 32,
                fontSize: "0.78rem",
                bgcolor: "#1D4ED8",
                color: "#fff",
                width: { xs: "100%", md: "auto" },
                "&:hover": { bgcolor: "#1146b1" },
              }}
            >
              Review AI Drafts
            </Button>
          )}

          {canManageSchedules && view === "table" && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={selectedScheduleIds.length === 0}
              onClick={() => setBulkConfirmOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 1.5,
                py: 0.55,
                minHeight: 32,
                fontSize: "0.78rem",
                width: { xs: "100%", md: "auto" },
              }}
            >
              Delete ({selectedScheduleIds.length})
            </Button>
          )}

          {canUsePersonalSchedule && timeTrackingEnabled && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FiClock />}
              onClick={() => navigate("/time-tracking")}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 1.75,
                py: 0.55,
                minHeight: 32,
                fontSize: "0.78rem",
                width: { xs: "100%", md: "auto" },
              }}
            >
              Clock In/Out
            </Button>
          )}

          {(canManageSchedules || canUsePersonalSchedule) && (
            <Button
              size="small"
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => {
                if (canManageSchedules) {
                  openCreate();
                } else {
                  setScheduleFormMode("pickup");
                  setEditingSchedule(null);
                  setManualCoverageFromAuto(null);
                  setOpen(true);
                }
              }}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 1.75,
                py: 0.55,
                minHeight: 32,
                fontSize: "0.78rem",
                bgcolor: "#111827",
                color: "#fff",
                width: { xs: "100%", md: "auto" },
                "&:hover": { bgcolor: "#0f172a" },
              }}
            >
              {canManageSchedules ? "Manual Scheduler" : "Pick Up Shift"}
            </Button>
          )}

          {(view === "calendar" || view === "month") && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FiDownload />}
                endIcon={<FiChevronDown />}
                onClick={openExportMenu}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.55,
                  minHeight: 32,
                  fontSize: "0.78rem",
                  width: { xs: "100%", md: "auto" },
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportMenuAnchorEl}
                open={Boolean(exportMenuAnchorEl)}
                onClose={closeExportMenu}
              >
                {view === "calendar" && (
                  <MenuItem onClick={exportCalendarToPdf}>
                    <FiPrinter style={{ marginRight: 8 }} /> Export Calendar PDF
                  </MenuItem>
                )}

                {view === "month" && [
                  <MenuItem key="roster-excel" onClick={exportRosterToXlsx}>
                    <FiDownload style={{ marginRight: 8 }} /> Export Roster
                    Excel
                  </MenuItem>,
                  <MenuItem key="roster-pdf" onClick={exportRosterToPdf}>
                    <FiPrinter style={{ marginRight: 8 }} /> Export Roster PDF
                  </MenuItem>,
                  ...(showCoverageGaps
                    ? [
                        <MenuItem
                          key="open-coverage-pdf"
                          onClick={exportOpenCoverageToPdf}
                        >
                          <FiPrinter style={{ marginRight: 8 }} /> Export Open
                          Shifts Sheet
                        </MenuItem>,
                      ]
                    : []),
                ]}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* FILTER BAR */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2,
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          backgroundColor: "#fff",
        }}
      >
        {/* Filter Bar Header / Presets */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <FiFilter color="#4b5563" size={16} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "#1f2937" }}
            >
              Filter Schedules
            </Typography>
            <Chip
              size="small"
              label={`${filteredSchedules.length} match${
                filteredSchedules.length === 1 ? "" : "es"
              }`}
              sx={{
                height: 20,
                fontSize: "0.72rem",
                fontWeight: 600,
                backgroundColor: "#f3f4f6",
                color: "#4b5563",
              }}
            />
          </Box>

          {hasActiveFilters && (
            <Button
              size="small"
              onClick={resetAllFilters}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.25,
                px: 1,
                color: "#6b7280",
                "&:hover": { color: "#ef4444", backgroundColor: "#fee2e2" },
              }}
            >
              Clear all
            </Button>
          )}
        </Box>

        {/* Filter Controls */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          gap={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          flexWrap="wrap"
        >
          {/* Search Field */}
          <TextField
            size="small"
            placeholder="Search staff, role, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              minWidth: { xs: "100%", sm: 220 },
              flex: { sm: 1, md: "initial" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch color="#9ca3af" size={15} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery("")}
                    edge="end"
                  >
                    <FiX size={14} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {canViewAllSchedules && canUsePersonalSchedule && (
            <ToggleButtonGroup
              value={staffVisibility}
              exclusive
              onChange={(e, next) => next && setStaffVisibility(next)}
              size="small"
              sx={{
                backgroundColor: "#f3f4f6",
                borderRadius: 2,
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 1.5,
                  fontSize: "0.8rem",
                },
              }}
            >
              <ToggleButton value="mine">My Schedule</ToggleButton>
              <ToggleButton value="all">Everyone</ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Roles Multi-Select */}
          {canViewAllSchedules && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            >
              <InputLabel id="role-filter-label">Roles</InputLabel>
              <Select
                labelId="role-filter-label"
                multiple
                value={selectedRoles}
                label="Roles"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRoles(
                    typeof val === "string" ? val.split(",") : val,
                  );
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) return "All Roles";
                  if (selected.length === 1) {
                    return getRoleDisplayName(selected[0]);
                  }
                  return `${selected.length} Roles selected`;
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <Button
                    size="small"
                    sx={{ textTransform: "none", p: 0, fontSize: "0.75rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoles(roleFilterOptions);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    sx={{
                      textTransform: "none",
                      p: 0,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoles([]);
                    }}
                  >
                    Clear
                  </Button>
                </Box>
                {roleFilterOptions.map((r) => {
                  const isChecked = selectedRoles.includes(r);
                  return (
                    <MenuItem key={r} value={r} sx={{ py: 0.5 }}>
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        sx={{ p: 0.5, mr: 1 }}
                      />
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: getRoleColor(r),
                          mr: 1,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={getRoleDisplayName(r)}
                        primaryTypographyProps={{ fontSize: "0.85rem" }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          {/* Status Multi-Select */}
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              multiple
              value={selectedStatuses}
              label="Status"
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStatuses(
                  typeof val === "string" ? val.split(",") : val,
                );
              }}
              renderValue={(selected) => {
                if (selected.length === 0) return "All Statuses";
                if (selected.length === 1) {
                  return getScheduleStatusLabel(selected[0]);
                }
                return `${selected.length} Statuses selected`;
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <Button
                  size="small"
                  sx={{ textTransform: "none", p: 0, fontSize: "0.75rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatuses(SCHEDULE_STATUS_FILTER_OPTIONS);
                  }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  sx={{
                    textTransform: "none",
                    p: 0,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatuses([]);
                  }}
                >
                  Clear
                </Button>
              </Box>
              {SCHEDULE_STATUS_FILTER_OPTIONS.map((statusValue) => {
                const isChecked = selectedStatuses.includes(statusValue);
                return (
                  <MenuItem
                    key={statusValue}
                    value={statusValue}
                    sx={{ py: 0.5 }}
                  >
                    <Checkbox
                      checked={isChecked}
                      size="small"
                      sx={{ p: 0.5, mr: 1 }}
                    />
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: getScheduleStatusColor(statusValue),
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={getScheduleStatusLabel(statusValue)}
                      primaryTypographyProps={{ fontSize: "0.85rem" }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Unit Area Multi-Select */}
          {unitAreaFilterOptions.length > 0 && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
            >
              <InputLabel id="unit-filter-label">Unit Area</InputLabel>
              <Select
                labelId="unit-filter-label"
                multiple
                value={selectedUnitAreas}
                label="Unit Area"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedUnitAreas(
                    typeof val === "string" ? val.split(",") : val,
                  );
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) return "All Units";
                  if (selected.length === 1) {
                    return getUnitAreaDisplayName(selected[0]);
                  }
                  return `${selected.length} Units selected`;
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <Button
                    size="small"
                    sx={{ textTransform: "none", p: 0, fontSize: "0.75rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUnitAreas(unitAreaFilterOptions);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    sx={{
                      textTransform: "none",
                      p: 0,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUnitAreas([]);
                    }}
                  >
                    Clear
                  </Button>
                </Box>
                {unitAreaFilterOptions.map((unit) => {
                  const isChecked = selectedUnitAreas.includes(unit);
                  return (
                    <MenuItem key={unit} value={unit} sx={{ py: 0.5 }}>
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        sx={{ p: 0.5, mr: 1 }}
                      />
                      <ListItemText
                        primary={getUnitAreaDisplayName(unit)}
                        primaryTypographyProps={{ fontSize: "0.85rem" }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          {/* Shift Time Multi-Select */}
          {uniqueShiftTimes.length > 0 && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            >
              <InputLabel id="shift-time-filter-label">Shift Time</InputLabel>
              <Select
                labelId="shift-time-filter-label"
                multiple
                value={selectedShiftTimes}
                label="Shift Time"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedShiftTimes(
                    typeof val === "string" ? val.split(",") : val,
                  );
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) return "All Shift Times";
                  if (selected.length === 1) {
                    const opt = uniqueShiftTimes.find(
                      (t) => t.key === selected[0],
                    );
                    return opt ? opt.label : selected[0];
                  }
                  return `${selected.length} Times selected`;
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <Button
                    size="small"
                    sx={{ textTransform: "none", p: 0, fontSize: "0.75rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShiftTimes(uniqueShiftTimes.map((t) => t.key));
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    sx={{
                      textTransform: "none",
                      p: 0,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShiftTimes([]);
                    }}
                  >
                    Clear
                  </Button>
                </Box>
                {uniqueShiftTimes.map((t) => {
                  const isChecked = selectedShiftTimes.includes(t.key);
                  return (
                    <MenuItem key={t.key} value={t.key} sx={{ py: 0.5 }}>
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        sx={{ p: 0.5, mr: 1 }}
                      />
                      <ListItemText
                        primary={t.label}
                        primaryTypographyProps={{ fontSize: "0.85rem" }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Active Filters Chips Tray */}
        {hasActiveFilters && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px dashed #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 600, mr: 0.5 }}
            >
              Active filters:
            </Typography>

            {searchQuery.trim() && (
              <Chip
                size="small"
                label={`Search: "${searchQuery}"`}
                onDelete={() => setSearchQuery("")}
                sx={{ fontSize: "0.75rem", backgroundColor: "#f3f4f6" }}
              />
            )}

            {selectedRoles.map((role) => (
              <Chip
                key={role}
                size="small"
                label={`Role: ${getRoleDisplayName(role)}`}
                onDelete={() =>
                  setSelectedRoles((prev) => prev.filter((r) => r !== role))
                }
                avatar={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: getRoleColor(role),
                      ml: 1,
                    }}
                  />
                }
                sx={{
                  fontSize: "0.75rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            ))}

            {selectedStatuses.map((status) => (
              <Chip
                key={status}
                size="small"
                label={`Status: ${getScheduleStatusLabel(status)}`}
                onDelete={() =>
                  setSelectedStatuses((prev) =>
                    prev.filter((s) => s !== status),
                  )
                }
                avatar={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: getScheduleStatusColor(status),
                      ml: 1,
                    }}
                  />
                }
                sx={{
                  fontSize: "0.75rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            ))}

            {selectedUnitAreas.map((unit) => (
              <Chip
                key={unit}
                size="small"
                label={`Unit: ${getUnitAreaDisplayName(unit)}`}
                onDelete={() =>
                  setSelectedUnitAreas((prev) => prev.filter((u) => u !== unit))
                }
                sx={{
                  fontSize: "0.75rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              />
            ))}

            {selectedShiftTimes.map((key) => {
              const opt = uniqueShiftTimes.find((t) => t.key === key);
              return (
                <Chip
                  key={key}
                  size="small"
                  label={`Time: ${opt ? opt.label : key}`}
                  onDelete={() =>
                    setSelectedShiftTimes((prev) =>
                      prev.filter((k) => k !== key),
                    )
                  }
                  sx={{
                    fontSize: "0.75rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                />
              );
            })}

            <Button
              size="small"
              color="inherit"
              onClick={resetAllFilters}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                color: "#ef4444",
                ml: "auto",
                "&:hover": { backgroundColor: "#fee2e2" },
              }}
            >
              Reset all
            </Button>
          </Box>
        )}
      </Paper>

      {view === "table" && !isCompact && (
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          sx={{ mt: 1.5, flexWrap: "wrap" }}
        >
          <Typography
            color="text.secondary"
            sx={{ fontSize: "0.78rem", minWidth: 70 }}
          >
            Group by:
          </Typography>
          <ToggleButtonGroup
            value={listGroupBy}
            exclusive
            onChange={(e, next) => next && setListGroupBy(next)}
            size="small"
            sx={{
              backgroundColor: "#f3f4f6",
              borderRadius: 2,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 1.5,
              },
            }}
          >
            <ToggleButton value="date">Date</ToggleButton>
            <ToggleButton value="employee">Employee</ToggleButton>
            <ToggleButton value="unitArea">Unit Area</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* TABLE VIEW */}
      {view === "table" ? (
        isCompact ? (
          <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
            {paginatedSchedules.map((s) => (
              <Paper key={s._id} sx={{ p: 2 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1.5}
                >
                  <Box>
                    {canManageSchedules && (
                      <Checkbox
                        size="small"
                        checked={selectedScheduleIds.includes(s._id)}
                        onChange={() => toggleScheduleSelection(s._id)}
                        sx={{ p: 0, mb: 0.5 }}
                      />
                    )}
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {s.staffId?.name || "Unknown"}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {getRoleDisplayName(s.role)} •{" "}
                      {formatScheduleDateRange(s)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {formatScheduleTimeRange(s)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      Unit Area: {getUnitAreaDisplayName(s.unitArea)}
                    </Typography>
                    {isOvernightShift(s) && (
                      <Typography
                        sx={{ fontSize: 11, color: "info.main", mt: 0.5 }}
                      >
                        Overnight shift
                      </Typography>
                    )}
                    <Box mt={0.75}>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          px: 1,
                          py: 0.3,
                          borderRadius: 1,
                          border: `1px solid ${getScheduleStatusColor(s.status)}`,
                          color: getScheduleStatusColor(s.status),
                          fontWeight: 700,
                          fontSize: "0.64rem",
                          background: "#fff",
                          letterSpacing: 0.2,
                        }}
                      >
                        {getScheduleStatusLabel(s.status)}
                      </Box>
                    </Box>
                  </Box>
                  <Stack spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FiEye />}
                      onClick={() => openDetailsModal(s)}
                    >
                      View
                    </Button>
                    {canOpenTimeEntryForSchedule(s) && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<FiClock />}
                        onClick={() => openTimeEntryModal(s)}
                        sx={{ textTransform: "none" }}
                      >
                        Time Entry
                      </Button>
                    )}
                    {canManageSchedule(s) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
                    )}
                    {canUsePersonalSchedule &&
                      isCurrentUserSchedule(s) &&
                      s.status === "scheduled" && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<FiRepeat />}
                          onClick={() => openSwapRequestModal(s)}
                          sx={{ textTransform: "none" }}
                        >
                          Swap Shift
                        </Button>
                      )}
                    {canManageSchedules && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => askDelete(s._id)}
                      >
                        Delete
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Paper>
            ))}

            <Box display="flex" justifyContent="center">
              <TablePagination
                component="div"
                count={filteredSchedules.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Box>
          </Box>
        ) : (
          <>
            <Table sx={{ mt: 2, background: "white" }} size="small">
              <TableHead>
                <TableRow sx={{ background: "#F8FAFC" }}>
                  {canManageSchedules && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allPaginatedSelected}
                        indeterminate={
                          selectedScheduleIds.length > 0 &&
                          !allPaginatedSelected
                        }
                        onChange={toggleSelectAllPaginated}
                      />
                    </TableCell>
                  )}
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Staff
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Role
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Start
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    End
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Unit Area
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {listGroupBy === "date"
                  ? paginatedSchedules.map((s) => renderScheduleTableRow(s))
                  : (listGroupedRows || []).map((item) => {
                      if (item.type === "header") {
                        return (
                          <TableRow key={item.key}>
                            <TableCell
                              colSpan={canManageSchedules ? 8 : 7}
                              sx={{
                                background: "#e2e8f0",
                                color: "#0f172a",
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                py: 0.6,
                              }}
                            >
                              {item.label} ({item.count})
                            </TableCell>
                          </TableRow>
                        );
                      }

                      if (item.type === "coverage") {
                        return renderCoverageTableRow(item.coverage);
                      }

                      return renderScheduleTableRow(item.schedule);
                    })}
              </TableBody>
            </Table>

            {listGroupBy === "date" ? (
              <TablePagination
                component="div"
                count={filteredSchedules.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{ mt: 1 }}
              />
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, textAlign: "right" }}
              >
                Showing all {filteredSchedules.length} schedule(s), grouped
              </Typography>
            )}
          </>
        )
      ) : view === "month" ? (
        <Box
          id="roster-print-section"
          sx={{ mt: 3, "@media print": { mt: 0 } }}
        >
          {/* Month view header with navigation */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              mb: 1.25,
              gap: 1.25,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: "0.95rem" }}
            >
              {monthYear}
            </Typography>
            <Stack direction="row" spacing={0.5} className="no-print">
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setMonthDate(
                    new Date(monthDate.getFullYear(), monthDate.getMonth() - 1),
                  )
                }
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMonthDate(new Date())}
              >
                Today
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setMonthDate(
                    new Date(monthDate.getFullYear(), monthDate.getMonth() + 1),
                  )
                }
              >
                Next
              </Button>
            </Stack>
          </Box>

          {/* Schedule matrix table */}
          <Box
            sx={{
              background: "white",
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              overflowX: "auto",
              "@media print": {
                border: "none",
                borderRadius: 0,
                overflowX: "visible",
              },
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: Math.max(880, 210 + monthDays.length * 140),
              }}
            >
              <TableHead>
                <TableRow sx={{ background: "#BDD7EE" }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: 175,
                      minWidth: 175,
                      borderRight: "1px solid #e5e7eb",
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      background: "#BDD7EE",
                      color: "#0F172A",
                      py: 0.7,
                    }}
                  >
                    Employee
                  </TableCell>
                  {monthDays.map((day) => {
                    const date = parseDateKeyToLocalDate(day);
                    const isWeekend =
                      date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <TableCell
                        key={day}
                        sx={{
                          fontWeight: 700,
                          minWidth: 140,
                          borderLeft: "1px solid #eef2f7",
                          background: isWeekend ? "#FEF9C3" : "#BDD7EE",
                          color: isWeekend ? "#111827" : "#0F172A",
                          py: 0.7,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.64rem",
                            fontWeight: 700,
                            color: "inherit",
                          }}
                        >
                          {date.toLocaleDateString("default", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.58rem",
                            fontWeight: 600,
                            color: "inherit",
                            opacity: 0.8,
                          }}
                        >
                          {date.toLocaleDateString("default", {
                            weekday: "short",
                          })}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {monthRosterGroupedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={monthDays.length + 1}
                      sx={{
                        py: 3,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                    >
                      No roster entries for this month with current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthRosterGroupedRows.map((item) => {
                    if (item.type === "header") {
                      return (
                        <TableRow key={item.key}>
                          <TableCell
                            colSpan={monthDays.length + 1}
                            sx={{
                              background: "#BDD7EE",
                              color: "#0F172A",
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              py: 0.6,
                              position: "sticky",
                              left: 0,
                            }}
                          >
                            {item.label}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (item.type === "coverage") {
                      return (
                        <TableRow key={item.key}>
                          <TableCell
                            sx={{
                              borderRight: "1px solid #e5e7eb",
                              verticalAlign: "top",
                              position: "sticky",
                              left: 0,
                              zIndex: 2,
                              background: "#fff",
                              minWidth: 175,
                              py: 0.65,
                            }}
                          />

                          {monthDays.map((day) => {
                            const gap = item.gapsByDay[day];
                            const date = parseDateKeyToLocalDate(day);
                            const isWeekend =
                              date.getDay() === 0 || date.getDay() === 6;
                            const certTags = Array.isArray(
                              gap?.requiredCertificationTags,
                            )
                              ? gap.requiredCertificationTags
                              : [];
                            return (
                              <TableCell
                                key={`${item.key}-${day}`}
                                sx={{
                                  minWidth: 140,
                                  verticalAlign: "top",
                                  borderLeft: "1px solid #eef2f7",
                                  background: isWeekend ? WEEKEND_BG : "#fff",
                                  py: 0.35,
                                }}
                              >
                                {gap ? (
                                  <Tooltip title="Open manual scheduler for this coverage">
                                    <Box
                                      onClick={() => {
                                        if (canManageSchedules)
                                          openManualFromCoverage(gap);
                                      }}
                                      sx={{
                                        border: "1px solid #FCA5A5",
                                        borderLeft: "3px solid #EF4444",
                                        borderRadius: 1,
                                        px: 0.5,
                                        py: 0.32,
                                        background: "transparent",
                                        cursor: canManageSchedules
                                          ? "pointer"
                                          : "default",
                                        "&:hover": canManageSchedules
                                          ? { background: "#FEF2F2" }
                                          : {},
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#B91C1C",
                                          lineHeight: 1.15,
                                        }}
                                      >
                                        Needs {getRoleDisplayName(item.role)}
                                      </Typography>
                                      {gap.unitArea && (
                                        <Typography
                                          sx={{
                                            fontSize: "0.56rem",
                                            color: "#B91C1C",
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {getUnitAreaDisplayName(gap.unitArea)}
                                        </Typography>
                                      )}
                                      {(gap.startTime || gap.endTime) && (
                                        <Typography
                                          sx={{
                                            fontSize: "0.56rem",
                                            color: "#B91C1C",
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {formatScheduleTimeRange(gap)}
                                        </Typography>
                                      )}
                                      {certTags.length > 0 && (
                                        <Typography
                                          sx={{
                                            fontSize: "0.54rem",
                                            color: "#B91C1C",
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {certTags
                                            .map((tag) =>
                                              getCertificationTagDisplayName(
                                                tag,
                                              ),
                                            )
                                            .join(", ")}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Tooltip>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: "0.7rem",
                                      color: "#cbd5e1",
                                    }}
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    }

                    const member = item.member;

                    return (
                      <TableRow
                        key={member.staffId}
                        draggable={canManageSchedules}
                        onDragStart={(e) =>
                          handleStaffDragStart(e, member, item.groupKey)
                        }
                        onDragOver={(e) => {
                          if (canManageSchedules) e.preventDefault();
                        }}
                        onDragEnd={handleStaffDragEnd}
                        onDrop={(e) =>
                          handleStaffDropOnRow(e, member, item.groupKey)
                        }
                        sx={{
                          userSelect: "none",
                          "&:hover": { background: "#f8fbff" },
                          "@media print": { pageBreakInside: "avoid" },
                          cursor: canManageSchedules ? "grab" : "default",
                          "&:active": {
                            cursor: canManageSchedules ? "grabbing" : "default",
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            borderRight: "1px solid #e5e7eb",
                            verticalAlign: "top",
                            position: "sticky",
                            left: 0,
                            zIndex: 2,
                            background: "#fff",
                            minWidth: 175,
                            py: 0.65,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                            }}
                          >
                            {canManageSchedules && (
                              <Tooltip
                                title="Drag to reorder"
                                arrow
                                placement="top"
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#94a3b8",
                                    cursor: "grab",
                                    p: 0.25,
                                    borderRadius: 1,
                                    "&:hover": {
                                      color: "#2563eb",
                                      backgroundColor: "#eff6ff",
                                    },
                                    "&:active": {
                                      cursor: "grabbing",
                                    },
                                  }}
                                >
                                  <MdDragIndicator size={16} />
                                </Box>
                              </Tooltip>
                            )}
                            <Box>
                              <Typography
                                sx={{ fontSize: "0.68rem", fontWeight: 700 }}
                              >
                                {member.name}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "0.58rem",
                                  color: member.groupIsRotating
                                    ? "#B45309"
                                    : "text.secondary",
                                  mt: 0,
                                }}
                              >
                                {member.groupIsRotating
                                  ? "Rotating shifts"
                                  : member.rolesLabel || "Role"}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {monthDays.map((day) => {
                          const shifts = member.shiftsByDay[day] || [];
                          const date = parseDateKeyToLocalDate(day);
                          const isWeekend =
                            date.getDay() === 0 || date.getDay() === 6;

                          return (
                            <TableCell
                              key={`${member.staffId}-${day}`}
                              sx={{
                                minWidth: 140,
                                verticalAlign: "top",
                                borderLeft: "1px solid #eef2f7",
                                background: isWeekend ? WEEKEND_BG : "#fff",
                                py: 0.35,
                              }}
                            >
                              {shifts.length === 0 ? (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.disabled",
                                    fontStyle: "italic",
                                    fontSize: "0.58rem",
                                  }}
                                >
                                  -
                                </Typography>
                              ) : (
                                <Stack spacing={0.35}>
                                  {shifts.map((shift) => (
                                    <Tooltip
                                      key={shift._id}
                                      title={`${formatScheduleTimeRange(shift, {
                                        withNextDayHint: true,
                                      })} \u2022 ${getScheduleStatusLabel(shift.status)}`}
                                    >
                                      <Box
                                        onClick={() => {
                                          if (canManageSchedule(shift))
                                            openEdit(shift);
                                        }}
                                        sx={{
                                          position: "relative",
                                          border: "1px solid #dbeafe",
                                          borderLeft: `3px solid ${getRoleColor(shift.role)}`,
                                          borderRadius: 1,
                                          px: 0.5,
                                          py: 0.32,
                                          background: "transparent",
                                          cursor: canManageSchedule(shift)
                                            ? "pointer"
                                            : "default",
                                          "&:hover": canManageSchedule(shift)
                                            ? { background: "#f0f7ff" }
                                            : {},
                                          "&:hover .roster-shift-actions": {
                                            opacity: 1,
                                          },
                                          "@media print": {
                                            px: 0.35,
                                            py: 0.22,
                                          },
                                        }}
                                      >
                                        {(canManageSchedule(shift) ||
                                          canManageSchedules ||
                                          (canUsePersonalSchedule &&
                                            isCurrentUserSchedule(shift) &&
                                            shift.status === "scheduled")) && (
                                          <Box
                                            className="roster-shift-actions"
                                            sx={{
                                              position: "absolute",
                                              top: 1,
                                              right: 1,
                                              display: "flex",
                                              gap: 0.1,
                                              opacity: 0,
                                              transition: "opacity 0.15s ease",
                                              "@media print": {
                                                display: "none",
                                              },
                                            }}
                                          >
                                            {canManageSchedule(shift) && (
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openEdit(shift);
                                                }}
                                                sx={{ p: 0.2 }}
                                              >
                                                <FiEdit2 size={11} />
                                              </IconButton>
                                            )}
                                            {canUsePersonalSchedule &&
                                              isCurrentUserSchedule(shift) &&
                                              shift.status === "scheduled" && (
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openSwapRequestModal(shift);
                                                  }}
                                                  sx={{
                                                    p: 0.2,
                                                    color: "#7c3aed",
                                                  }}
                                                >
                                                  <FiRepeat size={11} />
                                                </IconButton>
                                              )}
                                            {canManageSchedules && (
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  askDelete(shift._id);
                                                }}
                                                sx={{ p: 0.2 }}
                                              >
                                                <FiDelete size={11} />
                                              </IconButton>
                                            )}
                                          </Box>
                                        )}
                                        <Typography
                                          sx={{
                                            fontSize: "0.6rem",
                                            fontWeight: 700,
                                            color: "#111827",
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {getRoleDisplayName(shift.role)}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.54rem",
                                            color: "#111827",
                                            lineHeight: 1.1,
                                            mt: 0,
                                          }}
                                        >
                                          {getUnitAreaDisplayName(
                                            shift.unitArea,
                                          ) || "No unit"}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.54rem",
                                            color: "#111827",
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {formatScheduleTimeRange(shift, {
                                            withNextDayHint: true,
                                          })}
                                        </Typography>
                                      </Box>
                                    </Tooltip>
                                  ))}
                                </Stack>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>

          {/* Print-friendly legend */}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              "@media print": { mt: 1 },
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Role Legend:
            </Typography>
            {legendRoles.map((role) => (
              <Box
                key={role}
                display="flex"
                alignItems="center"
                gap={0.5}
                sx={{ "@media print": { fontSize: "9px" } }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 1,
                    background: getRoleColor(role),
                  }}
                />
                <Typography variant="caption">
                  {getRoleDisplayName(role)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Box
          mt={3}
          sx={{
            background:
              "linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(239,246,255,0.92) 100%)",
            borderRadius: 3,
            p: { xs: 1.5, md: 2 },
            border: "1px solid #DBEAFE",
          }}
        >
          <GlobalStyles
            styles={{
              ".fc": {
                "--fc-border-color": "#D6E4FF",
                "--fc-page-bg-color": "transparent",
              },
              ".fc .fc-toolbar": {
                marginBottom: "0.9rem",
                gap: "0.5rem",
              },
              ".fc .fc-toolbar-title": {
                color: "#0F172A",
                fontWeight: 800,
                fontSize: "1.05rem",
                letterSpacing: "0.01em",
              },
              ".fc .fc-button": {
                background: "#FFFFFF",
                border: "1px solid #BFDBFE",
                color: "#1E3A8A",
                boxShadow: "none",
                textTransform: "capitalize",
                borderRadius: "8px",
                fontWeight: 600,
              },
              ".fc .fc-button:hover": {
                background: "#EFF6FF",
                borderColor: "#93C5FD",
              },
              ".fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active":
                {
                  background: "#1D4ED8",
                  borderColor: "#1D4ED8",
                  color: "#FFFFFF",
                },
              ".fc .fc-scrollgrid": {
                border: "1px solid #BFDBFE",
                borderRadius: "14px",
                overflow: "hidden",
                background: "#fff",
              },
              ".fc .fc-col-header-cell-cushion": {
                color: "#1E3A8A",
                fontWeight: 700,
                fontSize: "0.74rem",
                padding: "0.6rem 0.35rem",
              },
              ".fc .fc-col-header-cell": {
                backgroundColor: "#EFF6FF",
              },
              ".fc .fc-daygrid-day-number": {
                color: "#0F172A",
                fontWeight: 700,
                fontSize: "0.74rem",
              },
              ".fc .fc-daygrid-day": {
                backgroundColor: "#FFFFFF",
              },
              ".fc .fc-daygrid-day.fc-day-today": {
                backgroundColor: "#EFF6FF",
              },
              ".fc .fc-daygrid-day.weekend-day-cell:not(.fc-day-today)": {
                backgroundColor: WEEKEND_BG,
              },
              ".fc .fc-day-other .fc-daygrid-day-top": {
                opacity: 0.5,
              },
              ".fc .fc-daygrid-day-frame": {
                minHeight: "108px",
                padding: "4px 4px 6px",
              },
              ".fc .fc-daygrid-day-events": {
                marginTop: "4px",
              },
              ".fc-daygrid-event": {
                border: "none",
                borderRadius: "9px",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.14)",
                padding: "0",
                marginTop: "3px",
              },
              ".fc .fc-daygrid-event .fc-event-main": {
                padding: "0",
              },
              ".fc .fc-daygrid-more-link": {
                color: "#1D4ED8",
                fontWeight: 700,
                fontSize: "0.7rem",
                borderRadius: "8px",
                padding: "1px 6px",
                backgroundColor: "#EFF6FF",
              },
              ".fc .fc-popover": {
                backgroundColor: "#FFFFFF",
                border: "1px solid #BFDBFE",
                borderRadius: "12px",
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.2)",
                overflow: "hidden",
                zIndex: 30,
              },
              ".fc .fc-popover-header": {
                backgroundColor: "#EFF6FF",
                borderBottom: "1px solid #DBEAFE",
                padding: "6px 10px",
              },
              ".fc .fc-popover-title": {
                color: "#0F172A",
                fontWeight: 700,
                fontSize: "0.78rem",
              },
              ".fc .fc-popover-close": {
                color: "#1E3A8A",
                opacity: 0.8,
              },
              ".fc .fc-popover-body": {
                backgroundColor: "#FFFFFF",
                padding: "4px",
              },
            }}
          />

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            editable={canManageSchedules}
            selectable={canManageSchedules}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "",
            }}
            fixedWeekCount={false}
            showNonCurrentDates={true}
            dayMaxEvents={2}
            eventDisplay="block"
            displayEventTime={false}
            dayHeaderFormat={{
              weekday: "short",
            }}
            dayCellClassNames={(arg) => {
              const day = arg.date.getDay();
              return day === 0 || day === 6 ? ["weekend-day-cell"] : [];
            }}
            dayCellContent={(arg) => (
              <Box sx={{ px: 0.35, pt: 0.2 }}>
                <Typography
                  sx={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: arg.isOther ? "#94A3B8" : "#0F172A",
                  }}
                >
                  {arg.dayNumberText}
                </Typography>
              </Box>
            )}
            moreLinkContent={(args) => `+${args.num} more`}
            eventContent={(arg) => {
              const props = arg.event.extendedProps || {};

              if (props.type === "coverage-gap") {
                return (
                  <Box
                    sx={{
                      px: 0.62,
                      py: 0.48,
                      borderRadius: 1.1,
                      height: "100%",
                      background: "#FECACA",
                      border: "1px solid #EF4444",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: "0.62rem",
                        lineHeight: 1.1,
                      }}
                    >
                      Needs Coverage
                    </Typography>
                    <Typography
                      sx={{
                        color: "#111827",
                        fontWeight: 600,
                        fontSize: "0.58rem",
                        lineHeight: 1.1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {arg.event.title}
                    </Typography>
                  </Box>
                );
              }

              const start = new Date(arg.event.start);
              const end = new Date(arg.event.end);
              const spansMultipleDays =
                !Number.isNaN(start.getTime()) &&
                !Number.isNaN(end.getTime()) &&
                start.toDateString() !== end.toDateString();

              const startLabel = formatCompactDateTime(start).time;
              const endLabel = formatCompactDateTime(end).time;
              const timeLabel = `${startLabel} - ${endLabel}`;
              const dateMarker = spansMultipleDays
                ? `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • Overnight`
                : "";
              const isUrgent = props.isUrgentStatus;

              return (
                <Box
                  sx={{
                    px: 0.62,
                    py: 0.48,
                    borderRadius: 1.1,
                    height: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 0.08,
                    position: "relative",
                    background:
                      "linear-gradient(140deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.3) 100%)",
                  }}
                >
                  {isUrgent ? (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 3,
                        fontSize: "0.6rem",
                        lineHeight: 1,
                      }}
                      aria-label={props.status}
                    >
                      ⚠
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: getScheduleStatusColor(props.status),
                        border: "1px solid rgba(255,255,255,0.7)",
                      }}
                    />
                  )}

                  <Typography
                    sx={{
                      color: "#F8FAFC",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      pr: 1,
                    }}
                  >
                    {props.staffName || "Unknown"}
                  </Typography>

                  <Typography
                    sx={{
                      color: "#DBEAFE",
                      fontWeight: 600,
                      fontSize: "0.6rem",
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeLabel}
                  </Typography>

                  {spansMultipleDays ? (
                    <Typography
                      sx={{
                        color: "#E2E8F0",
                        fontWeight: 600,
                        fontSize: "0.57rem",
                        lineHeight: 1.1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dateMarker}
                    </Typography>
                  ) : null}

                  <Typography
                    sx={{
                      color: "#BFDBFE",
                      fontWeight: 500,
                      fontSize: "0.58rem",
                      lineHeight: 1.1,
                    }}
                  >
                    {props.roleName || "Role"}
                  </Typography>
                </Box>
              );
            }}
            events={[
              ...filteredSchedules.map((s) => {
                const isUrgentStatus = URGENT_SCHEDULE_STATUSES.has(
                  String(s.status || "").toLowerCase(),
                );
                const roleColor = getRoleColor(s.role);

                return {
                  id: s._id,
                  title: s.staffId?.name,
                  start: s.startTime,
                  end: s.endTime,
                  backgroundColor: isUrgentStatus ? "#EF4444" : roleColor,
                  borderColor: isUrgentStatus ? "#EF4444" : roleColor,
                  textColor: "#fff",
                  extendedProps: {
                    type: "schedule",
                    staffName: s.staffId?.name,
                    roleName: getRoleDisplayName(s.role),
                    status: s.status,
                    isUrgentStatus,
                  },
                };
              }),
              ...calendarCoverageGapEvents,
            ]}
            eventClick={(info) => {
              const props = info.event.extendedProps || {};

              if (props.type === "coverage-gap") {
                if (canManageSchedules) {
                  openManualFromCoverage(props.coverage);
                }
                return;
              }

              const clicked = filteredSchedules.find(
                (a) => a._id === info.event.id,
              );
              if (!clicked) return;
              if (canManageSchedule(clicked)) {
                openEdit(clicked);
                return;
              }
              openDetailsModal(clicked);
            }}
            datesSet={(dateInfo) => {
              setCalendarRange({
                start: dateInfo.start,
                end: dateInfo.end,
                title: dateInfo.view?.title || "",
              });
            }}
            expandRows={true}
            height="72vh"
          />
        </Box>
      )}

      <Dialog
        open={open}
        onClose={() => closeModal()}
        fullWidth
        maxWidth="md"
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, md: 4 },
          },
        }}
      >
        <DialogContent dividers>
          <ScheduleForm
            onSuccess={() => closeModal(true)}
            onClose={() => closeModal()}
            schedule={editingSchedule}
            mode={scheduleFormMode}
            staffList={staff}
            initialCoverage={manualCoverageFromAuto}
            // Pickup mode is always bound to the logged-in staff member.
            initialStaffId={
              !canManageSchedules && !editingSchedule ? user._id : ""
            }
            disableStaffSelect={!canManageSchedules && !editingSchedule}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onClose={closeDetailsModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, md: 4 },
          },
        }}
      >
        <DialogContent dividers>
          {selectedSchedule ? (
            <Box display="flex" flexDirection="column" gap={1.4}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Schedule Details
              </Typography>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Staff
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {selectedSchedule.staffId?.name || "Unknown"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Role
                </Typography>
                <Typography>
                  {getRoleDisplayName(selectedSchedule.role)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography>
                  {formatScheduleDateRange(selectedSchedule)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time
                </Typography>
                <Typography>
                  {formatScheduleTimeRange(selectedSchedule)}
                </Typography>
              </Box>

              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
                gap={1.2}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Unit Area
                  </Typography>
                  <Typography>
                    {getUnitAreaDisplayName(selectedSchedule.unitArea) || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Shift Type
                  </Typography>
                  <Typography>
                    {getShiftTypeDisplayName(selectedSchedule.shiftType) || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Shift Slot
                  </Typography>
                  <Typography>
                    {getShiftTagDisplayName(selectedSchedule.shiftTag) || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography>
                    {(selectedSchedule.status || "-")
                      .replace("_", " ")
                      .toUpperCase()}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Certification Tags
                </Typography>
                <Typography>
                  {formatCertificationTags(selectedSchedule)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", color: "#334155" }}>
                  {selectedSchedule.notes || "-"}
                </Typography>
              </Box>

              {isOvernightShift(selectedSchedule) && (
                <Typography
                  variant="caption"
                  sx={{ color: "info.main", mt: 0.5 }}
                >
                  Overnight shift
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={timeEntryOpen}
        onClose={closeTimeEntryModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Time Entry</DialogTitle>
        <DialogContent>
          {timeEntrySchedule ? (
            <Stack spacing={1.5} sx={{ pt: 0.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Staff
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {timeEntrySchedule.staffId?.name || "Unknown"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Shift
                </Typography>
                <Typography>
                  {formatScheduleDateRange(timeEntrySchedule)} |{" "}
                  {formatScheduleTimeRange(timeEntrySchedule)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current Schedule Status
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {(timeEntrySchedule.status || "scheduled")
                    .replace("_", " ")
                    .toUpperCase()}
                </Typography>
              </Box>

              {requiresQrToken ? (
                <Stack spacing={1}>
                  <Alert severity="info">
                    QR mode is active. Tap Clock In or Clock Out to open your
                    camera and scan the facility QR code.
                  </Alert>
                </Stack>
              ) : null}

              {timeEntryLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading active time entry...
                </Typography>
              ) : activeTimeEntry ? (
                <Stack spacing={1}>
                  <Alert severity="info">
                    You already have an active time entry from{" "}
                    {new Date(activeTimeEntry.clockInAt).toLocaleString()}. Use
                    Clock Out to complete it.
                  </Alert>
                  {getOpenBreak(activeTimeEntry) ? (
                    <Alert severity="warning">
                      Active break started at{" "}
                      {new Date(
                        getOpenBreak(activeTimeEntry).startAt,
                      ).toLocaleString()}
                      .
                    </Alert>
                  ) : null}
                </Stack>
              ) : (
                <Alert severity="success">
                  No active time entry. You can clock in for this schedule.
                </Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTimeEntryModal} disabled={timeEntrySubmitting}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClockOutFromSchedule}
            disabled={timeEntrySubmitting || !activeTimeEntry}
          >
            Clock Out
          </Button>
          <Button
            variant="outlined"
            onClick={handleStartBreakFromSchedule}
            disabled={
              timeEntrySubmitting ||
              !activeTimeEntry ||
              Boolean(getOpenBreak(activeTimeEntry))
            }
          >
            Start Break
          </Button>
          <Button
            variant="outlined"
            onClick={handleEndBreakFromSchedule}
            disabled={
              timeEntrySubmitting ||
              !activeTimeEntry ||
              !Boolean(getOpenBreak(activeTimeEntry))
            }
          >
            End Break
          </Button>
          <Button
            variant="contained"
            onClick={handleClockInFromSchedule}
            disabled={
              timeEntrySubmitting ||
              Boolean(activeTimeEntry) ||
              !timeEntrySchedule ||
              timeEntrySchedule.status !== "scheduled"
            }
          >
            Clock In
          </Button>
        </DialogActions>
      </Dialog>

      <QrScannerDialog
        open={Boolean(qrScanAction)}
        onClose={() => setQrScanAction(null)}
        onScan={handleQrScannedForSchedule}
        title={
          qrScanAction === "clock-out"
            ? "Scan to Clock Out"
            : "Scan to Clock In"
        }
        description="Allow camera access, then point at your facility attendance QR code."
      />

      <Dialog
        open={openAutoModal}
        onClose={() => setOpenAutoModal(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, md: 4 },
            overflow: "hidden",
          },
        }}
      >
        <DialogContent dividers sx={{ p: { xs: 1.25, md: 2 } }}>
          <AutoGenerateScheduleForm
            schedules={schedules}
            onClose={() => setOpenAutoModal(false)}
            onOpenManualSchedule={openManualFromCoverage}
            onSuccess={() => {
              fetchSchedules();
              fetchCoverageGaps();
            }}
          />
        </DialogContent>
      </Dialog>

      <GuideVideoDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Schedule Guide Videos"
        videos={SCHEDULE_GUIDE_VIDEOS}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Schedule?"
        message="This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Selected Schedules?"
        message={`Delete ${selectedScheduleIds.length} selected schedule item(s)? This action cannot be undone.`}
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
      />

      <ShiftSwapRequestModal
        open={swapModalOpen}
        onClose={closeSwapRequestModal}
        onSuccess={fetchSchedules}
        schedule={swapSchedule}
        staffList={staff}
      />
    </Container>
  );
}
