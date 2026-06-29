import { useEffect, useState, useMemo } from "react";
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
  DialogContent,
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
  Tooltip,
} from "@mui/material";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import api from "../../../config/api";
import {
  FiCalendar,
  FiList,
  FiPlus,
  FiEye,
  FiEdit,
  FiDelete,
  FiRepeat,
  FiPrinter,
  FiDownload,
  FiChevronDown,
} from "react-icons/fi";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ScheduleForm from "./ScheduleForm";
import AutoGenerateScheduleForm from "./AutoGenerateScheduleForm";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import ShiftSwapRequestModal from "./ShiftSwapRequestModal";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Stack from "@mui/material/Stack";
import {
  getRoleColor,
  getRoleDisplayName,
  getUnitAreaDisplayName,
  getShiftTypeDisplayName,
  getShiftTagDisplayName,
  getCertificationTagDisplayName,
  getRoleOptionsFromFacilityPreferences,
} from "../../../constants/industryRoles";

export default function ScheduleList() {
  const { user, isAdmin, facilityPreferences } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [openAutoModal, setOpenAutoModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [view, setView] = useState("table");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSchedule, setSwapSchedule] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [monthDate, setMonthDate] = useState(new Date());
  const [calendarRange, setCalendarRange] = useState({
    start: null,
    end: null,
    title: "",
  });
  const [staffVisibility, setStaffVisibility] = useState("mine");
  const [shiftTimeFilter, setShiftTimeFilter] = useState("");
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);

  const roleFilterOptions = useMemo(() => {
    const facilityRoleValues = getRoleOptionsFromFacilityPreferences(
      facilityPreferences,
    ).map((option) => option.value);
    const scheduleRoles = schedules.map((s) => s.role).filter(Boolean);
    const staffRoles = staff.map((s) => s.role).filter(Boolean);
    return [
      "all",
      ...Array.from(
        new Set([...facilityRoleValues, ...scheduleRoles, ...staffRoles]),
      ),
    ];
  }, [schedules, staff, facilityPreferences]);

  const getRoleChipStyles = (role) => {
    const roleColor = getRoleColor(role);
    return {
      px: 1,
      py: 0.35,
      borderRadius: 1,
      backgroundColor: `${roleColor}22`,
      color: roleColor,
      fontWeight: 700,
      fontSize: "0.72rem",
      whiteSpace: "nowrap",
    };
  };

  const legendRoles = useMemo(
    () => roleFilterOptions.filter((role) => role !== "all").slice(0, 8),
    [roleFilterOptions],
  );

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
  }, []);

  // ---------------------------
  // Helper: format UTC → local
  // ---------------------------
  const formatLocal = (date) =>
    new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatCompactDateTime = (date) => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) {
      return { date: "-", time: "-" };
    }

    return {
      date: value.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      time: value.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const getTimeKey = (value) => {
    const d = new Date(value);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getLocalDateKey = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseLocalDateKey = (dateKey) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const isOvernightShift = (schedule) => {
    const start = new Date(schedule?.startTime);
    const end = new Date(schedule?.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    return start.toDateString() !== end.toDateString();
  };

  const formatScheduleDateRange = (schedule) => {
    const start = new Date(schedule?.startTime);
    const end = new Date(schedule?.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "";
    }

    const startLabel = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!isOvernightShift(schedule)) {
      return startLabel;
    }

    const endLabel = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startLabel} - ${endLabel}`;
  };

  const formatScheduleTimeRange = (
    schedule,
    { withNextDayHint = true } = {},
  ) => {
    const start = new Date(schedule?.startTime);
    const end = new Date(schedule?.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "";
    }

    const startLabel = start.toLocaleTimeString("default", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endLabel = end.toLocaleTimeString("default", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isOvernightShift(schedule) && withNextDayHint) {
      return `${startLabel} - ${endLabel} next day`;
    }

    return `${startLabel} - ${endLabel}`;
  };

  const formatCertificationTags = (schedule) => {
    if (!Array.isArray(schedule?.certificationTags)) return "-";
    const tags = schedule.certificationTags
      .map((tag) => getCertificationTagDisplayName(tag))
      .filter(Boolean);
    return tags.length ? tags.join(", ") : "-";
  };

  // ---------------------------
  // Fetch schedules
  // ---------------------------
  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");

      // sort by startTime descending (newest first). fallback to createdAt when startTime missing
      const data = res.data.sort((a, b) => {
        const ta = new Date(a.startTime || a.createdAt).getTime();
        const tb = new Date(b.startTime || b.createdAt).getTime();
        return tb - ta;
      });

      setSchedules(data);
      setSelectedScheduleIds((prev) =>
        prev.filter((id) => data.some((schedule) => schedule._id === id)),
      );
    } catch (err) {
      console.error("Failed to fetch schedules", err);
    }
  };

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

  // ---------------------------
  // Modals
  // ---------------------------
  const openEdit = (sched) => {
    setEditingSchedule(sched);
    setOpen(true);
  };

  const openCreate = () => {
    if (!isAdmin) return;
    setEditingSchedule(null);
    setOpen(true);
  };

  const closeModal = (refresh = false) => {
    setOpen(false);
    setEditingSchedule(null);
    if (refresh) fetchSchedules();
  };

  // ---------------------------
  // Delete
  // ---------------------------
  const askDelete = (id) => {
    if (!isAdmin) return;
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/schedules/${deleteId}`);
      fetchSchedules();
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

  const canManageSchedule = (schedule) => {
    if (isAdmin) return true;
    return schedule?.staffId?._id === user?._id;
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
    return schedules.filter((s) => {
      if (
        !isAdmin &&
        staffVisibility === "mine" &&
        s.staffId?._id !== user?._id
      )
        return false;
      // roleFilter is 'all' to allow all roles
      if (roleFilter && roleFilter !== "all" && s.role !== roleFilter)
        return false;
      if (statusFilter && statusFilter !== "" && s.status !== statusFilter)
        return false;
      if (shiftTimeFilter) {
        const [startKey, endKey] = shiftTimeFilter.split("|");
        if (
          getTimeKey(s.startTime) !== startKey ||
          getTimeKey(s.endTime) !== endKey
        )
          return false;
      }
      return true;
    });
  }, [
    schedules,
    roleFilter,
    statusFilter,
    shiftTimeFilter,
    isAdmin,
    staffVisibility,
    user?._id,
  ]);

  const paginatedSchedules = useMemo(
    () =>
      filteredSchedules.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [filteredSchedules, page, rowsPerPage],
  );

  const paginatedScheduleIds = paginatedSchedules.map(
    (schedule) => schedule._id,
  );
  const allPaginatedSelected =
    paginatedScheduleIds.length > 0 &&
    paginatedScheduleIds.every((id) => selectedScheduleIds.includes(id));

  // Reset page when filters change or filtered length shrinks
  useEffect(() => {
    setPage(0);
  }, [roleFilter, statusFilter, staffVisibility, shiftTimeFilter]);

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

  const statusColors = {
    scheduled: "#fbc02d",
    completed: "#66bb6a",
    call_out: "#ef5350",
  };

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
          role: schedule?.staffId?.role || schedule?.role || "",
        });
      }
    });

    const shiftsByStaffAndDay = new Map();
    inMonthSchedules.forEach((schedule) => {
      const staffId = String(schedule?.staffId?._id || "");
      if (!staffId) return;
      const dayKey = getLocalDateKey(schedule.startTime);
      const key = `${staffId}|${dayKey}`;
      if (!shiftsByStaffAndDay.has(key)) {
        shiftsByStaffAndDay.set(key, []);
      }
      shiftsByStaffAndDay.get(key).push(schedule);
    });

    const sortedStaff = Array.from(staffMap.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );

    return sortedStaff.map((member) => {
      const shiftsByDay = monthDays.reduce((acc, dayKey) => {
        const key = `${member.staffId}|${dayKey}`;
        acc[dayKey] = (shiftsByStaffAndDay.get(key) || []).sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        return acc;
      }, {});

      return {
        ...member,
        shiftsByDay,
      };
    });
  }, [filteredSchedules, monthDate, monthDays]);

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

  const exportRosterToCsv = () => {
    try {
      closeExportMenu();
      const headers = [
        "Employee",
        "Role",
        ...monthDays.map((day) => {
          const date = parseLocalDateKey(day);
          return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
        }),
      ];

      const rows = monthRosterStaffRows.map((member) => {
        const dayCells = monthDays.map((day) => {
          const shifts = member.shiftsByDay?.[day] || [];
          if (shifts.length === 0) return "";

          return shifts
            .map((shift) => {
              const time = `${formatScheduleTimeRange(shift, {
                withNextDayHint: false,
              })}${isOvernightShift(shift) ? " (+1 day)" : ""}`;
              const unit = getUnitAreaDisplayName(shift.unitArea) || "No unit";

              return `${time} | ${unit}`;
            })
            .join(" ; ");
        });

        return [
          member.name || "Unknown",
          getRoleDisplayName(member.role) || "-",
          ...dayCells,
        ];
      });

      const csv = [headers, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\n");

      triggerDownload(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        `roster-${getMonthFileStamp()}.csv`,
      );
    } catch (error) {
      console.error("Failed to export roster to CSV", error);
      window.alert("Unable to export roster to CSV. Please try again.");
    }
  };

  const exportRosterToPdf = () => {
    try {
      closeExportMenu();
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const headers = [
        "Employee",
        "Role",
        ...monthDays.map((day) => {
          const date = parseLocalDateKey(day);
          return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
        }),
      ];

      const body = monthRosterStaffRows.map((member) => {
        const dayCells = monthDays.map((day) => {
          const shifts = member.shiftsByDay?.[day] || [];
          if (shifts.length === 0) return "";

          return shifts
            .map((shift) => {
              const time = `${formatScheduleTimeRange(shift, {
                withNextDayHint: false,
              })}${isOvernightShift(shift) ? " (+1 day)" : ""}`;
              const unit = getUnitAreaDisplayName(shift.unitArea) || "No unit";
              return `${time} | ${unit}`;
            })
            .join("\n");
        });

        return [
          member.name || "Unknown",
          getRoleDisplayName(member.role) || "-",
          ...dayCells,
        ];
      });

      doc.setFontSize(11);
      doc.text(`Roster - ${monthYear}`, 40, 30);

      autoTable(doc, {
        startY: 40,
        head: [headers],
        body,
        styles: {
          fontSize: 6,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "top",
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [15, 23, 42],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 56 },
        },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0, 1],
        margin: { left: 18, right: 18, top: 28, bottom: 20 },
      });

      doc.save(`roster-${getMonthFileStamp()}.pdf`);
    } catch (error) {
      console.error("Failed to export roster to PDF", error);
      window.alert("Unable to export roster to PDF. Please try again.");
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

      doc.setFontSize(11);
      doc.text(
        `Calendar Export${calendarRange.title ? ` - ${calendarRange.title}` : ""}`,
        40,
        30,
      );

      autoTable(doc, {
        startY: 40,
        head: [calendarWeekdayLabels],
        body: calendarGridWeeks.map((week) => week.map((cell) => cell.text)),
        styles: {
          fontSize: 6,
          cellPadding: 2,
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
          overflow: "linebreak",
          valign: "top",
          minCellHeight: 80,
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [15, 23, 42],
          fontStyle: "bold",
        },
        theme: "grid",
        margin: { left: 20, right: 20, top: 28, bottom: 20 },
      });

      doc.save(`calendar-${getCalendarFileStamp()}.pdf`);
    } catch (error) {
      console.error("Failed to export calendar to PDF", error);
      window.alert("Unable to export calendar to PDF. Please try again.");
    }
  };

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
                px: 2,
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

          {isAdmin && (
            <Button
              size="small"
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => setOpenAutoModal(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                bgcolor: "#1D4ED8",
                color: "#fff",
                width: { xs: "100%", md: "auto" },
                "&:hover": { bgcolor: "#1146b1" },
              }}
            >
              AI Scheduler
            </Button>
          )}

          {isAdmin && view === "table" && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={selectedScheduleIds.length === 0}
              onClick={() => setBulkConfirmOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                width: { xs: "100%", md: "auto" },
              }}
            >
              Delete Selected ({selectedScheduleIds.length})
            </Button>
          )}

          <Button
            size="small"
            variant="contained"
            startIcon={<FiPlus />}
            onClick={() => {
              if (isAdmin) {
                openCreate();
              } else {
                // open modal but prefill with current user's id
                setEditingSchedule(null);
                // open modal with a flag handled in ScheduleForm via props
                setOpen(true);
              }
            }}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              bgcolor: "#111827",
              color: "#fff",
              width: { xs: "100%", md: "auto" },
              "&:hover": { bgcolor: "#0f172a" },
            }}
          >
            {isAdmin ? "Manual Scheduler" : "Pick Up Shift"}
          </Button>

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
                  px: 2,
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
                  <>
                    <MenuItem onClick={exportCalendarToPdf}>
                      <FiPrinter style={{ marginRight: 8 }} /> Export Calendar
                      PDF
                    </MenuItem>
                  </>
                )}

                {view === "month" && (
                  <>
                    <MenuItem onClick={exportRosterToCsv}>
                      <FiDownload style={{ marginRight: 8 }} /> Export Roster
                      CSV
                    </MenuItem>
                    <MenuItem onClick={exportRosterToPdf}>
                      <FiPrinter style={{ marginRight: 8 }} /> Export Roster PDF
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* FILTER BAR (updated to match Figma) */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          gap={1.5}
        >
          <Typography
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.78rem", md: "0.875rem" },
              minWidth: { md: 44 },
            }}
          >
            Filter:
          </Typography>

          <Box
            display="flex"
            flexDirection={{ xs: "column", sm: "row" }}
            gap={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            {!isAdmin && (
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
                  },
                }}
              >
                <ToggleButton value="mine">My Schedule</ToggleButton>
                <ToggleButton value="all">Everyone</ToggleButton>
              </ToggleButtonGroup>
            )}

            {isAdmin && (
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", sm: 220 } }}
              >
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  {roleFilterOptions.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r === "all" ? "All Roles" : getRoleDisplayName(r)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
            >
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="call_out">Call Out</MenuItem>
              </Select>
            </FormControl>

            {uniqueShiftTimes.length > 0 && (
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", sm: 200 } }}
              >
                <InputLabel>Shift Time</InputLabel>
                <Select
                  value={shiftTimeFilter}
                  label="Shift Time"
                  onChange={(e) => setShiftTimeFilter(e.target.value)}
                >
                  <MenuItem value="">All Times</MenuItem>
                  {uniqueShiftTimes.map((t) => (
                    <MenuItem key={t.key} value={t.key}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>
      </Paper>

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
                    {isAdmin && (
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
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      Shift Type: {getShiftTypeDisplayName(s.shiftType)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      Shift Slot: {getShiftTagDisplayName(s.shiftTag)}
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
                          border: `1px solid ${statusColors[s.status] || "#9e9e9e"}`,
                          color: statusColors[s.status] || "#000",
                          fontWeight: 700,
                          fontSize: "0.64rem",
                          background: "#fff",
                          letterSpacing: 0.2,
                        }}
                      >
                        {s.status.replace("_", " ").toUpperCase()}
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
                    {canManageSchedule(s) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
                    )}
                    {!isAdmin &&
                      canManageSchedule(s) &&
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
                    {isAdmin && (
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
                  {isAdmin && (
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
                    Shift Type
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#0F172A",
                      fontSize: "0.72rem",
                    }}
                  >
                    Shift Slot
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
                {paginatedSchedules.map((s) => (
                  <TableRow
                    key={s._id}
                    sx={{ "&:hover": { background: "#f3f4f6" } }}
                  >
                    {isAdmin && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedScheduleIds.includes(s._id)}
                          onChange={() => toggleScheduleSelection(s._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: getRoleColor(s.role),
                          }}
                        />
                        <Box
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          {s.staffId?.name || "Unknown"}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      <Box component="span" sx={getRoleChipStyles(s.role)}>
                        {getRoleDisplayName(s.role)}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {formatCompactDateTime(s.startTime).date}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.66rem",
                          color: "text.secondary",
                          lineHeight: 1.1,
                        }}
                      >
                        {formatCompactDateTime(s.startTime).time}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {formatCompactDateTime(s.endTime).date}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.66rem",
                          color: "text.secondary",
                          lineHeight: 1.1,
                        }}
                      >
                        {formatCompactDateTime(s.endTime).time}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      {getUnitAreaDisplayName(s.unitArea)}
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      {getShiftTypeDisplayName(s.shiftType)}
                    </TableCell>
                    <TableCell
                      sx={{ color: "black", fontSize: "0.72rem", py: 0.75 }}
                    >
                      {getShiftTagDisplayName(s.shiftTag)}
                    </TableCell>
                    <TableCell sx={{ py: 0.75 }}>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          px: 1,
                          py: 0.3,
                          borderRadius: 1,
                          border: `1px solid ${statusColors[s.status] || "#9e9e9e"}`,
                          color: statusColors[s.status] || "#000",
                          fontWeight: 700,
                          fontSize: "0.64rem",
                          background: "#fff",
                          letterSpacing: 0.2,
                        }}
                      >
                        {s.status.replace("_", " ").toUpperCase()}
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
                      {!isAdmin &&
                        canManageSchedule(s) &&
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
                      {isAdmin && (
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
                ))}
              </TableBody>
            </Table>

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
                <TableRow sx={{ background: "#f3f4f6" }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: 175,
                      minWidth: 175,
                      borderRight: "1px solid #e5e7eb",
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      background: "#f3f4f6",
                      py: 0.7,
                    }}
                  >
                    Employee
                  </TableCell>
                  {monthDays.map((day) => {
                    const date = parseLocalDateKey(day);
                    const isWeekend =
                      date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <TableCell
                        key={day}
                        sx={{
                          fontWeight: 700,
                          minWidth: 140,
                          borderLeft: "1px solid #eef2f7",
                          background: isWeekend ? "#eef2ff" : "#f8fafc",
                          py: 0.7,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "0.64rem", fontWeight: 700 }}
                        >
                          {date.toLocaleDateString("default", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {monthRosterStaffRows.length === 0 ? (
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
                  monthRosterStaffRows.map((member) => (
                    <TableRow
                      key={member.staffId}
                      sx={{
                        "&:hover": { background: "#f8fbff" },
                        "@media print": { pageBreakInside: "avoid" },
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
                        <Typography
                          sx={{ fontSize: "0.68rem", fontWeight: 700 }}
                        >
                          {member.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.58rem",
                            color: "text.secondary",
                            mt: 0,
                          }}
                        >
                          {getRoleDisplayName(member.role) || "Role"}
                        </Typography>
                      </TableCell>

                      {monthDays.map((day) => {
                        const shifts = member.shiftsByDay[day] || [];
                        const date = parseLocalDateKey(day);
                        const isWeekend =
                          date.getDay() === 0 || date.getDay() === 6;

                        return (
                          <TableCell
                            key={`${member.staffId}-${day}`}
                            sx={{
                              minWidth: 140,
                              verticalAlign: "top",
                              borderLeft: "1px solid #eef2f7",
                              background: isWeekend ? "#fbfdff" : "#fff",
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
                                  <Box
                                    key={shift._id}
                                    sx={{
                                      border: "1px solid #dbeafe",
                                      borderLeft: `3px solid ${getRoleColor(shift.role)}`,
                                      borderRadius: 1,
                                      px: 0.5,
                                      py: 0.32,
                                      background: "#f8fbff",
                                      "@media print": {
                                        px: 0.35,
                                        py: 0.22,
                                      },
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "0.57rem",
                                        fontWeight: 700,
                                        color: "#111827",
                                        lineHeight: 1.1,
                                      }}
                                    >
                                      {formatScheduleTimeRange(shift, {
                                        withNextDayHint: false,
                                      })}
                                      {isOvernightShift(shift)
                                        ? " (+1 day)"
                                        : ""}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.54rem",
                                        color: "#475569",
                                        lineHeight: 1.1,
                                        mt: 0,
                                      }}
                                    >
                                      {getUnitAreaDisplayName(shift.unitArea) ||
                                        "No unit"}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
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
            editable={isAdmin}
            selectable={isAdmin}
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
                    background:
                      "linear-gradient(140deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.3) 100%)",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#F8FAFC",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {arg.event.extendedProps?.staffName || "Unknown"}
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
                    {arg.event.extendedProps?.roleName || "Role"}
                  </Typography>
                </Box>
              );
            }}
            events={filteredSchedules.map((s) => ({
              id: s._id,
              title: s.staffId?.name,
              start: s.startTime,
              end: s.endTime,
              backgroundColor: statusColors[s.status],
              borderColor: statusColors[s.status],
              textColor: "#fff",
              extendedProps: {
                staffName: s.staffId?.name,
                roleName: getRoleDisplayName(s.role),
              },
            }))}
            eventClick={(info) => {
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
            staffList={staff}
            // If user is not admin and the modal was opened via the Individual Schedule button,
            // we prefill with the current user's id and disable staff selection.
            initialStaffId={!isAdmin && !editingSchedule ? user._id : ""}
            disableStaffSelect={!isAdmin && !editingSchedule}
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
            onClose={() => setOpenAutoModal(false)}
            onSuccess={() => {
              fetchSchedules();
            }}
          />
        </DialogContent>
      </Dialog>

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
