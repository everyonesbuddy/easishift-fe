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
import {
  FiCalendar,
  FiList,
  FiPlus,
  FiDelete,
  FiEdit2,
  FiEye,
} from "react-icons/fi";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import { useAuth } from "../../../context/AuthContext";
import CoverageCreateForm from "./CoverageCreateForm";
import CoverageEditCountForm from "./CoverageEditCountForm";
import {
  getRoleDisplayName,
  getRoleColor,
  getUnitAreaDisplayName,
  getShiftTypeDisplayName,
  getShiftTagDisplayName,
  getCertificationTagDisplayName,
  getRoleOptionsFromFacilityPreferences,
  isRoleCompatible,
} from "../../../constants/industryRoles";

const statusColors = {
  open: "#f59e0b",
  partial: "#f97316",
  filled: "#10b981",
};

export default function CoveragePlanningPage() {
  const { isAdmin, facilityPreferences } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");
  const [selectedRole, setSelectedRole] = useState("all");

  const [openAdd, setOpenAdd] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCoverage, setSelectedCoverage] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [selectedCoverageIds, setSelectedCoverageIds] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState("");

  const roleOptions = useMemo(() => {
    return getRoleOptionsFromFacilityPreferences(facilityPreferences);
  }, [facilityPreferences]);

  const filterRoleOptions = useMemo(() => {
    const existingRoles = coverages.map((c) => c.role).filter(Boolean);
    const industryRoles = roleOptions.map((item) => item.value);
    return Array.from(new Set([...industryRoles, ...existingRoles]));
  }, [coverages, roleOptions]);

  const getRoleChipStyles = (role) => {
    const roleColor = getRoleColor(role);
    return {
      px: 1,
      py: 0.4,
      borderRadius: 1,
      backgroundColor: `${roleColor}22`,
      color: roleColor,
      fontWeight: 600,
      fontSize: "0.72rem",
      whiteSpace: "nowrap",
    };
  };

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

  const openDetails = (coverage) => {
    if (!coverage) return;
    setSelectedCoverage(coverage);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedCoverage(null);
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
    // Always compute from local time — the backend's spansOvernight is UTC-based
    // and will be wrong when the UTC dates match but local dates differ (e.g. 11 PM → 7 AM shift)
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
      .map((tag) => getCertificationTagDisplayName(tag))
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
          c.unitArea ? ` • ${getUnitAreaDisplayName(c.unitArea)}` : ""
        }${c.shiftType ? ` • ${getShiftTypeDisplayName(c.shiftType)}` : ""}${c.shiftTag ? ` • ${getShiftTagDisplayName(c.shiftTag)}` : ""}`,
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
                      Unit Area: {getUnitAreaDisplayName(c.unitArea)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Shift Type: {getShiftTypeDisplayName(c.shiftType)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Shift Slot: {getShiftTagDisplayName(c.shiftTag)}
                    </Typography>
                    {spansOvernight(c) && (
                      <Typography
                        sx={{ fontSize: 12, color: "info.main", mt: 0.5 }}
                      >
                        Overnight shift
                      </Typography>
                    )}
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
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FiEye />}
                      onClick={() => openDetails(c)}
                      sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                      View
                    </Button>
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
            <Table sx={{ mt: 2, background: "white" }} size="small">
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
                    Required
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
                    Actions
                  </TableCell>
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
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      <Box component="span" sx={getRoleChipStyles(c.role)}>
                        {getRoleDisplayName(c.role)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      <Typography sx={{ fontSize: "0.76rem", fontWeight: 600 }}>
                        {formatCoverageDateLabel(c)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                      >
                        {toLocal(c.startTime)?.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        }) || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      <Typography sx={{ fontSize: "0.76rem", fontWeight: 600 }}>
                        {spansOvernight(c)
                          ? toLocal(c.endTime)?.toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : formatCoverageDateLabel(c)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                      >
                        {toLocal(c.endTime)?.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        }) || "-"}
                        {spansOvernight(c) ? " (+1 day)" : ""}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
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
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      {getUnitAreaDisplayName(c.unitArea)}
                    </TableCell>
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      {getShiftTypeDisplayName(c.shiftType)}
                    </TableCell>
                    <TableCell sx={{ color: "black", fontSize: "0.78rem" }}>
                      {getShiftTagDisplayName(c.shiftTag)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={() => openDetails(c)}
                            sx={{ color: "#475569" }}
                          >
                            <FiEye />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Edit coverage">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => openEdit(c)}
                            >
                              <FiEdit2 />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdmin && (
                          <Tooltip title="Delete coverage">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => askDelete(c._id)}
                            >
                              <FiDelete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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
              sx={{ mt: 1 }}
            />
          </>
        )
      ) : (
        <Box mt={3} sx={{ background: "white", borderRadius: 2, p: 2 }}>
          <GlobalStyles
            styles={{
              ".fc": {
                "--fc-border-color": "#E2E8F0",
              },
              ".fc .fc-toolbar": {
                marginBottom: "0.85rem",
              },
              ".fc .fc-toolbar-title": {
                color: "#0F172A",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.01em",
              },
              ".fc .fc-button": {
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                color: "#0F172A",
                boxShadow: "none",
                textTransform: "capitalize",
                borderRadius: "8px",
              },
              ".fc .fc-button:hover": {
                background: "#F8FAFC",
                borderColor: "#94A3B8",
              },
              ".fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active":
                {
                  background: "#2563EB",
                  borderColor: "#2563EB",
                  color: "#FFFFFF",
                },
              ".fc .fc-scrollgrid": {
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                overflow: "hidden",
              },
              ".fc .fc-col-header-cell-cushion": {
                color: "#334155",
                fontWeight: 700,
                fontSize: "0.75rem",
                padding: "0.55rem 0.35rem",
              },
              ".fc-timegrid-slot-label": {
                color: "#475569 !important",
                fontSize: "12px !important",
              },
              ".fc .fc-timegrid-slot": {
                height: "2.6rem",
              },
              ".fc .fc-timegrid-col.fc-day-today": {
                background: "#EFF6FF",
              },
              ".fc .fc-timegrid-now-indicator-line": {
                borderColor: "#DC2626",
                borderWidth: "2px",
              },
              ".fc .fc-timegrid-now-indicator-arrow": {
                borderColor: "#DC2626",
              },
              ".fc-daygrid-day-number": { color: "#374151 !important" },
              ".fc-daygrid-event": {
                color: "#fff !important",
                borderRadius: "10px !important",
                padding: "2px 6px",
              },
              ".fc-event-main": {
                color: "#fff !important",
                fontWeight: 600,
                fontSize: "0.72rem",
              },
              ".fc .fc-event": {
                border: "none",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.2)",
              },
              ".fc-daygrid-day.fc-day-today, .fc-timegrid-now": {
                background: "#EFF6FF",
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
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotLabelInterval="01:00:00"
            slotDuration="00:30:00"
            dayHeaderFormat={{
              weekday: "short",
              month: "numeric",
              day: "numeric",
            }}
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
        open={detailsOpen}
        onClose={closeDetails}
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
          {selectedCoverage ? (
            <Box display="flex" flexDirection="column" gap={1.4}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Coverage Details
              </Typography>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Role
                </Typography>
                <Typography>{getRoleDisplayName(selectedCoverage.role)}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography>{formatCoverageDateLabel(selectedCoverage)}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time
                </Typography>
                <Typography>{formatCoverageTimeLabel(selectedCoverage)}</Typography>
              </Box>

              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={1.2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Required Staff
                  </Typography>
                  <Typography>{selectedCoverage.requiredCount ?? "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Remaining
                  </Typography>
                  <Typography>{selectedCoverage.remaining ?? "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Unit Area
                  </Typography>
                  <Typography>
                    {getUnitAreaDisplayName(selectedCoverage.unitArea) || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Shift Type
                  </Typography>
                  <Typography>
                    {getShiftTypeDisplayName(selectedCoverage.shiftType) || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Shift Slot
                  </Typography>
                  <Typography>
                    {getShiftTagDisplayName(selectedCoverage.shiftTag) || "-"}
                  </Typography>
                </Box>

              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Required Certification Tags
                </Typography>
                <Typography>{formatRequiredCertTags(selectedCoverage)}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", color: "#334155" }}>
                  {selectedCoverage.note || "—"}
                </Typography>
              </Box>

              {spansOvernight(selectedCoverage) && (
                <Typography variant="caption" sx={{ color: "info.main", mt: 0.5 }}>
                  Overnight shift
                </Typography>
              )}
            </Box>
          ) : null}
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
