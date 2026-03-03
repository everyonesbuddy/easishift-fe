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
  Stack,
  Alert,
} from "@mui/material";
import { FiSave, FiInfo } from "react-icons/fi";
import api from "../../../config/api";
import { toast } from "react-toastify";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await api.get("/preferences/me");
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
      await api.post("/preferences/me", prefs);
      setError("");
      // small confirmation
      toast.success("Preferences saved", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const hasPref = (arr, idx) => Array.isArray(arr) && arr.includes(idx);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, margin: "0 auto" }}>
      <Box mb={3.5}>
        <Typography
          variant="h4"
          sx={{ fontSize: { xs: "1.35rem", md: "1.7rem" }, fontWeight: 700 }}
        >
          My Preferences
        </Typography>
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
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          mb: 3,
          bgcolor: "info.lighter",
          border: "1px solid",
          borderColor: "info.light",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              mt: 0.25,
              color: "info.main",
              display: "flex",
              alignItems: "center",
            }}
          >
            <FiInfo size={18} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "info.dark" }}>
              These preferences help administrators and AI systems create
              schedules that work better for you.
            </Typography>
            <Typography variant="body2" sx={{ color: "info.dark", mt: 0.75 }}>
              They are soft constraints and cannot guarantee specific
              assignments, but they will be considered when building schedules.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack sx={{ gap: { xs: 2, md: 3 } }}>
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={0.5} sx={{ fontWeight: 700 }}>
            Preferred Days
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Select the days you prefer to work
          </Typography>
          <ToggleButtonGroup
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
              gap: 1,
            }}
          >
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
                    borderRadius: 2,
                    minHeight: 44,
                    fontWeight: 600,
                    bgcolor: isPreferred
                      ? "success.lighter"
                      : "background.paper",
                    color: isPreferred ? "success.dark" : "text.primary",
                    border: isPreferred
                      ? "2px solid"
                      : isUnavailable
                        ? "1px solid"
                        : "1px solid",
                    borderColor: isPreferred
                      ? "success.main"
                      : isUnavailable
                        ? "grey.200"
                        : "divider",
                    opacity: isUnavailable ? 0.6 : 1,
                    cursor: isUnavailable ? "not-allowed" : "pointer",
                    "&:hover": {
                      borderColor: isUnavailable ? "grey.200" : "success.light",
                    },
                  }}
                  disabled={isUnavailable}
                >
                  {d}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={0.5} sx={{ fontWeight: 700 }}>
            Unavailable Days
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Select days when you cannot work
          </Typography>
          <ToggleButtonGroup
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
              gap: 1,
            }}
          >
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
                    borderRadius: 2,
                    minHeight: 44,
                    fontWeight: 600,
                    bgcolor: isUnavailable
                      ? "error.lighter"
                      : "background.paper",
                    color: isUnavailable ? "error.dark" : "text.primary",
                    border: isUnavailable
                      ? "2px solid"
                      : isPreferred
                        ? "1px solid"
                        : "1px solid",
                    borderColor: isUnavailable
                      ? "error.main"
                      : isPreferred
                        ? "grey.200"
                        : "divider",
                    opacity: isPreferred ? 0.6 : 1,
                    cursor: isPreferred ? "not-allowed" : "pointer",
                    "&:hover": {
                      borderColor: isPreferred ? "grey.200" : "error.light",
                    },
                  }}
                  disabled={isPreferred}
                >
                  {d}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={1.75} sx={{ fontWeight: 700 }}>
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
              fullWidth
            />
            <TextField
              label="Preferred End Time"
              type="time"
              value={prefs.preferredShiftEnd || "17:00"}
              onChange={(e) =>
                handleChange("preferredShiftEnd", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={1.75} sx={{ fontWeight: 700 }}>
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
              fullWidth
            />
            <TextField
              label="Maximum Hours per Week"
              type="number"
              value={prefs.maxHoursPerWeek || 0}
              onChange={(e) =>
                handleChange("maxHoursPerWeek", parseInt(e.target.value) || 0)
              }
              fullWidth
            />
          </Box>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={1.75} sx={{ fontWeight: 700 }}>
            Work Style Preferences
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%" }}
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
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%" }}
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
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" mb={1.5} sx={{ fontWeight: 700 }}>
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
              textTransform: "none",
              borderRadius: 2.5,
              px: 4,
              py: 1.1,
              fontWeight: 600,
              width: { xs: "100%", md: "auto" },
            }}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
