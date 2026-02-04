import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Modal,
  Dialog,
  DialogContent,
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
import {
  FiUserPlus,
  FiMail,
  FiPhone,
  FiSearch,
  FiUsers,
  FiEdit,
  FiDelete,
} from "react-icons/fi";
import { AiOutlineCalendar } from "react-icons/ai";
import { useAuth } from "../../../context/AuthContext";
import StaffCreateAndEditForm from "./StaffCreateAndEditForm";
import ConfirmDialog from "../../Shared/ConfirmDialog";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { IconButton, Stack } from "@mui/material";

// small role color helper — matches the mock idea; tweak as needed
const ROLE_COLORS = {
  admin: "#7c3aed",
  doctor: "#0ea5a4",
  nurse: "#f97316",
  receptionist: "#2563eb",
  billing: "#f59e0b",
  general: "#6b7280",
};

export default function StaffList() {
  const { role } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));

  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [open, setOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  const handleModalClose = (refresh = false) => {
    setOpen(false);
    setEditingStaff(null);
    if (refresh) fetchStaff();
  };

  // filters
  const roles = [
    "all",
    "admin",
    "doctor",
    "nurse",
    "receptionist",
    "billing",
    "general",
  ];

  const filteredUsers = useMemo(() => {
    return staff.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = filterRole === "all" || u.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [staff, searchTerm, filterRole]);

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Staff Management</Typography>
          <Typography color="text.secondary">
            Manage your healthcare team
          </Typography>
        </Box>

        {role === "admin" && (
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
        )}
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
                    {r === "all"
                      ? "All Roles"
                      : r.charAt(0).toUpperCase() + r.slice(1)}
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
              const initials = (u.name || "")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Paper key={u._id || u.id} sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: ROLE_COLORS[u.role] || "#6b7280" }}>
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
                        {u.role}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                        noWrap
                      >
                        {u.email || "No email"}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        onClick={() => handleOpenEdit(u)}
                        sx={{
                          mr: 1,
                          borderRadius: 2,
                          textTransform: "none",
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        disabled={u.role === "admin"}
                        onClick={() => handleAskDelete(u._id || u.id)}
                        sx={{
                          mr: 1,
                          borderRadius: 2,
                          textTransform: "none",
                        }}
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
          <Table>
            <TableHead sx={{ background: "#f3f4f6" }}>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((u) => {
                  const initials = (u.name || "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <TableRow key={u._1d || u.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            sx={{ bgcolor: ROLE_COLORS[u.role] || "#6b7280" }}
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

                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: ROLE_COLORS[u.role] || "#6b7280",
                            }}
                          />
                          <Typography>{u.role}</Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        {u.email ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <FiMail />
                            <Typography variant="body2">{u.email}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No email
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<FiEdit />}
                            onClick={() => handleOpenEdit(u)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<FiDelete />}
                            disabled={u.role === "admin"}
                            onClick={() => handleAskDelete(u._id || u.id)}
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
        maxWidth="sm"
        scroll="paper"
      >
        <DialogContent dividers>
          <StaffCreateAndEditForm
            staff={editingStaff}
            onSuccess={() => handleModalClose(true)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Staff Member?"
        message="This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}
