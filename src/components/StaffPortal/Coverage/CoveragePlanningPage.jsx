import { useEffect, useState, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  GlobalStyles,
  Stack,
  Alert,
} from "@mui/material";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import axios from "axios";
import { FiCalendar, FiList, FiPlus } from "react-icons/fi";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import { useAuth } from "../../../context/AuthContext";
import CoverageCreateForm from "./CoverageCreateForm";

const ROLE_LABELS = {
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  billing: "Billing",
  staff: "Staff",
  other: "Other",
};

const ROLE_COLORS = {
  doctor: "#0ea5a4",
  nurse: "#f97316",
  receptionist: "#2563eb",
  billing: "#f59e0b",
  staff: "#6b7280",
  other: "#6b7280",
};

const statusColors = {
  open: "#f59e0b",
  partial: "#f97316",
  filled: "#10b981",
};

export default function CoveragePlanningPage() {
  const { user, isAdmin } = useAuth();

  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");
  const [selectedRole, setSelectedRole] = useState("all");

  const [openAdd, setOpenAdd] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCoverages();
  }, []);

  const fetchCoverages = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/v1/coverage", {
        withCredentials: true,
      });
      setCoverages(res.data || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch coverage", err);
      setError("Failed to load coverage data");
    } finally {
      setLoading(false);
    }
  };

  const askDelete = (id) => {
    if (!isAdmin) return;
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/v1/coverage/${deleteId}`, {
        withCredentials: true,
      });
      fetchCoverages();
    } catch (err) {
      console.error("Failed to delete coverage", err);
      setError("Failed to delete coverage");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const calendarEvents = useMemo(() => {
    return coverages
      .filter((c) => selectedRole === "all" || c.role === selectedRole)
      .map((c) => ({
        id: c._id,
        title: `${ROLE_LABELS[c.role] || c.role} (${c.requiredCount || 1})`,
        start: c.startTime,
        end: c.endTime,
        backgroundColor:
          statusColors[
            c.remaining > 0
              ? c.remaining < c.requiredCount
                ? "partial"
                : "open"
              : "filled"
          ] || "#6b7280",
        borderColor:
          statusColors[
            c.remaining > 0
              ? c.remaining < c.requiredCount
                ? "partial"
                : "open"
              : "filled"
          ] || "#6b7280",
        textColor: "#fff",
        // use startTime as the canonical date for display (keeps date aligned with local shift start)
        extendedProps: {
          note: c.note,
          date: c.startTime || c.date,
          remaining: c.remaining,
        },
      }));
  }, [coverages, selectedRole]);

  // Helper: backend stores times in UTC; convert to local Date for display
  const toLocal = (utc) => {
    if (!utc) return null;
    // Accept Date objects or ISO strings
    // new Date(isoString) already produces a Date object in the local timezone
    // If utc is already a Date, new Date(utc) will clone it.
    return new Date(utc);
  };

  // Filtered + sorted coverages (most recent -> least recent)
  const displayedCoverages = useMemo(() => {
    const filtered = coverages.filter(
      (c) => selectedRole === "all" || c.role === selectedRole
    );
    return filtered.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (db !== da) return db - da; // most recent first
      // fallback: compare startTime
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [coverages, selectedRole]);

  const paginated = displayedCoverages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Coverage Planning
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define staffing requirements
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Stack
            direction="row"
            spacing={0}
            sx={{ bgcolor: "#F3F4F6", borderRadius: 2, p: 0.5 }}
          >
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(e, next) => next && setView(next)}
              sx={{
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
              <ToggleButton value="table">
                <FiList style={{ marginRight: 8 }} />
                List
              </ToggleButton>
              <ToggleButton value="calendar">
                <FiCalendar style={{ marginRight: 8 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {isAdmin && (
            <Button
              size="small"
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => setOpenAdd(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                bgcolor: "#2563EB",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Add Coverage
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters + List view */}
      <Paper sx={{ bgcolor: "white", borderRadius: 2, p: 2, mb: 3 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", lg: "row" }}
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Typography color="text.secondary">Filter by role:</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                onClick={() => setSelectedRole("all")}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  bgcolor: selectedRole === "all" ? "#2563EB" : "#F3F4F6",
                  color: selectedRole === "all" ? "#fff" : "#374151",
                }}
              >
                All Roles
              </Button>

              {Object.keys(ROLE_LABELS)
                .filter((r) =>
                  ["doctor", "nurse", "receptionist", "billing"].includes(r)
                )
                .map((role) => (
                  <Button
                    key={role}
                    size="small"
                    onClick={() => setSelectedRole(role)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      bgcolor:
                        selectedRole === role ? ROLE_COLORS[role] : "#F3F4F6",
                      color: selectedRole === role ? "#fff" : "#374151",
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                ))}
            </Box>
          </Box>

          <Box>{/* placeholder for future controls */}</Box>
        </Box>
      </Paper>

      {view === "table" ? (
        <>
          <Paper sx={{ mt: 3, p: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: "#F8FAFC" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                    Role
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                    Shift Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                    Required Staff
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                    Notes
                  </TableCell>
                  {isAdmin && (
                    <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow
                    key={c._id}
                    sx={{ "&:hover": { background: "#f3f4f6" } }}
                  >
                    <TableCell>
                      {toLocal(c.startTime || c.date)?.toLocaleDateString()}
                    </TableCell>
                    <TableCell>{ROLE_LABELS[c.role] || c.role}</TableCell>
                    <TableCell>{`${toLocal(c.startTime)?.toLocaleTimeString(
                      [],
                      { hour: "numeric", minute: "2-digit" }
                    )} - ${toLocal(c.endTime)?.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`}</TableCell>
                    <TableCell>{c.requiredCount}</TableCell>
                    <TableCell>{c.note || "—"}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => askDelete(c._id)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Custom pagination to match Figma */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {page * rowsPerPage + 1} to{" "}
                {Math.min((page + 1) * rowsPerPage, coverages.length)} of{" "}
                {coverages.length}
              </Typography>
              <Box>
                <Button
                  size="small"
                  sx={{ mr: 1 }}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(
                        Math.floor((coverages.length - 1) / rowsPerPage),
                        p + 1
                      )
                    )
                  }
                  disabled={(page + 1) * rowsPerPage >= coverages.length}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      ) : (
        <Box mt={3} sx={{ background: "white", borderRadius: 2, p: 2 }}>
          <GlobalStyles
            styles={{
              ".fc-timegrid-slot-label": {
                color: "#374151 !important",
                fontSize: "13px !important",
              },
              ".fc-daygrid-day-number": { color: "#374151 !important" },
              ".fc-daygrid-event": {
                color: "#fff !important",
                borderRadius: "8px !important",
                padding: "2px 4px",
              },
              ".fc-event-main": { color: "#fff !important" },
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
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            events={calendarEvents.map((e) => ({
              ...e,
              start: toLocal(e.start),
              end: toLocal(e.end),
            }))}
            eventClick={(info) => {
              // no edit for now - could open modal to edit coverage
            }}
            height="72vh"
            nowIndicator={true}
          />
        </Box>
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)}>
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 520,
            p: 4,
            borderRadius: 3,
          }}
        >
          <CoverageCreateForm
            onSuccess={() => {
              setOpenAdd(false);
              fetchCoverages();
            }}
          />
        </Paper>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Coverage?"
        message="This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </Container>
  );
}
