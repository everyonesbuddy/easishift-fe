import { useState, useRef } from "react";
import {
  Modal,
  Paper,
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";

export default function TimeOffRequestModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const handleSubmit = async () => {
    setError("");
    if (!startTime || !endTime)
      return setError("Start and end time are required");
    try {
      setSubmitting(true);
      // await axios.post(
      //   "/timeoff",
      //   { startTime, endTime, reason },
      //   { withCredentials: true },
      // );
      await api.post("/timeoff", {
        startTime: startTime,
        endTime: endTime,
        reason: reason,
      });
      setStartTime("");
      setEndTime("");
      setReason("");
      toast.success("Time off request submitted", {
        position: "top-right",
        autoClose: 2500,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to submit request";
      setError(msg);
      toast.error(msg, { position: "top-right", autoClose: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose()}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      <DialogContent dividers sx={{ position: "relative" }}>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Request Time Off
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="grid" gap={2}>
          <TextField
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="End Time"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          <Box display="flex" gap={2} justifyContent="flex-end" mt={1}>
            <Button onClick={onClose} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Request"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
