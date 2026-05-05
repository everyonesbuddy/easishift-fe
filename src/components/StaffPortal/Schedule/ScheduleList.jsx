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
  FormControl,
  InputLabel,
  GlobalStyles,
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
  FiEdit,
  FiDelete,
  FiRepeat,
  FiPrinter,
} from "react-icons/fi";
import ScheduleForm from "./ScheduleForm";
import AutoGenerateScheduleForm from "./AutoGenerateScheduleForm";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import ShiftSwapRequestModal from "./ShiftSwapRequestModal";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Stack from "@mui/material/Stack";

// Local role helpers (small mapping to match Figma colors)
const ROLE_COLORS = {
  admin: "#7c3aed",
  doctor: "#0ea5a4",
  nurse: "#f97316",
  rn: "#14b8a6",
  lpn: "#fb923c",
  cna: "#fdba74",
  med_aide: "#a855f7",
  caregiver: "#10b981",
  activity_aide: "#22c55e",
  dietary_aide: "#f59e0b",
  housekeeper: "#64748b",
  receptionist: "#2563eb",
  billing: "#f59e0b",
  staff: "#6b7280",
  other: "#6b7280",
  general: "#6b7280",
};

const getRoleDisplayName = (r) => {
  const map = {
    admin: "Admin",
    doctor: "Doctor",
    nurse: "Nurse",
    rn: "RN",
    lpn: "LPN",
    cna: "CNA",
    med_aide: "Med Aide",
    caregiver: "Caregiver",
    activity_aide: "Activity Aide",
    dietary_aide: "Dietary Aide",
    housekeeper: "Housekeeper",
    receptionist: "Receptionist",
    billing: "Billing",
    staff: "Staff",
    other: "Other",
    general: "General",
  };
  if (!r) return "Unknown";
  return map[r] || r.charAt(0).toUpperCase() + r.slice(1);
};

