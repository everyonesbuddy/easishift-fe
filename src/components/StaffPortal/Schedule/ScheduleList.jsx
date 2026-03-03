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
import { FiCalendar, FiList, FiPlus, FiEdit, FiDelete } from "react-icons/fi";
import ScheduleForm from "./ScheduleForm";
import AutoGenerateScheduleForm from "./AutoGenerateScheduleForm";
import ConfirmDialog from "../../Shared/ConfirmDialog";
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // ---------------------------
  // Fetch schedules
  // ---------------------------
  const fetchSchedules = async () => {
    try {
      const res = await api.get("/schedules");

      const raw = isAdmin
        ? res.data
        : res.data.filter((s) => s.staffId?._id === user._id);

      // sort by startTime descending (newest first). fallback to createdAt when startTime missing
      const data = raw.sort((a, b) => {
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

  // ---------------------------
  // Filtered schedules
  // ---------------------------
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // roleFilter is 'all' to allow all roles
      if (roleFilter && roleFilter !== "all" && s.role !== roleFilter)
        return false;
      if (statusFilter && statusFilter !== "" && s.status !== statusFilter)
        return false;
      return true;
    });
  }, [schedules, roleFilter, statusFilter]);

  // Reset page when filters change or filtered length shrinks
  useEffect(() => {
    setPage(0);
  }, [roleFilter, statusFilter]);

  const statusColors = {
    scheduled: "#fbc02d",
    completed: "#66bb6a",
    call_out: "#ef5350",
  };

  return (
    <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
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
              sx={{ width: { xs: "50%", md: "auto" } }}
            >
              <FiList style={{ marginRight: 6 }} /> List
            </ToggleButton>
            <ToggleButton
              value="calendar"
              sx={{ width: { xs: "50%", md: "auto" } }}
            >
              <FiCalendar style={{ marginRight: 6 }} /> Calendar
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
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
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
            eventClick={(info) =>
              openEdit(schedules.find((a) => a._id === info.event.id))
            }
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
    </Container>
  );
}
