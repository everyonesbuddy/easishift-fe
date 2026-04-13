import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { FiCheck, FiRefreshCw, FiSend, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import ShiftSwapRequestModal from "./ShiftSwapRequestModal";

const STATUS_COLOR = {
  pending: "warning",
  accepted: "success",
  denied: "error",
  cancelled: "default",
  expired: "default",
};

const formatWindow = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
};

export default function ShiftSwapRequestsPage() {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("inbox");
  const [loading, setLoading] = useState(false);
  const [inboxRequests, setInboxRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("accept");
  const [responseNote, setResponseNote] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const loadStaff = async () => {
    try {
      const res = await api.get("/auth/users");
      setStaffList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch staff list", err);
    }
  };

  const loadSwapRequests = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        const res = await api.get("/schedules/swap-requests");
        setInboxRequests(res.data || []);
        setSentRequests([]);
      } else {
        const [inboxRes, outboxRes] = await Promise.all([
          api.get("/schedules/swap-requests?view=inbox"),
          api.get("/schedules/swap-requests?view=outbox"),
        ]);
        setInboxRequests(inboxRes.data || []);
        setSentRequests(outboxRes.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch swap requests", err);
      toast.error("Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSwapRequests();
    loadStaff();
  }, []);

  const openRespondDialog = (swapRequest, nextDecision) => {
    setSelectedRequest(swapRequest);
    setDecision(nextDecision);
    setResponseNote("");
    setRespondDialogOpen(true);
  };

  const closeRespondDialog = () => {
    setRespondDialogOpen(false);
    setSelectedRequest(null);
    setResponseNote("");
  };

  const submitDecision = async () => {
    if (!selectedRequest?._id) return;

    try {
      setSubmittingResponse(true);
      await api.post(
        `/schedules/swap-requests/${selectedRequest._id}/respond`,
        {
          decision,
          responseNote,
        },
      );
      toast.success(
        `Swap request ${decision === "accept" ? "accepted" : "denied"}`,
      );
      closeRespondDialog();
      loadSwapRequests();
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        "Failed to submit response. Please try again.";
      toast.error(message);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const activeRequests = useMemo(() => {
    return activeTab === "inbox" ? inboxRequests : sentRequests;
  }, [activeTab, inboxRequests, sentRequests]);

  const isPendingForReceiver = (requestItem) => {
    if (requestItem.status !== "pending") return false;
    if (isAdmin) return true;
    return String(requestItem.receiverStaffId?._id) === String(user?._id);
  };

  return (
    <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontSize: { xs: "1.1rem", md: "1.4rem" } }}
          >
            Shift Swap Requests
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: { xs: "0.78rem", md: "0.875rem" } }}
          >
            Manage incoming requests and track requests you sent.
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", gap: 1, width: { xs: "100%", md: "auto" } }}
        >
          <Button
            variant="outlined"
            startIcon={<FiRefreshCw />}
            onClick={loadSwapRequests}
            sx={{ textTransform: "none", width: { xs: "50%", md: "auto" } }}
          >
            Refresh
          </Button>
          {!isAdmin && (
            <Button
              variant="contained"
              startIcon={<FiSend />}
              onClick={() => setRequestModalOpen(true)}
              sx={{
                textTransform: "none",
                width: { xs: "50%", md: "auto" },
                bgcolor: "#111827",
                "&:hover": { bgcolor: "#0f172a" },
              }}
            >
              New Swap Request
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, next) => setActiveTab(next)}
          variant="fullWidth"
        >
          <Tab label={`Inbox (${inboxRequests.length})`} value="inbox" />
          {!isAdmin && (
            <Tab label={`Sent (${sentRequests.length})`} value="sent" />
          )}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
        {loading ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <CircularProgress />
          </Paper>
        ) : activeRequests.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <Typography color="text.secondary">
              No swap requests found.
            </Typography>
          </Paper>
        ) : (
          activeRequests.map((requestItem) => {
            const requester = requestItem.requesterStaffId;
            const receiver = requestItem.receiverStaffId;
            const status = requestItem.status || "pending";

            return (
              <Paper key={requestItem._id} sx={{ p: 2.25 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  sx={{ flexDirection: { xs: "column", md: "row" }, gap: 1.25 }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {requestItem.role} |{" "}
                      {formatWindow(
                        requestItem.shiftStartTime,
                        requestItem.shiftEndTime,
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Requester: {requester?.name || "Unknown"} | Receiver:{" "}
                      {receiver?.name || "Unknown"}
                    </Typography>
                    {!!requestItem.requestNote && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Request note: {requestItem.requestNote}
                      </Typography>
                    )}
                    {!!requestItem.responseNote && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Response note: {requestItem.responseNote}
                      </Typography>
                    )}
                  </Box>

                  <Chip
                    label={status.toUpperCase()}
                    color={STATUS_COLOR[status] || "default"}
                    variant={status === "pending" ? "filled" : "outlined"}
                  />
                </Box>

                {isPendingForReceiver(requestItem) && (
                  <Box
                    sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<FiCheck />}
                      onClick={() => openRespondDialog(requestItem, "accept")}
                      sx={{
                        textTransform: "none",
                        bgcolor: "#15803d",
                        "&:hover": { bgcolor: "#166534" },
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<FiX />}
                      onClick={() => openRespondDialog(requestItem, "deny")}
                      sx={{ textTransform: "none" }}
                      color="error"
                    >
                      Deny
                    </Button>
                  </Box>
                )}
              </Paper>
            );
          })
        )}
      </Box>

      <ShiftSwapRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={loadSwapRequests}
        enableSchedulePicker
        staffList={staffList}
      />

      <Dialog
        open={respondDialogOpen}
        onClose={submittingResponse ? undefined : closeRespondDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {decision === "accept" ? "Accept Swap Request" : "Deny Swap Request"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Response note (optional)"
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRespondDialog} disabled={submittingResponse}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitDecision}
            disabled={submittingResponse}
            color={decision === "accept" ? "success" : "error"}
          >
            {decision === "accept" ? "Accept" : "Deny"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
