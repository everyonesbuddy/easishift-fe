import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import TimeOffRequestModal from "./TimeOffRequestModal";
import {
  FiCheck,
  FiX,
  FiPlus,
  FiCalendar,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";

const STATUS_COLORS = {
  pending: "default",
  approved: "success",
  denied: "error",
};

export default function TimeOffRequestList() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/v1/timeoff", {
        withCredentials: true,
      });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const isAdmin = useMemo(
    () => role === "admin" || role === "superadmin",
    [role]
  );

  const handleReview = async (id, newStatus) => {
    try {
      setActionLoadingId(id);
      await axios.patch(
        `http://localhost:5000/api/v1/timeoff/${id}/review`,
        { status: newStatus },
        { withCredentials: true }
      );
      await fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getId = (p) => {
    if (!p) return null;
    if (typeof p === "string") return p;
    return p._id || p.id || null;
  };

  const userId = getId(user) || (user && (user._id || user.id));

  const myRequests = requests.filter((r) => {
    const reqUser = getId(r.staffId) || r.staffId;
    return !userId ? true : String(reqUser) === String(userId);
  });

  const pendingRequests = myRequests.filter((r) => r.status === "pending");
  const approvedRequests = myRequests.filter((r) => r.status === "approved");
  const deniedRequests = myRequests.filter((r) => r.status === "denied");

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const calculateDays = (start, end) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      // inclusive days
      const diff =
        Math.round(
          (e.setHours(0, 0, 0, 0) - s.setHours(0, 0, 0, 0)) / MS_PER_DAY
        ) + 1;
      return diff > 0 ? diff : 1;
    } catch (err) {
      return 1;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Container sx={{ mt: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Time Off Requests</Typography>
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 1 }}
            onClick={() => fetchRequests()}
          >
            Refresh
          </Button>
          <Button variant="contained" onClick={() => setOpenModal(true)}>
            Request Time Off
          </Button>
        </Box>
      </Box>

      <Box>
        {loading ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Paper>
        ) : (
          <>
            {/* Stats */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 2,
                mb: 2,
              }}
            >
              <Paper sx={{ p: 2 }}>
                <Typography variant="h5">{myRequests.length}</Typography>
                <Typography color="text.secondary">Total Requests</Typography>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <div>
                    <Typography variant="h5">
                      {pendingRequests.length}
                    </Typography>
                    <Typography color="text.secondary">
                      Awaiting Review
                    </Typography>
                  </div>
                  {pendingRequests.length > 0 && (
                    <Chip label="Pending" color="warning" />
                  )}
                </Box>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="h5">{approvedRequests.length}</Typography>
                <Typography color="text.secondary">Approved</Typography>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="h5">{deniedRequests.length}</Typography>
                <Typography color="text.secondary">Denied</Typography>
              </Paper>
            </Box>

            {/* Cards list */}
            <Box display="flex" flexDirection="column" gap={2}>
              {myRequests.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: "center" }}>
                  <Box mb={1}>
                    <FiCalendar size={36} style={{ opacity: 0.6 }} />
                  </Box>
                  <Typography color="text.secondary">
                    No time off requests
                  </Typography>
                  <Button sx={{ mt: 2 }} onClick={() => setOpenModal(true)}>
                    Submit your first request
                  </Button>
                </Paper>
              ) : (
                myRequests.map((r) => {
                  const days = calculateDays(
                    r.startTime || r.startDate || r.start,
                    r.endTime || r.endDate || r.end
                  );
                  const isPast =
                    new Date(r.endTime || r.endDate || r.end) < today;

                  const statusIcon =
                    r.status === "approved" ? (
                      <FiCheck color="#16a34a" />
                    ) : r.status === "denied" ? (
                      <FiX color="#dc2626" />
                    ) : (
                      <FiAlertCircle color="#d97706" />
                    );

                  return (
                    <Paper
                      key={r._id}
                      sx={{
                        p: 3,
                        display: "flex",
                        gap: 2,
                        alignItems: "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1,
                          backgroundColor: "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {statusIcon}
                      </Box>

                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Typography variant="subtitle1">
                            {new Date(
                              r.startTime || r.startDate || r.start
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              r.endTime || r.endDate || r.end
                            ).toLocaleDateString()}
                          </Typography>
                          <Chip label={r.status || "pending"} />
                          {isPast && <Chip label="Past" variant="outlined" />}
                        </Box>

                        <Box
                          display="flex"
                          gap={3}
                          color="text.secondary"
                          mb={1}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <FiClock />{" "}
                            <Typography variant="body2">
                              {days} day{days !== 1 ? "s" : ""}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <FiCalendar />{" "}
                            <Typography variant="body2">
                              {new Date(
                                r.startTime || r.startDate || r.start
                              ).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>

                        {r.reason && (
                          <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
                            <Typography variant="body2">{r.reason}</Typography>
                          </Paper>
                        )}

                        {r.reviewNotes && (
                          <Paper
                            sx={{
                              p: 1,
                              mb: 1,
                              backgroundColor:
                                r.status === "approved" ? "#ecfdf5" : "#fff1f2",
                            }}
                          >
                            <Typography variant="body2">
                              Admin response: {r.reviewNotes}
                            </Typography>
                          </Paper>
                        )}

                        <Typography variant="caption" color="text.secondary">
                          Submitted{" "}
                          {new Date(
                            r.requestedAt || r.createdAt || r.created
                          ).toLocaleString()}
                          {r.reviewedAt
                            ? ` • Reviewed ${new Date(
                                r.reviewedAt
                              ).toLocaleString()}`
                            : ""}
                        </Typography>
                      </Box>

                      <Box>
                        {isAdmin && r.status === "pending" && (
                          <Box display="flex" flexDirection="column" gap={1}>
                            <Tooltip title="Approve">
                              <span>
                                <IconButton
                                  color="success"
                                  disabled={actionLoadingId === r._id}
                                  onClick={() =>
                                    handleReview(r._id, "approved")
                                  }
                                >
                                  <FiCheck />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <span>
                                <IconButton
                                  color="error"
                                  disabled={actionLoadingId === r._id}
                                  onClick={() => handleReview(r._id, "denied")}
                                >
                                  <FiX />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  );
                })
              )}
            </Box>
          </>
        )}
      </Box>

      <TimeOffRequestModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={() => fetchRequests()}
      />
    </Container>
  );
}
