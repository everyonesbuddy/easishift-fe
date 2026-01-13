import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Stack,
} from "@mui/material";
import api from "../../../config/api";

// Convert UTC → local string for <input type="datetime-local">
function toLocalInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().slice(0, 16);
}

// Convert local datetime-local → UTC
function toUTC(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toISOString();
}

// Format shift label using local time (FIXES date issue)
function formatShiftLabel(coverage) {
  const start = new Date(coverage.startTime);
  const end = new Date(coverage.endTime);

  const dateLabel = start.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const startLabel = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const endLabel = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} — ${startLabel} - ${endLabel}`;
}

export default function ScheduleForm({
  onSuccess,
  schedule,
  staffList,
  initialStaffId = "",
  disableStaffSelect = false,
}) {
  const isEditing = Boolean(schedule);

  const [formData, setFormData] = useState({
    staffId: "",
    coverageId: "",
    role: "",
    startTime: "",
    endTime: "",
    notes: "",
    status: "scheduled",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [coverageOptions, setCoverageOptions] = useState([]);
  const [message, setMessage] = useState("");

  // Load existing schedule when editing
  useEffect(() => {
    if (schedule) {
      setFormData({
        staffId: schedule.staffId?._id || "",
        coverageId: "",
        role: schedule.role || "",
        startTime: toLocalInputValue(schedule.startTime),
        endTime: toLocalInputValue(schedule.endTime),
        notes: schedule.notes || "",
        status: schedule.status || "scheduled",
        timezone:
          schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [schedule]);

  // If an initialStaffId is provided (e.g., non-admin scheduling themselves), prefill it
  useEffect(() => {
    if (!schedule && initialStaffId) {
      const selected = staffList.find((s) => s._id === initialStaffId);
      setFormData((f) => ({
        ...f,
        staffId: initialStaffId,
        role: selected?.role || f.role,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStaffId, schedule]);

  // Load available coverage when staff changes
  useEffect(() => {
    async function loadCoverage() {
      if (!formData.staffId || isEditing) return;

      const selectedStaff = staffList.find((s) => s._id === formData.staffId);
      if (!selectedStaff) return;

      try {
        const res = await api.get(
          `/coverage/unfilled?role=${selectedStaff.role}`
        );

        // Filter out past shifts (based on startTime)
        const now = new Date();
        const validShifts = res.data.filter((c) => new Date(c.startTime) > now);

        setCoverageOptions(validShifts);
      } catch (err) {
        console.error(err);
      }
    }

    loadCoverage();
  }, [formData.staffId, isEditing, staffList]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    const payload = {
      staffId: formData.staffId,
      role: formData.role,
      startTime: toUTC(formData.startTime),
      endTime: toUTC(formData.endTime),
      notes: formData.notes,
      status: formData.status,
      timezone: formData.timezone,
    };

    try {
      if (isEditing) {
        await api.put(`/schedules/${schedule._id}`, payload);
        setMessage("✅ Schedule updated!");
      } else {
        await api.post("/schedules", payload);
        setMessage("✅ Schedule created!");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setMessage("❌ Error saving schedule");
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={submit}
      sx={{ p: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.02)" }}
      elevation={0}
    >
      <Stack spacing={2}>
        <Typography variant="h6">
          {isEditing ? "Edit Schedule" : "Create New Schedule"}
        </Typography>

        {message && (
          <Alert severity={message.includes("❌") ? "error" : "success"}>
            {message}
          </Alert>
        )}

        <FormControl
          fullWidth
          required
          disabled={isEditing || disableStaffSelect}
        >
          <InputLabel>Staff</InputLabel>
          <Select
            name="staffId"
            value={formData.staffId}
            onChange={(e) =>
              setFormData({
                ...formData,
                staffId: e.target.value,
                coverageId: "",
                startTime: "",
                endTime: "",
                role: "",
              })
            }
          >
            {staffList.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name} ({s.role})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Coverage selection (create only) */}
        {!isEditing && (
          <FormControl fullWidth>
            <InputLabel>Select Shift</InputLabel>
            <Select
              name="coverageId"
              value={formData.coverageId}
              onChange={(e) => {
                const cov = coverageOptions.find(
                  (c) => c._id === e.target.value
                );
                if (!cov) return;

                setFormData({
                  ...formData,
                  coverageId: cov._id,
                  role: cov.role,
                  startTime: toLocalInputValue(cov.startTime),
                  endTime: toLocalInputValue(cov.endTime),
                });
              }}
            >
              {coverageOptions.length === 0 ? (
                <MenuItem disabled>No shifts available</MenuItem>
              ) : (
                coverageOptions.map((c) => (
                  <MenuItem
                    key={c._id}
                    value={c._id}
                    disabled={c.remaining === 0}
                  >
                    {formatShiftLabel(c)}
                    {"  "}({c.remaining} spots left
                    {c.remaining === 0 ? " • Full" : ""})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        )}

        {/* Start / End Times */}
        <TextField
          type="datetime-local"
          name="startTime"
          value={formData.startTime}
          required
          disabled
        />

        <TextField
          type="datetime-local"
          name="endTime"
          value={formData.endTime}
          required
          disabled
        />

        <TextField
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          multiline
          rows={3}
        />

        {isEditing && (
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button variant="contained" type="submit">
          {isEditing ? "Update Schedule" : "Create Schedule"}
        </Button>
      </Stack>
    </Paper>
  );
}
