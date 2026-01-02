import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Divider,
  MenuItem,
  Stack,
  Alert,
  IconButton,
} from "@mui/material";
import { FiSave, FiInfo } from "react-icons/fi";
import axios from "axios";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/v1/preferences/me",
          {
            withCredentials: true,
          }
        );
        setPrefs(res.data || {});
      } catch (err) {
        console.error(err);
        setError("Failed to load preferences");
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );

  const handleChange = (field, value) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, value) => {
    const arr = prefs[field] ? [...prefs[field]] : [];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(value);
    handleChange(field, arr);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post("http://localhost:5000/api/v1/preferences/me", prefs, {
        withCredentials: true,
      });
      setError("");
      // small confirmation
      setTimeout(() => {
        alert("Preferences saved");
      }, 50);
    } catch (err) {
      console.error(err);
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const hasPref = (arr, idx) => Array.isArray(arr) && arr.includes(idx);

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "0 auto" }}>
      <Box mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h4">My Preferences</Typography>
          <IconButton sx={{ ml: 1, bgcolor: "#EFF6FF" }} aria-label="info">
            <FiInfo style={{ color: "#0369A1" }} />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Set your availability and work style preferences
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          bgcolor: "#EFF6FF",
          border: "1px solid #BFDBFE",
        }}
      >
        <Typography variant="body2" sx={{ color: "#083344" }}>
          These preferences help administrators create schedules that work
          better for you.
        </Typography>
        <Typography variant="body2" sx={{ color: "#083344", mt: 1 }}>
          They are soft constraints and cannot guarantee specific assignments,
          but they will be considered when building schedules.
        </Typography>
      </Paper>

      <Stack spacing={3}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Preferred Days
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Select the days you prefer to work
          </Typography>
          <ToggleButtonGroup sx={{ display: "flex", gap: 1 }}>
            {DAYS.map((d, i) => {
              const isPreferred = hasPref(prefs.preferredDaysOfWeek, i);
              const isUnavailable = hasPref(prefs.unavailableDaysOfWeek, i);
              return (
                <ToggleButton
                  key={i}
                  value={d}
                  selected={isPreferred}
                  onClick={() =>
                    !isUnavailable && toggleArrayItem("preferredDaysOfWeek", i)
                  }
                  sx={{
                    flex: 1,
                    borderRadius: 1,
                    bgcolor: isPreferred ? "#ECFDF5" : undefined,
                    color: isPreferred ? "#065F46" : undefined,
                    border: isPreferred
                      ? "2px solid #10B981"
                      : isUnavailable
                      ? "1px solid #F3F4F6"
                      : undefined,
                    opacity: isUnavailable ? 0.6 : 1,
                    cursor: isUnavailable ? "not-allowed" : "pointer",
                  }}
                  disabled={isUnavailable}
                >
                  {d}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Unavailable Days
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Select days when you cannot work
          </Typography>
          <ToggleButtonGroup sx={{ display: "flex", gap: 1 }}>
            {DAYS.map((d, i) => {
              const isPreferred = hasPref(prefs.preferredDaysOfWeek, i);
              const isUnavailable = hasPref(prefs.unavailableDaysOfWeek, i);
              return (
                <ToggleButton
                  key={i}
                  value={d}
                  selected={isUnavailable}
                  onClick={() =>
                    !isPreferred && toggleArrayItem("unavailableDaysOfWeek", i)
                  }
                  sx={{
                    flex: 1,
                    borderRadius: 1,
                    bgcolor: isUnavailable ? "#FEF2F2" : undefined,
                    color: isUnavailable ? "#991B1B" : undefined,
                    border: isUnavailable
                      ? "2px solid #EF4444"
                      : isPreferred
                      ? "1px solid #F3F4F6"
                      : undefined,
                    opacity: isPreferred ? 0.6 : 1,
                    cursor: isPreferred ? "not-allowed" : "pointer",
                  }}
                  disabled={isPreferred}
                >
                  {d}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Preferred Shift Times
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Preferred Start Time"
              type="time"
              value={prefs.preferredShiftStart || "08:00"}
              onChange={(e) =>
                handleChange("preferredShiftStart", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Preferred End Time"
              type="time"
              value={prefs.preferredShiftEnd || "17:00"}
              onChange={(e) =>
                handleChange("preferredShiftEnd", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Weekly Hours
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Minimum Hours per Week"
              type="number"
              value={prefs.minHoursPerWeek || 0}
              onChange={(e) =>
                handleChange("minHoursPerWeek", parseInt(e.target.value) || 0)
              }
            />
            <TextField
              label="Maximum Hours per Week"
              type="number"
              value={prefs.maxHoursPerWeek || 0}
              onChange={(e) =>
                handleChange("maxHoursPerWeek", parseInt(e.target.value) || 0)
              }
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Work Style Preferences
          </Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={prefs.dislikesNights || false}
                  onChange={(e) =>
                    handleChange("dislikesNights", e.target.checked)
                  }
                />
              }
              label={
                <Box>
                  <Typography>Night Shift Preference</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I prefer working night shifts
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={prefs.prefersBlockScheduling || false}
                  onChange={(e) =>
                    handleChange("prefersBlockScheduling", e.target.checked)
                  }
                />
              }
              label={
                <Box>
                  <Typography>Block Scheduling</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I prefer working consecutive days in a row
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" mb={1}>
            Additional Notes
          </Typography>
          <TextField
            multiline
            minRows={5}
            value={prefs.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Add any additional scheduling preferences or constraints..."
            fullWidth
          />
        </Paper>

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<FiSave />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              background: "#2563EB",
              "&:hover": { background: "#1D4ED8" },
              display: "flex",
              alignItems: "center",
            }}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
