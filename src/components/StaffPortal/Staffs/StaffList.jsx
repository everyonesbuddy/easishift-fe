import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
} from "@mui/material";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useGuideTour } from "../../../context/GuideTourContext";
import {
  FiUserPlus,
  FiMail,
  FiPhone,
  FiSearch,
  FiUsers,
  FiEdit,
  FiArchive,
  FiLink,
  FiSend,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import StaffCreateAndEditForm from "./StaffCreateAndEditForm";
import BulkStaffModal from "./BulkStaffModal";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import { notSentReason } from "../../../utils/deliveryReasons";
import GuideHelpButton from "../../Shared/GuideHelpButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Stack } from "@mui/material";
import {
  getRoleDisplayName,
  getRoleColor,
  getUserRoles,
  getUnitAreaDisplayName,
  getCertificationTagDisplayName,
  getRoleOptionsFromFacilityPreferences,
} from "../../../constants/industryRoles";

// Steps differ by permission since only managers see add/import actions.
const getStaffListTourSteps = ({ canManageStaff }) => {
  const steps = [];

  if (canManageStaff) {
    steps.push({
      target: "guide-staff-add-btn",
      title: "Add a staff member",
      body: "Create a staff profile with role, allowed areas, shift types, and certification tags.",
    });
    steps.push({
      target: "guide-staff-bulk-btn",
      title: "Bulk import via CSV",
      body: "Already have a staff roster in a spreadsheet? Import everyone at once instead of adding people one by one.",
    });
  }

  steps.push({
    target: "guide-staff-search",
    title: "Search and filter",
    body: "Find staff quickly by name, email, or role.",
  });

  steps.push({
    target: "guide-staff-table",
    title: "Staff directory",
    body: "Staff don't need an account. Each person has a personal link to see their shifts; send it by text or email, or copy it.",
  });

  return steps;
};

const SMS_STATUS_LABELS = {
  opted_in: { label: "Texts on", color: "#15803D" },
  pending: { label: "Awaiting START", color: "#B45309" },
  opted_out: { label: "Opted out", color: "#B91C1C" },
};

export default function StaffList() {
  const { can, facilityPreferences, plan, usage } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [staff, setStaff] = useState([]);

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // filters/search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => setPage(0), [staff, searchTerm, filterRole]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff", { params: { status: statusFilter } });
      setStaff(res.data || []);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    }
  };

  const toastError = (err, fallback) =>
    toast.error(err?.response?.data?.message || fallback, {
      position: "top-right",
      autoClose: 3500,
    });

  const handleSendLink = async (staffUser) => {
    try {
      setBusyId(staffUser._id);
      const res = await api.post(`/staff/${staffUser._id}/send-link`);
      if (res.data?.delivered) {
        toast.success(
          `Link sent to ${staffUser.name} by ${res.data.channel === "sms" ? "text" : "email"}`,
          { position: "top-right", autoClose: 2500 },
        );
      } else {
        toast.info(
          `Not sent: ${notSentReason(res.data?.reason)}. You can copy the link instead.`,
          { position: "top-right", autoClose: 5000 },
        );
      }
    } catch (err) {
      toastError(err, "Couldn't send the link");
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (staffUser) => {
    try {
      setBusyId(staffUser._id);
      const res = await api.get(`/staff/${staffUser._id}/link`);
      await navigator.clipboard.writeText(res.data.url);
      toast.success(`Copied ${staffUser.name}'s link`, {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      toastError(err, "Couldn't copy the link");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmArchive = async () => {
    const target = archiveTarget;
    setArchiveTarget(null);
    if (!target) return;
    try {
      const res = await api.post(`/staff/${target._id}/archive`);
      const removed = res.data?.removedFutureShifts || 0;
      toast.success(
        `${target.name} archived${removed ? ` and removed from ${removed} upcoming shift${removed === 1 ? "" : "s"}` : ""}`,
        { position: "top-right", autoClose: 3000 },
      );
      await fetchStaff();
    } catch (err) {
      toastError(err, "Couldn't archive");
    }
  };

  const handleRestore = async (staffUser) => {
    try {
      setBusyId(staffUser._id);
      await api.post(`/staff/${staffUser._id}/restore`);
      toast.success(`${staffUser.name} restored`, {
        position: "top-right",
        autoClose: 2000,
      });
      await fetchStaff();
    } catch (err) {
      toastError(err, "Couldn't restore");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenEdit = (staffUser) => {
    setEditingStaff(staffUser);
    setOpen(true);
  };

  const handleAskDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/staff/${deleteId}`);
      await fetchStaff();
    } catch (err) {
      toastError(err, "Couldn't delete");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleModalClose = (refresh = false) => {
    setOpen(false);
    setEditingStaff(null);
    if (refresh) fetchStaff();
  };

  const roles = useMemo(() => {
    const facilityRoleValues = getRoleOptionsFromFacilityPreferences(
      facilityPreferences,
    ).map((option) => option.value);
    const existingRoles = staff.flatMap((user) => getUserRoles(user));

    return [
      "all",
      ...Array.from(new Set([...facilityRoleValues, ...existingRoles])),
    ];
  }, [staff, facilityPreferences]);

  const getRoleChipStyles = (roleValue) => {
    const roleColor = getRoleColor(roleValue);
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

  const filteredUsers = useMemo(() => {
    return staff.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.userPhone || "").includes(searchTerm.trim());

      const matchesRole =
        filterRole === "all" || getUserRoles(u).includes(filterRole);

      return matchesSearch && matchesRole;
    });
  }, [staff, searchTerm, filterRole]);

  const getInitials = (name) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatStringArray = (values, formatter) => {
    if (!Array.isArray(values)) return "-";
    const normalized = values
      .map((value) =>
        formatter
          ? formatter(value)
          : String(value || "")
              .trim()
              .replace(/[_-]+/g, " "),
      )
      .filter(Boolean);
    return normalized.length ? normalized.join(", ") : "-";
  };

  const canManageStaff = can("staff.manage");
  const staffLimit = plan?.limits?.staff;
  const atStaffLimit =
    staffLimit !== null &&
    staffLimit !== undefined &&
    (usage?.staff || 0) >= staffLimit;

  const renderSmsStatus = (u) => {
    const info = u.hasPhone ? SMS_STATUS_LABELS[u.smsStatus] : null;
    if (!info) return null;
    return (
      <Box
        component="span"
        sx={{ fontSize: "0.66rem", fontWeight: 700, color: info.color, ml: 0.5 }}
      >
        · {info.label}
      </Box>
    );
  };

  const renderActions = (u) => {
    const id = u._id;
    const busy = busyId === id;
    if (u.status === "archived") {
      return (
        <>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FiRotateCcw />}
            disabled={!canManageStaff || busy}
            onClick={() => handleRestore(u)}
            sx={compactActionButtonSx}
          >
            Restore
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<FiTrash2 />}
            disabled={!canManageStaff}
            onClick={() => handleAskDelete(id)}
            sx={compactActionButtonSx}
          >
            Delete
          </Button>
        </>
      );
    }
    return (
      <>
        {canManageStaff && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FiSend />}
              disabled={busy}
              onClick={() => handleSendLink(u)}
              sx={compactActionButtonSx}
            >
              Send link
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FiLink />}
              disabled={busy}
              onClick={() => handleCopyLink(u)}
              sx={compactActionButtonSx}
            >
              Copy link
            </Button>
          </>
        )}
        <Button
          size="small"
          variant="contained"
          color="info"
          startIcon={<FiEdit />}
          disabled={!canManageStaff}
          onClick={() => handleOpenEdit(u)}
          sx={compactActionButtonSx}
        >
          Edit
        </Button>
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<FiArchive />}
          disabled={!canManageStaff}
          onClick={() => setArchiveTarget(u)}
          sx={compactActionButtonSx}
        >
          Archive
        </Button>
      </>
    );
  };
  const { startTourIfUnseen } = useGuideTour();
  const staffListTourSteps = useMemo(
    () => getStaffListTourSteps({ canManageStaff }),
    [canManageStaff],
  );

  useEffect(() => {
    startTourIfUnseen("staff-list", staffListTourSteps);
    // Only ever auto-launched once per user via localStorage — intentionally no deps beyond mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const compactActionButtonSx = {
    borderRadius: 1.5,
    textTransform: "none",
    fontSize: "0.68rem",
    fontWeight: 800,
    lineHeight: 1.1,
    minHeight: 28,
    px: 0.95,
    py: 0.45,
    whiteSpace: "nowrap",
    "& .MuiButton-startIcon": {
      mr: 0.45,
      "& svg": { width: 14, height: 14 },
    },
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography
            variant="h5"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            Staff Management
            <GuideHelpButton
              tourId="staff-list"
              tourSteps={staffListTourSteps}
            />
          </Typography>
          <Typography color="text.secondary">
            Staff don't need an account. They get a personal link to their
            shifts.
            {staffLimit !== undefined && (
              <Box component="span" sx={{ ml: 1, fontWeight: 600 }}>
                {usage?.staff ?? 0} of{" "}
                {staffLimit === null ? "unlimited" : staffLimit} staff on{" "}
                {plan?.label || "your plan"}
              </Box>
            )}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {canManageStaff && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setBulkOpen(true)}
                data-guide-id="guide-staff-bulk-btn"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  whiteSpace: "nowrap",
                  width: { xs: "100%", md: "auto" },
                }}
              >
                Paste or Import List
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<FiUsers />}
                onClick={() => {
                  setEditingStaff(null);
                  setOpen(true);
                }}
                title={atStaffLimit ? "You're at your plan's staff limit" : undefined}
                data-guide-id="guide-staff-add-btn"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  bgcolor: "#2563EB",
                  color: "#fff",
                  width: { xs: "100%", md: "auto" },
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                Add Staff Member
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* filters */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Box display={{ xs: "block", lg: "flex" }} gap={2} alignItems="center">
          <Box sx={{ flex: 1 }}>
            <TextField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email or phone..."
              variant="outlined"
              size="small"
              fullWidth
              data-guide-id="guide-staff-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FiSearch style={{ color: "#9ca3af" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Box>

          <Box display="flex" gap={2} mt={{ xs: 2, lg: 0 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={filterRole}
                label="Role"
                onChange={(e) => setFilterRole(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {roles.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r === "all" ? "All Roles" : getRoleDisplayName(r)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* table on desktop, cards on tablet/mobile */}
      {isCompact ? (
        <Box sx={{ mt: 3, display: "grid", gap: 2 }}>
          {filteredUsers.length === 0 && (
            <Box textAlign="center" py={4} color="text.secondary">
              No staff members found
            </Box>
          )}

          {filteredUsers
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((u) => {
              const initials = getInitials(u.name);

              return (
                <Paper key={u._id || u.id} sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      src={u.profilePicture || ""}
                      alt={`${u.name || "Staff"} profile`}
                      sx={{ bgcolor: getRoleColor(getUserRoles(u)[0]) }}
                    >
                      {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 600 }} noWrap>
                        {u.name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary" }}
                        noWrap
                      >
                        {getUserRoles(u).map(getRoleDisplayName).join(", ")}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                        noWrap
                      >
                        {[u.email, u.phoneE164].filter(Boolean).join(" · ") ||
                          "No contact"}
                        {renderSmsStatus(u)}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                        noWrap
                      >
                        Areas:{" "}
                        {formatStringArray(
                          u.allowedAreas,
                          getUnitAreaDisplayName,
                        )}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary" }}
                        noWrap
                      >
                        Certs:{" "}
                        {formatStringArray(
                          u.certificationTags,
                          getCertificationTagDisplayName,
                        )}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {renderActions(u)}
                    </Stack>
                  </Box>
                </Paper>
              );
            })}

          <Box display="flex" justifyContent="center">
            <TablePagination
              component="div"
              count={filteredUsers.length}
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
        <Paper sx={{ mt: 3, overflow: "hidden" }}>
          <Table size="small" data-guide-id="guide-staff-table">
            <TableHead sx={{ background: "#F8FAFC" }}>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: "0.72rem",
                  }}
                >
                  Staff Member
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: "0.72rem",
                  }}
                >
                  Role(s)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: "0.72rem",
                  }}
                >
                  Contact
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: "0.72rem",
                  }}
                >
                  Qualifications
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
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((u) => {
                  const initials = getInitials(u.name);

                  return (
                    <TableRow key={u._id || u.id} hover>
                      <TableCell sx={{ py: 1 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            src={u.profilePicture || ""}
                            alt={`${u.name || "Staff"} profile`}
                            sx={{ bgcolor: getRoleColor(getUserRoles(u)[0]) }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 15 }}>
                              {u.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 1 }}>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {getUserRoles(u).map((assignedRole) => (
                            <Box
                              key={assignedRole}
                              component="span"
                              sx={getRoleChipStyles(assignedRole)}
                            >
                              {getRoleDisplayName(assignedRole)}
                            </Box>
                          ))}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ py: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.78rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <FiMail /> {u.email || "No email"}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.78rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <FiPhone />
                          {u.phoneE164 || "No phone"}
                          {renderSmsStatus(u)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.72rem" }}
                        >
                          Areas:{" "}
                          {formatStringArray(
                            u.allowedAreas,
                            getUnitAreaDisplayName,
                          )}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.72rem" }}
                        >
                          Certs:{" "}
                          {formatStringArray(
                            u.certificationTags,
                            getCertificationTagDisplayName,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 1 }}>
                        <Box display="flex" gap={0.75} flexWrap="wrap">
                          {renderActions(u)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <Box textAlign="center" py={4} color="text.secondary">
              No staff members found
            </Box>
          )}

          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      )}

      <Dialog
        open={open}
        onClose={() => handleModalClose()}
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
          <StaffCreateAndEditForm
            staff={editingStaff}
            staffList={staff}
            onClose={() => handleModalClose()}
            onSuccess={() => handleModalClose(true)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={`Archive ${archiveTarget?.name || "staff member"}?`}
        message="They come off upcoming shifts, their link stops working, and they no longer count toward your plan. Past shifts and timesheets are kept, and you can restore them any time."
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        confirmLabel="Archive"
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete permanently?"
        message="This can't be undone. Staff with shift history can only be archived."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <BulkStaffModal
        open={bulkOpen}
        staffList={staff}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchStaff}
      />
    </Container>
  );
}
