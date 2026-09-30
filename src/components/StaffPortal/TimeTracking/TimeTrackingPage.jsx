import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FiClock, FiCoffee, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { getDisplayTimeZone, formatInTimeZone } from "../../../utils/timeZone";
import { getPunchLocation } from "../../../utils/geolocation";

const STATUS_COLOR = {
  in_progress: "warning",
  completed: "success",
  adjusted: "info",
  left_early: "warning",
  no_show: "default",
  call_out: "error",
};

const getDisplayAttendanceStatus = (entry) => {
  const attendanceOutcome = String(entry?.attendanceOutcome || "").trim();
  if (attendanceOutcome) return attendanceOutcome;
  return String(entry?.status || "unknown").trim() || "unknown";
};

const formatStatusLabel = (status) =>
  String(status || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const SOURCE = "web";
const toIsoNow = () => new Date().toISOString();

const formatDateTime = (value, timeZone) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return formatInTimeZone(d, {}, timeZone);
};

const formatElapsedFromNow = (startValue) => {
  if (!startValue) return "-";
  const start = new Date(startValue).getTime();
  if (Number.isNaN(start)) return "-";

  const diffMs = Date.now() - start;
  if (diffMs <= 0) return "0m";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const getBreakSummary = (entry, timeZone) => {
  const breaks = Array.isArray(entry?.breaks) ? entry.breaks : [];
  if (!breaks.length) return "No breaks yet";

  const openBreak = breaks.find((item) => item && !item.endAt);
  if (openBreak) {
    return `On break since ${formatDateTime(openBreak.startAt, timeZone)}`;
  }

  return `${breaks.length} break${breaks.length > 1 ? "s" : ""} logged`;
};

const formatSessionWindow = (schedule, timeZone) => {
  const startTime = schedule?.startTime;
  const endTime = schedule?.endTime;
  if (!startTime || !endTime) return "Time not available";
  return `${formatDateTime(startTime, timeZone)} to ${formatDateTime(endTime, timeZone)}`;
};

const normalizeEntriesFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.timeEntries)) return data.timeEntries;
  if (data?.entry) return [data.entry];
  return [];
};

const normalizeSchedulesFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.schedules)) return data.schedules;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const getActiveEntryFromResponse = (data, entries) => {
  if (data?.activeEntry) return data.activeEntry;
  return entries.find((item) => item?.status === "in_progress") || null;
};

const safeSortByClockInDesc = (entries) => {
  return [...entries].sort((a, b) => {
    const left = new Date(a?.clockInAt || a?.createdAt || 0).getTime();
    const right = new Date(b?.clockInAt || b?.createdAt || 0).getTime();
    return right - left;
  });
};

const extractMessage = (err, fallback) => {
  return err?.response?.data?.message || fallback;
};

const normalizeTrackingMode = (mode) => {
  const normalized = String(mode || "open")
    .trim()
    .toLowerCase();
  if (normalized === "geofence") return "geofence";
  if (normalized === "manual") return "open";
  return "open";
};

