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
import QrScannerDialog from "../../Shared/QrScannerDialog";

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
const QR_STATION_POLL_INTERVAL_MS = 5000;

const toIsoNow = () => new Date().toISOString();

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const normalizeEntriesFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.timeEntries)) return data.timeEntries;
  if (data?.entry) return [data.entry];
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
  if (normalized === "geofence") return "qr";
  if (normalized === "manual") return "open";
  return normalized === "qr" ? "qr" : "open";
};

export default function TimeTrackingPage() {
  const { isAdmin, facilityPreferences, fetchFacilityPreferences } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [adminEntries, setAdminEntries] = useState([]);
  const [qrScanAction, setQrScanAction] = useState(null);
  const [qrStationToken, setQrStationToken] = useState("");
  const [qrTokenVersion, setQrTokenVersion] = useState(null);

  const trackingConfig = facilityPreferences?.timeTracking || {};
  const trackingEnabled = Boolean(trackingConfig.enabled);
  const trackingMode = normalizeTrackingMode(trackingConfig.mode);
  const requiresQrToken = trackingMode === "qr";

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

  const loadAdminEntries = useCallback(async () => {
    if (!isAdmin) return;
    const res = await api.get("/time-tracking");
    const normalizedEntries = safeSortByClockInDesc(
      normalizeEntriesFromResponse(res.data),
    );
    setAdminEntries(normalizedEntries);
  }, [isAdmin]);

  const applyNextQrToken = useCallback((payload) => {
    const nextToken = payload?.nextQrToken || payload?.token || "";
    const nextVersion =
      payload?.nextQrTokenVersion ?? payload?.tokenVersion ?? null;

    if (nextToken) {
      setQrStationToken(nextToken);
    }
    if (nextVersion !== null && nextVersion !== undefined) {
      setQrTokenVersion(nextVersion);
    }
  }, []);

  const refreshQrStationToken = useCallback(async () => {
    setRefreshing(true);
    try {
      const tokenRes = await api.post("/time-tracking/qr-token");
      applyNextQrToken(tokenRes.data);
    } catch (err) {
      toast.error(extractMessage(err, "Failed to rotate QR token"));
    } finally {
      setRefreshing(false);
    }
  }, [applyNextQrToken]);

  const syncCurrentQrStationToken = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const tokenRes = await api.get("/time-tracking/qr-token/current");
        applyNextQrToken(tokenRes.data);
      } catch (err) {
        if (!silent) {
          toast.error(extractMessage(err, "Failed to fetch current QR token"));
        }
      }
    },
    [applyNextQrToken],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const latestPrefs = await fetchFacilityPreferences();
      await loadStaffEntries();
      await loadAdminEntries();

      const latestMode = normalizeTrackingMode(latestPrefs?.timeTracking?.mode);
      if (isAdmin && latestMode === "qr") {
        await syncCurrentQrStationToken({ silent: true });
      }
      if (isAdmin && latestMode !== "qr") {
        setQrStationToken("");
        setQrTokenVersion(null);
      }
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
    syncCurrentQrStationToken,
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
        await loadAdminEntries();
        if (isAdmin && latestMode === "qr") {
          await syncCurrentQrStationToken({ silent: true });
        } else if (mounted) {
          setQrStationToken("");
          setQrTokenVersion(null);
        }
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
    applyNextQrToken,
    fetchFacilityPreferences,
    isAdmin,
    loadAdminEntries,
    loadStaffEntries,
    syncCurrentQrStationToken,
  ]);

  useEffect(() => {
    if (!isAdmin || !requiresQrToken || !trackingEnabled) return undefined;

    const intervalId = setInterval(() => {
      syncCurrentQrStationToken({ silent: true });
    }, QR_STATION_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isAdmin, requiresQrToken, trackingEnabled, syncCurrentQrStationToken]);

  const submitClockIn = async (qrToken = "") => {
    setSubmitting(true);
    try {
      const res = await api.post("/time-tracking/clock-in", {
        at: toIsoNow(),
        source: SOURCE,
        ...(requiresQrToken ? { qrToken: String(qrToken || "").trim() } : {}),
      });
      applyNextQrToken(res.data);
      toast.success("Clocked in");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to clock in"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    if (requiresQrToken) {
      setQrScanAction("clock-in");
      return;
    }
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

  const submitClockOut = async (qrToken = "") => {
    setSubmitting(true);
    try {
      const res = await api.post("/time-tracking/clock-out", {
        at: toIsoNow(),
        source: SOURCE,
        ...(requiresQrToken ? { qrToken: String(qrToken || "").trim() } : {}),
      });
      applyNextQrToken(res.data);
      toast.success("Clocked out");
      await refreshAll();
    } catch (err) {
      toast.error(extractMessage(err, "Failed to clock out"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (requiresQrToken) {
      setQrScanAction("clock-out");
      return;
    }
    await submitClockOut();
  };

  const handleQrScanned = async (token) => {
    const action = qrScanAction;
    const trimmedToken = String(token || "").trim();
    setQrScanAction(null);

    if (!trimmedToken) {
      toast.warning("Invalid QR code. Please try again.");
      return;
    }

    if (action === "clock-in") {
      await submitClockIn(trimmedToken);
      return;
    }

    if (action === "clock-out") {
      await submitClockOut(trimmedToken);
    }
  };

  const canClockIn = !activeEntry;
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
              color={trackingMode === "qr" ? "info" : "default"}
              label={trackingMode === "qr" ? "QR Mode" : "Open Mode"}
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

      {requiresQrToken ? (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Alert severity="info">
            QR mode is active. Staff must scan a valid facility QR code to clock
            in and clock out.
          </Alert>
        </Paper>
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

          <Stack sx={{ gap: 0.75, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Clock In: {formatDateTime(activeEntry?.clockInAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open Break:{" "}
              {openBreak
                ? `Started ${formatDateTime(openBreak.startAt)}`
                : "No"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Linked Schedule: {activeEntry?.scheduleId ? "Yes" : "No"}
            </Typography>
            {requiresQrToken ? (
              <Alert severity="info" sx={{ mt: 0.5 }}>
                QR mode: tap Clock In or Clock Out to open your camera and scan.
              </Alert>
            ) : null}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              disabled={!canClockIn || submitting}
              onClick={handleClockIn}
            >
              {requiresQrToken ? "Scan to Clock In" : "Clock In"}
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
              {requiresQrToken ? "Scan to Clock Out" : "Clock Out"}
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
                          {formatDateTime(entry.clockInAt)} to{" "}
                          {formatDateTime(entry.clockOutAt)}
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

      <QrScannerDialog
        open={Boolean(qrScanAction)}
        onClose={() => setQrScanAction(null)}
        onScan={handleQrScanned}
        title={
          qrScanAction === "clock-out"
            ? "Scan to Clock Out"
            : "Scan to Clock In"
        }
        description="Allow camera access, then point at your facility attendance QR code."
      />

      {isAdmin && (
        <>
          {requiresQrToken ? (
            <Paper
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                mb: 2,
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                QR Station
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                Display this token as a QR code at your attendance station.
              </Typography>
              <Stack spacing={1}>
                {qrStationToken ? (
                  <Box
                    sx={{
                      width: { xs: 200, md: 240 },
                      height: { xs: 200, md: 240 },
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      p: 1,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Box
                      component="img"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(qrStationToken)}`}
                      alt="Facility attendance QR"
                      sx={{ width: "100%", height: "100%", display: "block" }}
                    />
                  </Box>
                ) : null}
                <TextField
                  fullWidth
                  size="small"
                  label="Current QR Token"
                  value={qrStationToken}
                  InputProps={{ readOnly: true }}
                />
                {Number.isFinite(Number(qrTokenVersion)) ? (
                  <Typography variant="body2" color="text.secondary">
                    Token version: {Number(qrTokenVersion)}
                  </Typography>
                ) : null}
                <Button
                  variant="outlined"
                  onClick={refreshQrStationToken}
                  disabled={refreshing || submitting}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Rotate QR Token
                </Button>
              </Stack>
            </Paper>
          ) : null}

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
                            {formatDateTime(entry.clockInAt)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(entry.clockOutAt)}
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
