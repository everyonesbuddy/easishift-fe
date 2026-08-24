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
import {
  FiUserPlus,
  FiMail,
  FiPhone,
  FiSearch,
  FiUsers,
  FiEdit,
  FiDelete,
  FiPlayCircle,
  FiKey,
} from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import StaffCreateAndEditForm from "./StaffCreateAndEditForm";
import BulkStaffModal from "./BulkStaffModal";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import GuideVideoDialog from "../../Shared/GuideVideoDialog";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Stack } from "@mui/material";
import {
  getRoleDisplayName,
  getRoleColor,
  getSystemRolesFromUser,
  getUserRoles,
  getUnitAreaDisplayName,
  getCertificationTagDisplayName,
  getRoleOptionsFromFacilityPreferences,
} from "../../../constants/industryRoles";

const STAFF_MANAGEMENT_GUIDE_VIDEOS = [
  {
    id: "staff-management",
    label: "Staff management",
    title: "Staff Management Guide",
    description: "Learn how to add, edit, filter, and import staff profiles.",
    embedUrl: "https://www.youtube.com/embed/GEzs9F-LysY",
  },
];

export default function StaffList() {
  const { can, facilityPreferences } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [staff, setStaff] = useState([]);

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [resetSendingId, setResetSendingId] = useState(null);
  const [resetTargetStaff, setResetTargetStaff] = useState(null);

  // filters/search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => setPage(0), [staff, searchTerm, filterRole]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/auth/users");
      setStaff(res.data || []);
    } catch (err) {
      console.error("Failed to fetch staff", err);
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
      await api.delete(`/auth/${deleteId}`);
      await fetchStaff();
    } catch (err) {
      console.error("Failed to delete staff", err);
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleAskPasswordReset = (staffUser) => {
    const systemRoles = getSystemRolesFromUser(staffUser);
    if (
      !staffUser?.email ||
      systemRoles.includes("admin") ||
      systemRoles.includes("owner")
    ) {
      return;
    }
    setResetTargetStaff(staffUser);
  };

  const handleSendPasswordReset = async () => {
    const staffUser = resetTargetStaff;
    const userId = staffUser?._id || staffUser?.id;
    if (!userId || !staffUser?.email) return;

    try {
      setResetSendingId(userId);
      await api.post(`/auth/users/${userId}/send-password-reset`);
      toast.success(`Password reset link sent to ${staffUser.email}`, {
        position: "top-right",
        autoClose: 2500,
      });
    } catch (err) {
      console.error("Failed to send password reset link", err);
      toast.error(
        err?.response?.data?.message || "Failed to send password reset link",
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
    } finally {
      setResetSendingId(null);
      setResetTargetStaff(null);
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
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const resetTargetId = resetTargetStaff?._id || resetTargetStaff?.id;
  const canManageStaff = can("staff.manage");
  const canResetPassword = can("staff.reset_password");
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
          <Typography variant="h5">Staff Management</Typography>
          <Typography color="text.secondary">Manage your team</Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FiPlayCircle />}
            onClick={() => setVideoOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2.25,
              width: { xs: "100%", sm: "auto" },
              borderColor: "#cbd5e1",
              color: "#334155",
              bgcolor: "#f8fafc",
              fontWeight: 700,
              "&:hover": {
                borderColor: "#2563EB",
                bgcolor: "#eff6ff",
                color: "#1D4ED8",
              },
            }}
          >
            Watch guide
          </Button>

          {canManageStaff && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setBulkOpen(true)}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 3,
                  width: { xs: "100%", md: "auto" },
                }}
              >
                Bulk Add Staff
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<FiUsers />}
                onClick={() => {
                  setEditingStaff(null);
                  setOpen(true);
                }}
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
              placeholder="Search by name or email..."
              variant="outlined"
              size="small"
              fullWidth
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
                      sx={{ bgcolor: getRoleColor(u.role) }}
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
                        {u.email || "No email"}
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
                      {canResetPassword && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FiKey />}
                          disabled={
                            !u.email ||
                            getSystemRolesFromUser(u).includes("admin") ||
                            getSystemRolesFromUser(u).includes("owner") ||
                            resetSendingId === (u._id || u.id)
                          }
                          onClick={() => handleAskPasswordReset(u)}
                          sx={compactActionButtonSx}
                        >
                          {resetSendingId === (u._id || u.id)
                            ? "Sending..."
                            : "Resend reset link"}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        disabled={!canManageStaff}
                        onClick={() => handleOpenEdit(u)}
                        sx={compactActionButtonSx}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        disabled={
                          !canManageStaff ||
                          getSystemRolesFromUser(u).includes("owner")
                        }
                        onClick={() => handleAskDelete(u._id || u.id)}
                        sx={compactActionButtonSx}
                      >
                        Delete
                      </Button>
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
          <Table size="small">
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
                            sx={{ bgcolor: getRoleColor(u.role) }}
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
                          {u.userPhone !== undefined && u.userPhone !== null
                            ? `${u.userPhoneCountryCode || ""}${u.userPhone || ""}`
                            : "No phone"}
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
                          {canResetPassword && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<FiKey />}
                              disabled={
                                !u.email ||
                                getSystemRolesFromUser(u).includes("admin") ||
                                getSystemRolesFromUser(u).includes("owner") ||
                                resetSendingId === (u._id || u.id)
                              }
                              onClick={() => handleAskPasswordReset(u)}
                              sx={compactActionButtonSx}
                            >
                              {resetSendingId === (u._id || u.id)
                                ? "Sending..."
                                : "Resend password reset link"}
                            </Button>
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
                            color="error"
                            startIcon={<FiDelete />}
                            disabled={
                              !canManageStaff ||
                              getSystemRolesFromUser(u).includes("owner")
                            }
                            onClick={() => handleAskDelete(u._id || u.id)}
                            sx={compactActionButtonSx}
                          >
                            Delete
                          </Button>
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

      <GuideVideoDialog
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        title="Staff Management Guide Videos"
        videos={STAFF_MANAGEMENT_GUIDE_VIDEOS}
      />

      <Dialog
        open={Boolean(resetTargetStaff)}
        onClose={() => setResetTargetStaff(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Resend password reset link?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
            This will email a new password reset link to{" "}
            <Box component="span" sx={{ fontWeight: 800 }}>
              {resetTargetStaff?.email}
            </Box>
            . Any previous reset link for this staff account will no longer be
            usable.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetTargetStaff(null)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<FiKey />}
            disabled={resetSendingId === resetTargetId}
            onClick={handleSendPasswordReset}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {resetSendingId === resetTargetId
              ? "Sending..."
              : "Send reset link"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Staff Member?"
        message="This action cannot be undone."
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
