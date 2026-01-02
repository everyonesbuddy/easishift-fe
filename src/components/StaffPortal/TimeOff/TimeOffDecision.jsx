import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import axios from "axios";
import { FiCheck, FiX, FiCalendar, FiClock } from "react-icons/fi";

function statusColor(status) {
  switch (status) {
    case "pending":
      return { bg: "#FFFBEB", color: "#92400E" };
    case "approved":
      return { bg: "#ECFDF5", color: "#065F46" };
    case "denied":
      return { bg: "#FEF2F2", color: "#991B1B" };
    default:
      return { bg: "#F3F4F6", color: "#111827" };
  }
}

function AvatarGradient({ name, color = "#6B7280" }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "?";
  const bg = `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`;
  return (
    <Avatar
      sx={{
        width: 56,
        height: 56,
        bgcolor: "transparent",
        backgroundImage: bg,
      }}
    >
      {initials}
    </Avatar>
  );
}

export default function TimeOffDecision() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/v1/timeoff", {
        withCredentials: true,
      });
      const payload = res.data;
      // normalize common shapes: array or { data: [...] } or single object
      if (Array.isArray(payload)) setRequests(payload);
      else if (payload && Array.isArray(payload.data))
        setRequests(payload.data);
      else if (payload && Array.isArray(payload.timeOff))
        setRequests(payload.timeOff);
      else setRequests([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const list = Array.isArray(requests) ? requests : [];
  const filtered =
    filterStatus === "all"
      ? list
      : list.filter((r) => r.status === filterStatus);

  const handleOpen = (r) => {
    setSelected(r);
    setNotes(r.reviewNotes || "");
    setError("");
  };

  const handleClose = () => {
    setSelected(null);
    setNotes("");
    setError("");
  };

  const handleDecision = async (id, status) => {
    if (status === "denied" && !notes.trim()) {
      setError("Please add review notes when denying a request.");
      return;
    }
    setError("");
    try {
      setActionLoadingId(id);
      await axios.patch(
        `http://localhost:5000/api/v1/timeoff/${id}/review`,
        { status, reviewNotes: notes },
        { withCredentials: true }
      );
      await fetchRequests();
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit decision");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = list.filter((r) => r.status === "pending").length;
  const approvedCount = list.filter((r) => r.status === "approved").length;
  const deniedCount = list.filter((r) => r.status === "denied").length;

  return (
    <Container sx={{ mt: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <div>
          <Typography variant="h6">Time Off Approvals</Typography>
          <Typography color="text.secondary">
            Review and manage time off requests
          </Typography>
        </div>

        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 1 }}
            onClick={() => fetchRequests()}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4,1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="h5">{requests.length}</Typography>
          <Typography color="text.secondary">Total Requests</Typography>
        </Paper>
        <Paper sx={{ p: 2 }} elevation={1}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h5">{pendingCount}</Typography>
              <Typography color="text.secondary">Pending</Typography>
            </Box>
            {pendingCount > 0 && (
              <Chip
                label="Action needed"
                sx={{ bgcolor: "#FFFBEB", color: "#92400E" }}
              />
            )}
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="h5">{approvedCount}</Typography>
          <Typography color="text.secondary">Approved</Typography>
        </Paper>
        <Paper sx={{ p: 2 }} elevation={1}>
          <Typography variant="h5">{deniedCount}</Typography>
          <Typography color="text.secondary">Denied</Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
        <Box display="flex" gap={1} alignItems="center">
          <Typography color="text.secondary" sx={{ mr: 1 }}>
            Filter by status:
          </Typography>
          {["all", "pending", "approved", "denied"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "contained" : "outlined"}
              onClick={() => setFilterStatus(s)}
              sx={{ textTransform: "capitalize" }}
            >
              {s}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Requests List */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }} elevation={1}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: "center", p: 6, color: "text.secondary" }}>
            <FiClock style={{ fontSize: 36, opacity: 0.5 }} />
            <Typography>No time off requests found</Typography>
          </Box>
        ) : (
          <Box>
            {filtered.map((r) => (
              <Box
                key={r._id}
                sx={{
                  p: 3,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-start",
                }}
              >
                <AvatarGradient
                  name={r.staffId?.name || r.staffName}
                  color="#6366F1"
                />

                <Box sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="subtitle1">
                      {r.staffId?.name || r.staffName || "Unknown Staff"}
                    </Typography>
                    <Chip
                      label={r.status || "pending"}
                      sx={{
                        bgcolor: statusColor(r.status).bg,
                        color: statusColor(r.status).color,
                      }}
                    />
                  </Box>

                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {new Date(r.startTime).toLocaleDateString()} -{" "}
                    {new Date(r.endTime).toLocaleDateString()}
                  </Typography>

                  {r.reason && (
                    <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
                      <Typography variant="body2">{r.reason}</Typography>
                    </Paper>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {r.requestedAt
                      ? new Date(r.requestedAt).toLocaleString()
                      : ""}
                    {r.reviewedBy ? ` • Reviewed` : ""}
                  </Typography>
                </Box>

                {r.status === "pending" ? (
                  <Stack direction="column" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<FiCheck />}
                      onClick={() => handleOpen(r)}
                    >
                      Review
                    </Button>
                  </Stack>
                ) : (
                  <Typography
                    color="text.secondary"
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {r.status}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Review Dialog */}
      <Dialog open={!!selected} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Review Time Off Request</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Box display="flex" gap={2} alignItems="center">
                <AvatarGradient
                  name={selected.staffId?.name || selected.staffName}
                  color="#6366F1"
                />
                <Box>
                  <Typography>
                    {selected.staffId?.name || selected.staffName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(selected.startTime).toLocaleString()} —{" "}
                    {new Date(selected.endTime).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Reason</Typography>
                <Typography>{selected.reason || "—"}</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Review Notes</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            color="error"
            variant="outlined"
            onClick={() => handleDecision(selected._id, "denied")}
            disabled={actionLoadingId === selected?._id}
          >
            Deny
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={() => handleDecision(selected._id, "approved")}
            disabled={actionLoadingId === selected?._id}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
