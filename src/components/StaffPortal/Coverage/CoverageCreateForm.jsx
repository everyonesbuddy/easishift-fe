import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Alert,
  Paper,
  Stack,
} from "@mui/material";
import axios from "axios";

const roles = ["doctor", "nurse", "receptionist", "billing", "staff", "other"];

// Convert local date "2025-12-02" and time "08:00" → UTC ISO string
function toUTC(dateStr, timeStr) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return new Date(local.toISOString()); // guaranteed UTC
}

export default function CoverageCreateForm({ tenantId, onSuccess }) {
  const [role, setRole] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [requiredCount, setRequiredCount] = useState(1);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role || !date || !startTime || !endTime) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Convert local times → UTC ISO strings
      const startUTC = toUTC(date, startTime);
      const endUTC = toUTC(date, endTime);

      await axios.post(
        "http://localhost:5000/api/v1/coverage",
        {
          tenantId,
          role,
          date, // raw, backend normalizes
          startTime: startUTC,
          endTime: endUTC,
          requiredCount,
          note,
        },
        { withCredentials: true }
      );

      setSuccess("Coverage added successfully!");
      setRole("");
      setDate("");
      setStartTime("08:00");
      setEndTime("17:00");
      setRequiredCount(1);
      setNote("");

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add coverage.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.02)" }}
      elevation={0}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Add Coverage
      </Typography>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <TextField
          select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          {roles.map((r) => (
            <MenuItem key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label="Required Count"
          type="number"
          value={requiredCount}
          onChange={(e) => setRequiredCount(Number(e.target.value))}
          inputProps={{ min: 0 }}
          required
        />

        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          rows={3}
        />

        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? "Adding..." : "Add Coverage"}
        </Button>
      </Stack>
    </Paper>
  );
}
