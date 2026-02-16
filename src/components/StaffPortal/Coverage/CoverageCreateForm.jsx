import { useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Alert,
  Paper,
  Stack,
  IconButton,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider, DateCalendar } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import api from "../../../config/api";
import { toast } from "react-toastify";

const roles = ["doctor", "nurse", "receptionist", "billing", "staff", "other"];

// Convert local date "2025-12-02" and time "08:00" → UTC ISO string
function toUTC(dateStr, timeStr) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return new Date(local.toISOString()); // guaranteed UTC
}

export default function CoverageCreateForm({ tenantId, onSuccess, onClose }) {
  const [role, setRole] = useState("");
  const [selectedDates, setSelectedDates] = useState([]); // Array of dayjs objects
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [requiredCount, setRequiredCount] = useState(1);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role || selectedDates.length === 0 || !startTime || !endTime) {
      setError("Please select a role, at least one date, and times.");
      toast.error("Please select a role, at least one date, and times.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Create coverage for each selected date
      const coveragePromises = selectedDates.map((dayjsDate) => {
        const dateStr = dayjsDate.format("YYYY-MM-DD");
        const startUTC = toUTC(dateStr, startTime);
        const endUTC = toUTC(dateStr, endTime);

        return api.post("/coverage", {
          tenantId,
          role,
          date: dateStr,
          startTime: startUTC,
          endTime: endUTC,
          requiredCount,
          note,
        });
      });

      await Promise.all(coveragePromises);

      setSuccess(`Coverage added for ${selectedDates.length} date(s)!`);
      toast.success(`Coverage added for ${selectedDates.length} date(s)`);
      setRole("");
      setSelectedDates([]);
      setStartTime("08:00");
      setEndTime("17:00");
      setRequiredCount(1);
      setNote("");

      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add coverage.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) return;

    const dateStr = date.format("YYYY-MM-DD");
    const isSelected = selectedDates.some(
      (d) => d.format("YYYY-MM-DD") === dateStr,
    );

    if (isSelected) {
      // Remove date if already selected
      setSelectedDates(
        selectedDates.filter((d) => d.format("YYYY-MM-DD") !== dateStr),
      );
    } else {
      // Add date if not selected
      setSelectedDates([...selectedDates, date].sort((a, b) => a.diff(b)));
    }
  };

  const handleRemoveDate = (dateToRemove) => {
    setSelectedDates(
      selectedDates.filter((d) => d.format("YYYY-MM-DD") !== dateToRemove),
    );
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.02)",
        position: "relative",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      )}
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

        <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
          Select Coverage Dates:
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Paper
            sx={{
              p: 1,
              bgcolor: "rgba(37, 99, 235, 0.05)",
              borderRadius: 1,
              display: "flex",
              justifyContent: "center",
              overflow: "auto",
            }}
            elevation={0}
          >
            <DateCalendar
              value={null}
              onChange={handleDateChange}
              slotProps={{
                toolbar: { hidden: true },
              }}
              sx={{
                maxWidth: 320,
                "& .MuiPickersDay-root": {
                  fontSize: "0.8rem",
                  "&.Mui-selected": {
                    backgroundColor: "#2563EB",
                    color: "white",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(37, 99, 235, 0.2)",
                  },
                },
                "& .MuiPickersCalendarHeader-root": {
                  paddingY: 1,
                },
                "& .MuiPickersMonth-root": {
                  gap: "4px",
                },
              }}
            />
          </Paper>
        </LocalizationProvider>

        {selectedDates.length > 0 && (
          <Box
            sx={{ p: 2, bgcolor: "rgba(37, 99, 235, 0.1)", borderRadius: 1 }}
          >
            <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Selected Dates ({selectedDates.length}):
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {selectedDates.map((d) => (
                <Chip
                  key={d.format("YYYY-MM-DD")}
                  label={d.format("MMM DD, YYYY")}
                  onDelete={() => handleRemoveDate(d.format("YYYY-MM-DD"))}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
          </Box>
        )}

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