export default function ScheduleList() {
  const { user, isAdmin } = useAuth();
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
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSchedule, setSwapSchedule] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [monthDate, setMonthDate] = useState(new Date());
  const [staffVisibility, setStaffVisibility] = useState("mine");
  const [shiftTimeFilter, setShiftTimeFilter] = useState("");

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

  const openSwapRequestModal = (sched) => {
    setSwapSchedule(sched);
    setSwapModalOpen(true);
  };

  const closeSwapRequestModal = () => {
    setSwapModalOpen(false);
    setSwapSchedule(null);
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
        const startLabel = new Date(s.startTime).toLocaleTimeString("default", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const endLabel = new Date(s.endTime).toLocaleTimeString("default", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        options.push({ key, label: `${startLabel} – ${endLabel}` });
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

  return (
    <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <GlobalStyles
        styles={{
          "@media print": {
            "body:not(.printing-roster) *": { visibility: "hidden" },
            "body.printing-roster *": { visibility: "hidden" },
            "body.printing-roster #roster-print-section, body.printing-roster #roster-print-section *":
              { visibility: "visible" },
            "body.printing-roster #roster-print-section": {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
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

          {/* Bulk scheduling only for admins; Individual scheduling available to admins and non-admins (preselects current user for non-admins) */}
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
              AI Generated Schedule
            </Button>
          )}

          {/* Individual schedule: show to everyone. Non-admins will schedule themselves. */}
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
            {isAdmin ? "Manual Schedule" : "Pick Up Shift"}
          </Button>
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
                  {[
                    "all",
                    "doctor",
                    "nurse",
                    "rn",
                    "lpn",
                    "cna",
                    "med_aide",
                    "caregiver",
                    "activity_aide",
                    "dietary_aide",
                    "housekeeper",
                    "receptionist",
                    "billing",
                  ].map((r) => (
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
            {filteredSchedules
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((s) => (
                <Paper key={s._id} sx={{ p: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {s.staffId?.name || "Unknown"}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary" }}
                      >
                        {getRoleDisplayName(s.role)} •{" "}
                        {formatLocal(s.startTime)} - {formatLocal(s.endTime)}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                        noWrap
                      >
                        {s.notes || "—"}
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
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
                <TableRow>
                  <TableCell sx={{ color: "black", fontWeight: 700 }}>
                    Staff
                  </TableCell>
                  <TableCell sx={{ color: "black" }}>Role</TableCell>
                  <TableCell sx={{ color: "black" }}>Start</TableCell>
                  <TableCell sx={{ color: "black" }}>End</TableCell>
                  <TableCell sx={{ color: "black" }}>Status</TableCell>
                  <TableCell sx={{ color: "black" }}>Notes</TableCell>
                  <TableCell sx={{ color: "black" }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredSchedules
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((s) => (
                    <TableRow
                      key={s._id}
                      sx={{ "&:hover": { background: "#f3f4f6" } }}
                    >
                      <TableCell sx={{ color: "black" }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: ROLE_COLORS[s.role] || "#6b7280",
                            }}
                          />
                          <Box>{s.staffId?.name || "Unknown"}</Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "black" }}>
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.4,
                            borderRadius: 1,
                            backgroundColor:
                              (ROLE_COLORS[s.role] || "#6b7280") + "22",
                            color: ROLE_COLORS[s.role] || "#000",
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          {getRoleDisplayName(s.role)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "black" }}>
                        {formatLocal(s.startTime)}
                      </TableCell>
                      <TableCell sx={{ color: "black" }}>
                        {formatLocal(s.endTime)}
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.4,
                            borderRadius: 1,
                            border: `1px solid ${statusColors[s.status] || "#9e9e9e"}`,
                            color: statusColors[s.status] || "#000",
                            fontWeight: 600,
                            fontSize: 12,
                            background: "#fff",
                          }}
                        >
                          {s.status.replace("_", " ").toUpperCase()}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "black" }}>
                        {s.notes || "—"}
                      </TableCell>
                      <TableCell>
                        {canManageSchedule(s) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<FiEdit />}
                            onClick={() => openEdit(s)}
                            sx={{
                              mr: 1,
                              borderRadius: 2,
                              textTransform: "none",
                            }}
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
                              sx={{
                                mr: 1,
                                borderRadius: 2,
                                textTransform: "none",
                                bgcolor: "#7c3aed",
                                "&:hover": { bgcolor: "#6d28d9" },
                              }}
                            >
                              Swap Shift
                            </Button>
                          )}
                        {isAdmin && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<FiDelete />}
                            color="error"
                            onClick={() => askDelete(s._id)}
                            sx={{ borderRadius: 2, textTransform: "none" }}
                          >
                            Delete
                          </Button>
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
        <Box mt={3} id="roster-print-section">
          {/* Month view header with navigation */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2, gap: 2, flexDirection: { xs: "column", sm: "row" } }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {monthYear}
            </Typography>
            <Stack direction="row" spacing={1}>
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
              <Button
                size="small"
                variant="contained"
                startIcon={<FiPrinter />}
                onClick={() => {
                  document.body.classList.add("printing-roster");
                  window.print();
                  document.body.classList.remove("printing-roster");
                }}
                sx={{ textTransform: "none" }}
              >
                Print
              </Button>
            </Stack>
          </Box>

          {/* Schedule matrix table */}
          <Box
            sx={{
              background: "white",
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              "@media print": {
                border: "none",
                borderRadius: 0,
              },
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: "#f3f4f6" }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: 130,
                      borderRight: "1px solid #e5e7eb",
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Staff on Shift</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthDays.map((day) => {
                  const date = parseLocalDateKey(day);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dayLabel = date.toLocaleDateString("default", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const shiftsOnDay = filteredSchedules.filter(
                    (s) => getLocalDateKey(s.startTime) === day,
                  );

                  return (
                    <TableRow
                      key={day}
                      sx={{
                        background: isWeekend ? "#f9fafb" : "#fff",
                        "&:hover": { background: "#f0f4ff" },
                        "@media print": { pageBreakInside: "avoid" },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          borderRight: "1px solid #e5e7eb",
                          color: isWeekend ? "#6b7280" : "#111827",
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          pt: 1.5,
                        }}
                      >
                        {dayLabel}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {shiftsOnDay.length === 0 ? (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontStyle: "italic" }}
                          >
                            No shifts
                          </Typography>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.75,
                            }}
                          >
                            {shiftsOnDay.map((shift, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 1.5,
                                  px: 1,
                                  py: 0.4,
                                  background: "#f8faff",
                                  "@media print": {
                                    fontSize: "9px",
                                    px: 0.5,
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background:
                                      ROLE_COLORS[shift.role] || "#6b7280",
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    color: "#111827",
                                  }}
                                >
                                  {shift.staffId?.name || "Unknown"}
                                </Typography>
                                <Box
                                  sx={{
                                    fontSize: "0.7rem",
                                    background:
                                      (ROLE_COLORS[shift.role] || "#6b7280") +
                                      "22",
                                    color: ROLE_COLORS[shift.role] || "#6b7280",
                                    px: 0.75,
                                    py: 0.1,
                                    borderRadius: 1,
                                    fontWeight: 600,
                                  }}
                                >
                                  {getRoleDisplayName(shift.role)}
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.7rem",
                                    color: "#6b7280",
                                  }}
                                >
                                  {new Date(shift.startTime).toLocaleTimeString(
                                    "default",
                                    {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )}
                                  {" – "}
                                  {new Date(shift.endTime).toLocaleTimeString(
                                    "default",
                                    {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            {Object.entries(ROLE_COLORS)
              .slice(0, 8)
              .map(([role, color]) => (
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
                      background: color,
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
            background: "white",
            borderRadius: 2,
            p: 2,
            "& .fc-toolbar-title": { color: "black" },
          }}
        >
          <GlobalStyles
            styles={{
              ".fc-timegrid-slot-label": {
                color: "#374151 !important",
                fontSize: "13px !important",
              },
              ".fc-timegrid-axis-frame": { color: "#374151 !important" },
              ".fc-scrollgrid-sync-table .fc-timegrid-axis-frame": {
                color: "#374151 !important",
              },
              ".fc-daygrid-day-number": { color: "#374151 !important" },
              ".fc-daygrid-day-top": { color: "#374151 !important" },
              ".fc-daygrid-event": {
                color: "#fff !important",
                borderRadius: "8px !important",
                padding: "2px 4px",
              },
              ".fc-event-main": { color: "#fff !important" },
              ".fc-col-header-cell(fc-day)": { color: "#374151" },
              ".fc-daygrid-day.fc-day-today, .fc-timegrid-now": {
                background: "#eef2ff",
              },
            }}
          />

          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            allDaySlot={false}
            editable={isAdmin}
            selectable={isAdmin}
            eventResizableFromStart={isAdmin}
            eventDurationEditable={isAdmin}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            events={filteredSchedules.map((s) => ({
              id: s._id,
              title: s.staffId?.name,
              start: s.startTime,
              end: s.endTime,
              backgroundColor: statusColors[s.status],
              borderColor: statusColors[s.status],
              textColor: "#fff",
            }))}
            eventClick={(info) => {
              const clicked = filteredSchedules.find(
                (a) => a._id === info.event.id,
              );
              if (clicked && canManageSchedule(clicked)) {
                openEdit(clicked);
              }
            }}
            height="72vh"
            nowIndicator={true}
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

      {/* Bulk Scheduling Modal */}
      <Dialog
        open={openAutoModal}
        onClose={() => setOpenAutoModal(false)}
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
          <AutoGenerateScheduleForm
            onClose={() => setOpenAutoModal(false)}
            onSuccess={() => {
              setOpenAutoModal(false);
              window.location.reload();
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
