import { useEffect, useState, useMemo } from "react";
import api from "../../../config/api";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CARD_BG = "rgba(255,255,255,0.06)";
const CARD_HEIGHT = 320;
const BAR_COLORS = { required: "#ef5350", scheduled: "#66bb6a" };
const BAR_COLOR = "#66bb6a";

// -------------------
// Utilities
// -------------------
function startOfWeek(date) {
  // start week on Sunday
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

function getWeekDays() {
  const sunday = startOfWeek(new Date());
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function formatDayLabel(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, { weekday: "short" });
}

// Local YYYY-MM-DD (en-CA) day key (reflects local timezone)
function getLocalDayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString("en-CA");
}

// split shift across days if it spans midnight - uses local times created from supplied Date objects
function splitShiftByDay(shift) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const result = [];
  let current = new Date(start);

  while (current < end) {
    const dayKey = getLocalDayKey(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);
    const shiftEnd = end < dayEnd ? end : dayEnd;
    result.push({
      ...shift,
      start: new Date(current),
      end: new Date(shiftEnd),
      dayKey,
    });
    current = new Date(shiftEnd.getTime() + 1);
  }
  return result;
}

// format times consistently
function formatTime(d) {
  if (!d) return "";
  return new Date(d)
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s?/g, "");
}

// -------------------
// Main Component
// -------------------
export default function ScheduleAndCoverageCharts({ isAdmin, userId }) {
  const [schedules, setSchedules] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedRole, setSelectedRole] = useState("");
  const [nonAdminView, setNonAdminView] = useState("hours"); // 'hours' or 'table'

  useEffect(() => {
    async function load() {
      try {
        const scheduleURL = isAdmin
          ? `/schedules`
          : `/schedules?staffId=${userId}`;

        const [scheduleRes, coverageRes] = await Promise.all([
          api.get(scheduleURL),
          api.get(`/coverage`),
        ]);

        setSchedules(scheduleRes.data || []);
        setCoverage(coverageRes.data || []);
      } catch (err) {
        console.error("Failed to load charts:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin, userId]);

  // -------------------
  // Normalize schedules & coverage
  // -------------------
  // coverageNormalized: split multi-day coverage into per-day segments
  const coverageNormalized = useMemo(() => {
    return coverage.flatMap((c) => {
      if (!c.startTime || !c.endTime) return [];
      const splitShifts = splitShiftByDay({
        ...c,
        startTime: new Date(c.startTime),
        endTime: new Date(c.endTime),
      });
      return splitShifts.map((s) => ({
        ...s,
        role: c.role,
        requiredCount: c.requiredCount,
        dayKey: s.dayKey, // YYYY-MM-DD local
        startTime: s.start,
        endTime: s.end,
      }));
    });
  }, [coverage]);

  // schedulesNormalized: split multi-day schedules into per-day segments
  const schedulesNormalized = useMemo(() => {
    return schedules.flatMap((s) => {
      if (!s.startTime || !s.endTime) return [];
      const splitShifts = splitShiftByDay({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
      });
      return splitShifts.map((part) => ({
        ...part,
        staffRole: part.staffId?.role,
        dayKey: part.dayKey,
        start: part.start,
        end: part.end,
      }));
    });
  }, [schedules]);

  // Week days for current week (Monday -> Sunday)
  // Week days for current week (Sunday -> Saturday)
  const weekDays = useMemo(() => getWeekDays(), []);

  // week range string like: Sun, Dec 7 - Sat, Dec 13
  const weekRangeLabel = useMemo(() => {
    if (!weekDays || weekDays.length === 0) return "";
    const first = weekDays[0];
    const last = weekDays[6];
    const opts = { month: "short", day: "numeric" };
    const firstLabel = first.toLocaleDateString(undefined, {
      weekday: "short",
      ...opts,
    });
    const lastLabel = last.toLocaleDateString(undefined, {
      weekday: "short",
      ...opts,
    });
    return `${firstLabel} – ${lastLabel}`;
  }, [weekDays]);

  // -------------------
  // Roles & role selector (only roles that actually have coverage)
  // -------------------
  const allRoles = [
    "doctor",
    "nurse",
    "receptionist",
    "billing",
    "staff",
    "other",
  ];

  const rolesWithCoverage = useMemo(() => {
    const setRoles = new Set(coverageNormalized.map((c) => c.role));
    return allRoles.filter((r) => setRoles.has(r));
  }, [coverageNormalized]);

  // default selected role: first role with coverage
  useEffect(() => {
    if (!selectedRole && rolesWithCoverage.length) {
      setSelectedRole(rolesWithCoverage[0]);
    }
  }, [rolesWithCoverage, selectedRole]);

  // -------------------
  // Admin consolidated role chart data (for selectedRole)
  // -------------------
  const roleChartData = useMemo(() => {
    if (!isAdmin || !selectedRole) return [];

    // find coverage shifts for that role, grouped/sorted by day+start
    // keep only coverage shifts within the current week (Sunday-Saturday)
    const weekDayKeys = new Set(weekDays.map((d) => getLocalDayKey(d)));

    const roleCoverage = coverageNormalized
      .filter((c) => c.role === selectedRole && weekDayKeys.has(c.dayKey))
      .sort((a, b) => {
        if (a.dayKey === b.dayKey) return a.startTime - b.startTime;
        return a.dayKey.localeCompare(b.dayKey);
      });

    // build data points
    const data = roleCoverage.map((c) => {
      // count scheduled that match this role/day/start
      const scheduledCount = schedulesNormalized.filter(
        (s) =>
          s.staffRole === selectedRole &&
          s.dayKey === c.dayKey &&
          s.start.getTime() === c.startTime.getTime() &&
          s.status !== "cancelled"
      ).length;

      // concise label: Mon, 6AM - 8PM
      const dayLabel = formatDayLabel(new Date(c.dayKey + "T00:00:00"));
      const timeLabel = `${formatTime(c.startTime)} - ${formatTime(c.endTime)}`;

      return {
        shiftLabel: `${dayLabel}, ${timeLabel}`,
        scheduled: scheduledCount,
        required: c.requiredCount,
        dayKey: c.dayKey,
        startMillis: c.startTime.getTime(),
      };
    });

    return data;
  }, [isAdmin, selectedRole, coverageNormalized, schedulesNormalized]);

  // -------------------
  // Non-admin: daily hours and weekly shifts
  // -------------------
  const dailyHours = useMemo(() => {
    if (isAdmin) return [];
    return weekDays.map((day) => {
      const dayKey = getLocalDayKey(day);
      const shifts = schedulesNormalized.filter(
        (s) => s.dayKey === dayKey && s.status !== "cancelled"
      );
      const hours = shifts.reduce(
        (sum, s) =>
          sum + (s.end.getTime() - s.start.getTime()) / 1000 / 60 / 60,
        0
      );
      // label day + numeric date to make it less ambiguous
      const dayLabel = `${formatDayLabel(day)} ${day.getDate()}`;
      return { day: dayLabel, hours, dayKey };
    });
  }, [schedulesNormalized, weekDays, isAdmin]);

  const staffHeatmapData = useMemo(() => {
    if (isAdmin) return [];
    return weekDays.map((day) => {
      const dayKey = getLocalDayKey(day);
      const shifts = schedulesNormalized
        .filter((s) => s.dayKey === dayKey && s.status !== "cancelled")
        .sort((a, b) => a.start - b.start);

      if (shifts.length === 0) return { day: formatDayLabel(day), shifts: [] };

      const dayShifts = shifts.map((s) => ({
        start: s.start,
        end: s.end,
      }));

      return { day: formatDayLabel(day), shifts: dayShifts };
    });
  }, [schedulesNormalized, weekDays, isAdmin]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );

  // -------------------
  // Simplified UI: Admin -> Today's Coverage & Upcoming Coverage
  //               Staff -> Today's Shift & Upcoming Shifts
  // -------------------

  const todayKey = getLocalDayKey(new Date());

  // small helpers
  function getRoleDisplayName(role) {
    if (!role) return "Staff";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function getRoleColor(role) {
    switch (role) {
      case "doctor":
        return "#1e88e5"; // blue
      case "nurse":
        return "#66bb6a"; // green
      case "receptionist":
        return "#ffb74d"; // orange
      case "billing":
        return "#ab47bc"; // purple
      default:
        return "#90a4ae"; // gray
    }
  }

  // Today's coverage with assigned counts
  const coverageWithStaffing = coverageNormalized
    .filter((c) => c.dayKey === todayKey)
    .sort((a, b) => a.startTime - b.startTime)
    .map((c, idx) => {
      const assignedCount = schedulesNormalized.filter((s) => {
        const scheduleRole = s.staffRole || s.role;
        return (
          s.dayKey === c.dayKey &&
          s.start.getTime() === new Date(c.startTime).getTime() &&
          s.status !== "cancelled" &&
          scheduleRole === c.role
        );
      }).length;

      const isUnderstaffed = assignedCount < c.requiredCount;
      const isOverstaffed = assignedCount > c.requiredCount;

      return {
        id: c._id || `${c.dayKey}-${idx}`,
        role: c.role,
        shiftStart: c.startTime,
        shiftEnd: c.endTime,
        assignedCount,
        requiredStaff: c.requiredCount,
        isUnderstaffed,
        isOverstaffed,
      };
    });

  // Upcoming coverage (excluding today) - next 7 days
  const upcomingCoverage = coverageNormalized
    .filter((c) => c.dayKey > todayKey)
    .sort((a, b) =>
      a.dayKey === b.dayKey
        ? a.startTime - b.startTime
        : a.dayKey.localeCompare(b.dayKey)
    )
    .slice(0, 8)
    .map((c, idx) => {
      const assignedCount = schedulesNormalized.filter((s) => {
        const scheduleRole = s.staffRole || s.role;
        return (
          s.dayKey === c.dayKey &&
          s.start.getTime() === new Date(c.startTime).getTime() &&
          s.status !== "cancelled" &&
          scheduleRole === c.role
        );
      }).length;
      return {
        id: c._id || `${c.dayKey}-up-${idx}`,
        role: c.role,
        dayKey: c.dayKey,
        shiftStart: c.startTime,
        shiftEnd: c.endTime,
        assignedCount,
        requiredStaff: c.requiredCount,
      };
    });

  // For staff: find today's shift (schedulesNormalized already filtered by staff when fetched for non-admin)
  const todayShift = schedulesNormalized.find(
    (s) => s.dayKey === todayKey && s.status !== "cancelled"
  );

  const upcomingShifts = schedulesNormalized
    .filter((s) => s.dayKey > todayKey && s.status !== "cancelled")
    .sort((a, b) =>
      a.dayKey === b.dayKey
        ? a.start - b.start
        : a.dayKey.localeCompare(b.dayKey)
    )
    .slice(0, 8)
    .map((s) => ({
      id: s._id || `${s.dayKey}-${s.start.getTime()}`,
      date: s.dayKey,
      role: s.staffRole || s.role,
      shiftStart: s.start,
      shiftEnd: s.end,
      notes: s.notes,
    }));

  function formatDate(d) {
    try {
      if (!d) return "";
      // If value is a YYYY-MM-DD dayKey (from getLocalDayKey), parse as local midnight
      if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }

      return new Date(d).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return d;
    }
  }

  function getRelativeDateString(dayKey) {
    const d = new Date(dayKey + "T00:00:00");
    const now = new Date();
    const diff = Math.round(
      (d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) /
        (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff > 1 && diff < 7) return `${diff} days`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <Box mt={4} px={{ xs: 2, md: 4 }}>
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }}
        gap={3}
      >
        {/* Today's Coverage Status (Admin) or Today's Shift (Staff) */}
        {isAdmin ? (
          <Paper sx={{ background: "white", borderRadius: 2 }} elevation={1}>
            <Box p={2} borderBottom="1px solid rgba(0,0,0,0.08)">
              <Typography variant="h6">Today's Coverage Status</Typography>
              <Typography variant="body2" sx={{ color: "#666" }}>
                Coverage vs Assigned Staff
              </Typography>
            </Box>
            <Box p={2}>
              {coverageWithStaffing.length === 0 ? (
                <Box textAlign="center" py={6} sx={{ color: "#9e9e9e" }}>
                  <FiCalendar size={48} className="opacity-50" />
                  <Typography>No coverage requirements for today</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {coverageWithStaffing.map((cov) => (
                    <Box
                      key={cov.id}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                        backgroundColor: cov.isUnderstaffed
                          ? "#ffebee"
                          : cov.isOverstaffed
                          ? "#fff8e1"
                          : "#e8f5e9",
                        borderLeft: `4px solid ${
                          cov.isUnderstaffed
                            ? "#f44336"
                            : cov.isOverstaffed
                            ? "#fbc02d"
                            : "#66bb6a"
                        }`,
                      }}
                    >
                      <Box>
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          mb={0.5}
                        >
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: getRoleColor(cov.role),
                            }}
                          />
                          <Typography variant="subtitle1">
                            {getRoleDisplayName(cov.role)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#666" }}>
                          {formatTime(cov.shiftStart)} -{" "}
                          {formatTime(cov.shiftEnd)}
                        </Typography>
                      </Box>

                      <Box textAlign="right">
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="flex-end"
                          gap={1}
                        >
                          {cov.isUnderstaffed ? (
                            <FiAlertTriangle size={16} color="#c62828" />
                          ) : cov.isOverstaffed ? (
                            <FiAlertTriangle size={16} color="#f9a825" />
                          ) : (
                            <FiCheckCircle size={16} color="#2e7d32" />
                          )}
                          <Typography sx={{ fontWeight: 700 }}>
                            {cov.assignedCount} / {cov.requiredStaff}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#666" }}>
                          {cov.isUnderstaffed
                            ? `Need ${
                                cov.requiredStaff - cov.assignedCount
                              } more`
                            : cov.isOverstaffed
                            ? `${cov.assignedCount - cov.requiredStaff} extra`
                            : "Fully staffed"}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        ) : (
          <Paper
            sx={{ background: "white", borderRadius: 2, p: 3 }}
            elevation={1}
          >
            <Typography variant="h6" mb={2}>
              Today's Shift
            </Typography>
            {todayShift ? (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#e3f2fd",
                  borderLeft: "4px solid #1e88e5",
                  borderRadius: 1,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="start"
                  mb={1}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      {formatDate(todayShift.dayKey)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {getRoleDisplayName(todayShift.staffRole)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: "#e3f2fd",
                        color: "#1565c0",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      Today
                    </Typography>
                  </Box>
                </Box>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{ color: "#424242" }}
                >
                  <FiClock />
                  <span>
                    {formatTime(todayShift.start)} -{" "}
                    {formatTime(todayShift.end)}
                  </span>
                </Box>
                {todayShift.notes && (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 2,
                      p: 1,
                      backgroundColor: "white",
                      borderRadius: 1,
                    }}
                  >
                    {todayShift.notes}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box textAlign="center" py={6} sx={{ color: "#9e9e9e" }}>
                <FiCalendar size={48} />
                <Typography>No shift scheduled for today</Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  Enjoy your day off!
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Upcoming Coverage (Admin) or Upcoming Shifts (Staff) */}
        {isAdmin ? (
          <Paper sx={{ background: "white", borderRadius: 2 }} elevation={1}>
            <Box p={2} borderBottom="1px solid rgba(0,0,0,0.08)">
              <Typography variant="h6">Upcoming Coverage</Typography>
              <Typography variant="body2" sx={{ color: "#666" }}>
                Next coverage windows
              </Typography>
            </Box>
            <Box p={2}>
              {upcomingCoverage.length === 0 ? (
                <Box textAlign="center" py={6} sx={{ color: "#9e9e9e" }}>
                  <FiCalendar size={48} />
                  <Typography>No upcoming coverage</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {upcomingCoverage.map((cov) => (
                    <Box
                      key={cov.id}
                      sx={{ p: 2, borderRadius: 1, backgroundColor: "#fafafa" }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box>
                          <Typography variant="subtitle1">
                            {getRoleDisplayName(cov.role)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#666" }}>
                            {formatDate(cov.dayKey)} •{" "}
                            {formatTime(cov.shiftStart)} -{" "}
                            {formatTime(cov.shiftEnd)}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography sx={{ fontWeight: 700 }}>
                            {cov.assignedCount} / {cov.requiredStaff}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#666" }}>
                            {cov.assignedCount >= cov.requiredStaff
                              ? "OK"
                              : `Need ${cov.requiredStaff - cov.assignedCount}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ background: "white", borderRadius: 2 }} elevation={1}>
            <Box p={2} borderBottom="1px solid rgba(0,0,0,0.08)">
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Upcoming Shifts</Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  {upcomingShifts.length} shifts
                </Typography>
              </Box>
            </Box>
            <Box p={2}>
              {upcomingShifts.length === 0 ? (
                <Box textAlign="center" py={6} sx={{ color: "#9e9e9e" }}>
                  <FiCalendar size={48} />
                  <Typography>No upcoming shifts</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {upcomingShifts.map((shift) => (
                    <Box
                      key={shift.id}
                      sx={{ p: 2, borderRadius: 1, backgroundColor: "#fafafa" }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Box>
                          <Typography variant="subtitle1">
                            {formatDate(shift.date)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#666" }}>
                            {getRelativeDateString(shift.date)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "#666" }}>
                            {getRoleDisplayName(shift.role)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={2}
                        sx={{ color: "#666" }}
                      >
                        <FiClock />
                        <span>
                          {formatTime(shift.shiftStart)} -{" "}
                          {formatTime(shift.shiftEnd)}
                        </span>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: getRoleColor(shift.role),
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
