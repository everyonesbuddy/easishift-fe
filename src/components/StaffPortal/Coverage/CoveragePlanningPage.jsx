import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Dialog,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  GlobalStyles,
  Stack,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import api from "../../../config/api";
import { FiCalendar, FiList, FiPlus, FiDelete, FiEdit2 } from "react-icons/fi";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import { useAuth } from "../../../context/AuthContext";
import CoverageCreateForm from "./CoverageCreateForm";
import CoverageEditCountForm from "./CoverageEditCountForm";
import {
  getRoleDisplayName,
  getRoleOptionsFromFacilityPreferences,
  getRoleOptionsForIndustry,
  isRoleCompatible,
} from "../../../constants/industryRoles";

const statusColors = {
  open: "#f59e0b",
  partial: "#f97316",
  filled: "#10b981",
};

export default function CoveragePlanningPage() {
  const { isAdmin, tenant, facilityPreferences } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");
  const [selectedRole, setSelectedRole] = useState("all");

  const [openAdd, setOpenAdd] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [selectedCoverageIds, setSelectedCoverageIds] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState("");

  const roleOptions = useMemo(() => {
    const facilityOptions =
      getRoleOptionsFromFacilityPreferences(facilityPreferences);
    if (facilityOptions.length) return facilityOptions;
    return getRoleOptionsForIndustry(tenant?.industry);
  }, [facilityPreferences, tenant?.industry]);

  const filterRoleOptions = useMemo(() => {
    const existingRoles = coverages.map((c) => c.role).filter(Boolean);
    const industryRoles = roleOptions.map((item) => item.value);
    return Array.from(new Set([...industryRoles, ...existingRoles]));
  }, [coverages, roleOptions]);

  const getCoverageDayKey = (coverageDate) => {
    if (!coverageDate) return "";

    if (typeof coverageDate === "string") {
      const match = coverageDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match?.[1]) return match[1];
    }

    const d = new Date(coverageDate);
    if (Number.isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseCoverageDateAsLocal = (coverageDate) => {
    const dayKey = getCoverageDayKey(coverageDate);
    if (!dayKey) return null;
    return new Date(`${dayKey}T00:00:00`);
  };

  useEffect(() => {
    fetchCoverages();
  }, []);

  const fetchCoverages = async () => {
    setLoading(true);
    try {
      const res = await api.get("/coverage");
      const nextCoverages = res.data || [];
      setCoverages(nextCoverages);
      setSelectedCoverageIds((prev) =>
        prev.filter((id) =>
          nextCoverages.some((coverage) => coverage._id === id),
        ),
      );
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

  const openEdit = (coverage) => {
    if (!isAdmin || !coverage) return;
    setEditingCoverage(coverage);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/coverage/${deleteId}`);
      fetchCoverages();
    } catch (err) {
      console.error("Failed to delete coverage", err);
      setError("Failed to delete coverage");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const toggleCoverageSelection = (id) => {
    setSelectedCoverageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllPaginated = () => {
    const paginatedIds = paginated.map((coverage) => coverage._id);
    const allSelected =
      paginatedIds.length > 0 &&
      paginatedIds.every((id) => selectedCoverageIds.includes(id));

    if (allSelected) {
      setSelectedCoverageIds((prev) =>
        prev.filter((id) => !paginatedIds.includes(id)),
      );
      return;
    }

    setSelectedCoverageIds((prev) =>
      Array.from(new Set([...prev, ...paginatedIds])),
    );
  };

  const confirmBulkDelete = async () => {
    try {
      await api.delete("/coverage/bulk", {
        data: { ids: selectedCoverageIds },
      });
      await fetchCoverages();
      setSelectedCoverageIds([]);
    } catch (err) {
      console.error("Failed to delete selected coverages", err);
      const msg =
        err?.response?.data?.message || "Failed to delete selected coverage";
      setError(msg);
    } finally {
      setBulkConfirmOpen(false);
    }
  };

  function toLocal(utc) {
    if (!utc) return null;
    return new Date(utc);
  }

  function spansOvernight(coverage) {
    if (typeof coverage?.spansOvernight === "boolean") {
      return coverage.spansOvernight;
    }

    const start = toLocal(coverage?.startTime);
    const end = toLocal(coverage?.endTime);

    if (!start || !end) return false;

    return start.toDateString() !== end.toDateString();
  }

  function formatCoverageDateLabel(coverage) {
    const start = toLocal(coverage?.startTime);

    if (!start) {
      return parseCoverageDateAsLocal(
        coverage?.date || coverage?.startTime,
      )?.toLocaleDateString();
    }

    const startLabel = start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!spansOvernight(coverage)) {
      return startLabel;
    }

    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);

    const endLabel = nextDay.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startLabel} - ${endLabel}`;
  }

  function formatCoverageTimeLabel(coverage) {
    const start = toLocal(coverage?.startTime);
    const end = toLocal(coverage?.endTime);

    if (!start || !end) return "";

    const startDateLabel = start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endDateLabel = end.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const startLabel = start.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const endLabel = end.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${startDateLabel} ${startLabel} - ${endDateLabel} ${endLabel}`;
  }

  function formatRequiredCertTags(coverage) {
    if (!Array.isArray(coverage?.requiredCertificationTags)) return "—";
    const tags = coverage.requiredCertificationTags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean);
    return tags.length ? tags.join(", ") : "—";
  }

  const calendarEvents = useMemo(() => {
    return coverages
      .filter(
        (c) => selectedRole === "all" || isRoleCompatible(c.role, selectedRole),
      )
      .map((c) => ({
        id: c._id,
        title: `${getRoleDisplayName(c.role)} (${c.requiredCount || 1})${
          c.unitArea ? ` • ${c.unitArea}` : ""
        }${c.shiftType ? ` • ${c.shiftType}` : ""}${c.shiftTag ? ` • ${c.shiftTag}` : ""}`,
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
        extendedProps: {
          note: c.note,
          date: c.date || c.startTime,
          remaining: c.remaining,
          spansOvernight: spansOvernight(c),
        },
      }));
  }, [coverages, selectedRole]);

  const displayedCoverages = useMemo(() => {
    const filtered = coverages.filter(
      (c) => selectedRole === "all" || isRoleCompatible(c.role, selectedRole),
    );
    return filtered.sort((a, b) => {
      const da = getCoverageDayKey(a.date);
      const db = getCoverageDayKey(b.date);
      if (db !== da) return db.localeCompare(da);
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [coverages, selectedRole]);

  const paginated = displayedCoverages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const paginatedIds = paginated.map((coverage) => coverage._id);
  const allPaginatedSelected =
    paginatedIds.length > 0 &&
    paginatedIds.every((id) => selectedCoverageIds.includes(id));

  return (
    <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        sx={{ flexDirection: { xs: "column", md: "row" }, gap: 2 }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontSize: { xs: "1.1rem", md: "1.25rem" } }}
          >
            Coverage Planning
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.78rem", md: "0.875rem" } }}
          >
            Define staffing requirements
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "space-between", md: "flex-end" },
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Stack
            direction="row"
            spacing={0}
            sx={{
              bgcolor: "#F3F4F6",
              borderRadius: 2,
              p: 0.5,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(e, next) => next && setView(next)}
              sx={{
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
                <FiList style={{ marginRight: 8 }} />
                List
              </ToggleButton>
              <ToggleButton
                value="calendar"
                sx={{ width: { xs: "50%", md: "auto" } }}
              >
                <FiCalendar style={{ marginRight: 8 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {isAdmin && (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{ width: { xs: "100%", md: "auto" } }}
            >
              {view === "table" && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={selectedCoverageIds.length === 0}
                  onClick={() => setBulkConfirmOpen(true)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 3,
                    width: { xs: "100%", md: "auto" },
                  }}
                >
                  Delete Selected ({selectedCoverageIds.length})
                </Button>
              )}

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
                  width: { xs: "100%", md: "auto" },
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                Add Coverage
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ bgcolor: "white", borderRadius: 2, p: 2, mb: 3 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", lg: "row" }}
          alignItems="center"
          gap={2}
        >
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            sx={{ width: { xs: "100%", lg: "auto" } }}
          >
            <Typography
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.78rem", lg: "0.875rem" },
                minWidth: { xs: "auto", lg: "auto" },
              }}
            >
              Filter by role:
            </Typography>
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
            >
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                {filterRoleOptions.map((role) => (
                  <MenuItem key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>{/* placeholder for future controls */}</Box>
        </Box>
      </Paper>

      {view === "table" ? (
        isCompact ? (
          <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
            {paginated.map((c) => (
              <Paper key={c._id} sx={{ p: 2 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    {isAdmin && (
                      <Checkbox
                        size="small"
                        checked={selectedCoverageIds.includes(c._id)}
                        onChange={() => toggleCoverageSelection(c._id)}
                        sx={{ p: 0, mb: 0.5 }}
                      />
                    )}
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {getRoleDisplayName(c.role)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {formatCoverageDateLabel(c)} •{" "}
                      {formatCoverageTimeLabel(c)}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                    >
                      Unit Area: {c.unitArea || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Shift Type: {c.shiftType || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Shift Slot: {c.shiftTag || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Cert Tags: {formatRequiredCertTags(c)}
                    </Typography>
                    {spansOvernight(c) && (
                      <Typography
                        sx={{ fontSize: 12, color: "info.main", mt: 0.5 }}
                      >
                        Overnight shift
                      </Typography>
                    )}
                    <Typography
                      sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                      noWrap
                    >
                      {c.note || "—"}
                    </Typography>
                  </Box>
                  <Stack spacing={1}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "text.secondary",
                        textAlign: "right",
                      }}
                    >
                      {c.requiredCount} needed
                    </Typography>
                    {isAdmin && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<FiEdit2 />}
                          onClick={() => openEdit(c)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<FiDelete />}
                          color="error"
                          onClick={() => askDelete(c._id)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Paper>
            ))}

            <Box display="flex" justifyContent="center">
              <TablePagination
                component="div"
                count={displayedCoverages.length}
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
            <Paper sx={{ mt: 3, p: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: "#F8FAFC" }}>
                    {isAdmin && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={allPaginatedSelected}
                          indeterminate={
                            selectedCoverageIds.length > 0 &&
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
                      Role
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.72rem",
                      }}
                    >
                      Shift Time
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.72rem",
                      }}
                    >
                      Required Staff
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.72rem",
                      }}
                    >
                      Details
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "0.72rem",
                      }}
                    >
                      Notes
                    </TableCell>
                    {isAdmin && (
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#0F172A",
                          fontSize: "0.72rem",
                        }}
                      >
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
                      {isAdmin && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedCoverageIds.includes(c._id)}
                            onChange={() => toggleCoverageSelection(c._id)}
                          />
                        </TableCell>
                      )}
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            px: 1,
                            py: 0.35,
                            borderRadius: 1,
                            backgroundColor: "#EEF2FF",
                            color: "#1E3A8A",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getRoleDisplayName(c.role)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        <Typography
                          sx={{ fontSize: "0.76rem", fontWeight: 600 }}
                        >
                          {formatCoverageDateLabel(c)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                        >
                          {formatCoverageTimeLabel(c)
                            .replace(`${formatCoverageDateLabel(c)} `, "")
                            .replace(
                              ` - ${formatCoverageDateLabel(c)} `,
                              " - ",
                            )}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          {c.requiredCount}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                        >
                          needed
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", fontSize: "0.7rem" }}
                        >
                          Unit: {c.unitArea || "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", fontSize: "0.7rem" }}
                        >
                          Shift: {c.shiftType || "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", fontSize: "0.7rem" }}
                        >
                          Slot: {c.shiftTag || "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", fontSize: "0.7rem" }}
                        >
                          Certs: {formatRequiredCertTags(c)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", maxWidth: 220 }}>
                        <Box
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.note || "—"}
                        </Box>
                      </TableCell>
                      {isAdmin && (
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Edit coverage">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => openEdit(c)}
                              >
                                <FiEdit2 />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete coverage">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => askDelete(c._id)}
                              >
                                <FiDelete />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                          p + 1,
                        ),
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
        )
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
            slotMaxTime="24:00:00"
            events={calendarEvents.map((e) => ({
              ...e,
              start: toLocal(e.start),
              end: toLocal(e.end),
            }))}
            eventClick={(info) => {
              if (!isAdmin) return;
              const matched = coverages.find((c) => c._id === info.event.id);
              if (matched) openEdit(matched);
            }}
            height="72vh"
            nowIndicator={true}
          />
        </Box>
      )}

      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
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
          <CoverageCreateForm
            onClose={() => setOpenAdd(false)}
            onSuccess={() => {
              setOpenAdd(false);
              fetchCoverages();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingCoverage)}
        onClose={() => setEditingCoverage(null)}
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
          <CoverageEditCountForm
            coverage={editingCoverage}
            onClose={() => setEditingCoverage(null)}
            onSuccess={() => {
              setEditingCoverage(null);
              fetchCoverages();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Coverage?"
        message="This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Selected Coverage?"
        message={`Delete ${selectedCoverageIds.length} selected coverage item(s)? This action cannot be undone.`}
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
      />
    </Container>
  );
}