export default function TimeTrackingPage() {
  const { can, facilityPreferences, fetchFacilityPreferences } = useAuth();
  const isAdmin = can("staff.view");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [staffSchedules, setStaffSchedules] = useState([]);
  const [adminEntries, setAdminEntries] = useState([]);

  const trackingConfig = facilityPreferences?.timeTracking || {};
  const displayTimeZone = getDisplayTimeZone(facilityPreferences);
  const trackingEnabled = Boolean(trackingConfig.enabled);
  const trackingMode = normalizeTrackingMode(trackingConfig.mode);
  const requiresGeofenceLocation = trackingMode === "geofence";

  const openBreak = useMemo(() => {
    if (!activeEntry?.breaks?.length) return null;
    return activeEntry.breaks.find((item) => item && !item.endAt) || null;
  }, [activeEntry]);

  const loadStaffEntries = useCallback(async () => {
    const res = await api.get("/time-tracking/me");
    const normalizedEntries = safeSortByClockInDesc(
      normalizeEntriesFromResponse(res.data),
    );
    setEntries(normalizedEntries);
    setActiveEntry(getActiveEntryFromResponse(res.data, normalizedEntries));
  }, []);

  const loadStaffSchedules = useCallback(async () => {
    if (isAdmin) return;
    try {
      const res = await api.get("/schedules");
      const normalizedSchedules = normalizeSchedulesFromResponse(res.data);
      setStaffSchedules(
        Array.isArray(normalizedSchedules) ? normalizedSchedules : [],
      );
    } catch {
      setStaffSchedules([]);
    }
  }, [isAdmin]);

  const loadAdminEntries = useCallback(async () => {
    if (!isAdmin) return;
    const res = await api.get("/time-tracking");
    const normalizedEntries = safeSortByClockInDesc(
      normalizeEntriesFromResponse(res.data),
    );
    setAdminEntries(normalizedEntries);
  }, [isAdmin]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const latestPrefs = await fetchFacilityPreferences();
      await loadStaffEntries();
      await loadStaffSchedules();
      await loadAdminEntries();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to refresh time tracking data"));
    } finally {
      setRefreshing(false);
    }
  }, [
    fetchFacilityPreferences,
    isAdmin,
    loadAdminEntries,
    loadStaffEntries,
    loadStaffSchedules,
  ]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const latestPrefs = await fetchFacilityPreferences();
        const latestMode = normalizeTrackingMode(
          latestPrefs?.timeTracking?.mode,
        );

        await loadStaffEntries();
        await loadStaffSchedules();
        await loadAdminEntries();
      } catch (err) {
        if (mounted) {
          toast.error(extractMessage(err, "Failed to load time tracking"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [
    fetchFacilityPreferences,
    isAdmin,
    loadAdminEntries,
    loadStaffEntries,
    loadStaffSchedules,
  ]);

  const clockInWindowState = useMemo(() => {
    const requireScheduleMatch = Boolean(trackingConfig?.requireScheduleMatch);
    if (isAdmin || !requireScheduleMatch) {
      return {
        canClockInFromScheduleWindow: true,
        reason: "",
        nextAvailableAt: null,
        nextSchedule: null,
      };
    }

    const clockInGraceMinutes = Number(
      trackingConfig?.clockInGraceMinutes || 0,
    );
    const clockOutGraceMinutes = Number(
      trackingConfig?.clockOutGraceMinutes || 0,
    );
    const nowMs = Date.now();

    const candidates = (Array.isArray(staffSchedules) ? staffSchedules : [])
      .filter((schedule) => {
        const status = String(schedule?.status || "").toLowerCase();
        return status === "scheduled" || status === "in_progress";
      })
      .map((schedule) => {
        const startMs = new Date(schedule?.startTime).getTime();
        const endMs = new Date(schedule?.endTime).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

        // Mirror backend window logic from findScheduleForClockAction.
        const windowStartMs = startMs - clockOutGraceMinutes * 60 * 1000;
        const windowEndMs = endMs + clockInGraceMinutes * 60 * 1000;

        return {
          schedule,
          windowStartMs,
          windowEndMs,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.windowStartMs - b.windowStartMs);

    const activeWindow = candidates.find(
      (item) => nowMs >= item.windowStartMs && nowMs <= item.windowEndMs,
    );

    if (activeWindow) {
      return {
        canClockInFromScheduleWindow: true,
        reason: "",
        nextAvailableAt: null,
        nextSchedule: activeWindow.schedule,
      };
    }

    const nextWindow = candidates.find((item) => item.windowStartMs > nowMs);
    if (nextWindow) {
      return {
        canClockInFromScheduleWindow: false,
        reason: "outside_window",
        nextAvailableAt: nextWindow.windowStartMs,
        nextSchedule: nextWindow.schedule,
      };
    }

    return {
      canClockInFromScheduleWindow: false,
      reason: "no_upcoming_schedule",
      nextAvailableAt: null,
      nextSchedule: null,
    };
  }, [isAdmin, staffSchedules, trackingConfig]);

  const submitClockIn = async () => {
    setSubmitting(true);
    try {
      const location = requiresGeofenceLocation
        ? await getPunchLocation()
        : null;
      await api.post("/time-tracking/clock-in", {
        source: SOURCE,
        ...(requiresGeofenceLocation ? { location } : {}),
      });
      toast.success("Clocked in");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to clock in"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    await submitClockIn();
  };

  const handleStartBreak = async () => {
    setSubmitting(true);
    try {
      await api.post("/time-tracking/breaks/start", {
        at: toIsoNow(),
        type: "rest",
        paid: false,
        source: SOURCE,
      });
      toast.success("Break started");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to start break"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndBreak = async () => {
    setSubmitting(true);
    try {
      await api.post("/time-tracking/breaks/end", {
        at: toIsoNow(),
      });
      toast.success("Break ended");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to end break"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitClockOut = async () => {
    setSubmitting(true);
    try {
      const location = requiresGeofenceLocation
        ? await getPunchLocation()
        : null;
      await api.post("/time-tracking/clock-out", {
        source: SOURCE,
        ...(requiresGeofenceLocation ? { location } : {}),
      });
      toast.success("Clocked out");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to clock out"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    await submitClockOut();
  };

  const canClockIn =
    !activeEntry && clockInWindowState.canClockInFromScheduleWindow;
  const canStartBreak = Boolean(activeEntry) && !openBreak;
  const canEndBreak = Boolean(activeEntry) && Boolean(openBreak);
  const canClockOut = Boolean(activeEntry) && !openBreak;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!trackingEnabled) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, margin: "0 auto" }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: "1.35rem", md: "1.7rem" },
            fontWeight: 700,
            mb: 1,
          }}
        >
          Time Tracking
        </Typography>
        <Alert severity="info">
          Time tracking is currently disabled for your facility.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, margin: "0 auto" }}>
      <Box
        sx={{
          mb: 2.5,
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: "1.35rem", md: "1.7rem" }, fontWeight: 700 }}
          >
            Time Tracking
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.5 }}
          >
            <Chip
              size="small"
              color={trackingMode === "geofence" ? "success" : "default"}
              label={`${formatStatusLabel(trackingMode)} Mode`}
            />
            <Chip
              size="small"
              color={activeEntry ? "warning" : "default"}
              label={activeEntry ? "Active Session" : "No Active Session"}
            />
          </Stack>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FiRefreshCw />}
          onClick={refreshAll}
          disabled={refreshing || submitting}
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </Box>

      {requiresGeofenceLocation ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Geofence mode is active. Clock In requires a location inside the
          facility boundary. Clock Out will continue even if location is
          unavailable or outside the boundary.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Open mode is active. Location capture is not required for clock
          in/out.
        </Alert>
      )}

      {!isAdmin && (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <FiClock />
            <Typography sx={{ fontWeight: 700 }}>My Active Session</Typography>
            <Chip
              size="small"
              color={activeEntry ? "warning" : "default"}
              label={activeEntry ? "Clocked In" : "Not Clocked In"}
            />
          </Stack>

          {activeEntry ? (
            <Stack sx={{ gap: 0.75, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Started:{" "}
                {formatDateTime(activeEntry.clockInAt, displayTimeZone)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Elapsed: {formatElapsedFromNow(activeEntry.clockInAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Breaks: {getBreakSummary(activeEntry, displayTimeZone)}
              </Typography>
              {activeEntry?.scheduleId?.startTime &&
              activeEntry?.scheduleId?.endTime ? (
                <Typography variant="body2" color="text.secondary">
                  Shift Window:{" "}
                  {formatDateTime(
                    activeEntry.scheduleId.startTime,
                    displayTimeZone,
                  )}{" "}
                  to{" "}
                  {formatDateTime(
                    activeEntry.scheduleId.endTime,
                    displayTimeZone,
                  )}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Stack sx={{ gap: 0.75, mb: 2 }}>
              <Alert severity="info">No active session right now.</Alert>
              {clockInWindowState.nextSchedule ? (
                <Typography variant="body2" color="text.secondary">
                  Next session:{" "}
                  {formatSessionWindow(
                    clockInWindowState.nextSchedule,
                    displayTimeZone,
                  )}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No upcoming schedule.
                </Typography>
              )}
              {!clockInWindowState.canClockInFromScheduleWindow ? (
                <Typography variant="caption" color="text.secondary">
                  {clockInWindowState.reason === "no_upcoming_schedule"
                    ? "Clock In is unavailable because there is no upcoming schedule in your allowed window."
                    : clockInWindowState.nextAvailableAt
                      ? `Clock In will be available at ${formatDateTime(
                          clockInWindowState.nextAvailableAt,
                          displayTimeZone,
                        )} based on your shift window.`
                      : "Clock In is unavailable right now because you are outside your allowed shift window."}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Clock In is available now.
                </Typography>
              )}
              {entries[0]?.clockOutAt ? (
                <Typography variant="caption" color="text.secondary">
                  Last clock-out:{" "}
                  {formatDateTime(entries[0].clockOutAt, displayTimeZone)}
                </Typography>
              ) : null}
            </Stack>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              disabled={!canClockIn || submitting}
              onClick={handleClockIn}
            >
              Clock In
            </Button>
            <Button
              variant="outlined"
              startIcon={<FiCoffee />}
              disabled={!canStartBreak || submitting}
              onClick={handleStartBreak}
            >
              Start Break
            </Button>
            <Button
              variant="outlined"
              disabled={!canEndBreak || submitting}
              onClick={handleEndBreak}
            >
              End Break
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={!canClockOut || submitting}
              onClick={handleClockOut}
            >
              Clock Out
            </Button>
          </Stack>
        </Paper>
      )}

      {!isAdmin && (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
            My Time Entries
          </Typography>

          {entries.length === 0 ? (
            <Alert severity="info">No time entries yet.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {entries.slice(0, 10).map((entry) => {
                const displayStatus = getDisplayAttendanceStatus(entry);
                const breakCount = Array.isArray(entry?.breaks)
                  ? entry.breaks.length
                  : 0;
                return (
                  <Paper
                    key={entry._id || `${entry.clockInAt}-${entry.clockOutAt}`}
                    sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="body2">
                          {formatDateTime(entry.clockInAt, displayTimeZone)} to{" "}
                          {formatDateTime(entry.clockOutAt, displayTimeZone)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Breaks: {breakCount}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={STATUS_COLOR[displayStatus] || "default"}
                        label={formatStatusLabel(displayStatus)}
                      />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      {isAdmin && (
        <>
          <Paper
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
              Attendance Monitor
            </Typography>

            {adminEntries.length === 0 ? (
              <Alert severity="info">No entries found for this tenant.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell>Attendance Status</TableCell>
                      <TableCell>Clock In</TableCell>
                      <TableCell>Clock Out</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminEntries.slice(0, 20).map((entry) => {
                      const displayStatus = getDisplayAttendanceStatus(entry);
                      const staffName =
                        entry?.staffId?.name ||
                        entry?.staff?.name ||
                        entry?.staffName ||
                        "Staff";

                      return (
                        <TableRow
                          key={
                            entry._id ||
                            `${entry.clockInAt}-${entry.clockOutAt}`
                          }
                        >
                          <TableCell>{staffName}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={STATUS_COLOR[displayStatus] || "default"}
                              label={formatStatusLabel(displayStatus)}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDateTime(entry.clockInAt, displayTimeZone)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(entry.clockOutAt, displayTimeZone)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
