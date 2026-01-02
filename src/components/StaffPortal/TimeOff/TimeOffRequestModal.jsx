import { useState } from "react";
import {
  Modal,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

export default function TimeOffRequestModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!startTime || !endTime)
      return setError("Start and end time are required");
    try {
      setSubmitting(true);
      await axios.post(
        "http://localhost:5000/api/v1/timeoff",
        { startTime, endTime, reason },
        { withCredentials: true }
      );
      setStartTime("");
      setEndTime("");
      setReason("");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520,
          p: 4,
          borderRadius: 2,
        }}
      >
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
      </Paper>
    </Modal>
  );
}
