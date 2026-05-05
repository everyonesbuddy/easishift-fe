import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { FiSave, FiInfo, FiRotateCcw } from "react-icons/fi";
import api from "../../../config/api";
import { toast } from "react-toastify";

const SCHEDULING_PATTERNS = [
  { value: "4_on_4_off", label: "4 On / 4 Off" },
  { value: "2_2_3", label: "2-2-3 (Pitman)" },
  { value: "panama", label: "Panama (28-day cycle)" },
  { value: "fixed_5_2", label: "Fixed 5/2 (Mon–Fri)" },
  { value: "rotating_3", label: "Rotating 3 shifts/week" },
  { value: "custom", label: "Custom (coverage-driven)" },
];

const PREFERENCE_WEIGHTS = [
  {
    value: "strict",
    label: "Strict",
    description: "Preference mismatches are near-disqualifying",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Preferences are a meaningful but not dominant factor",
  },
  {
    value: "loose",
    label: "Loose",
    description: "Preferences are a tiebreaker only; fairness dominates",
  },
];

export default function FacilityPreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await api.get("/facility-preferences");
        setPrefs(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load facility preferences");
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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/facility-preferences", prefs);
      setPrefs(res.data);
      toast.success("Facility preferences saved", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to save facility preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError("");
    try {
      const res = await api.delete("/facility-preferences/reset");
      setPrefs(res.data);
      setResetDialogOpen(false);
      toast.info("Facility preferences reset to defaults", {
        position: "top-right",
        autoClose: 2500,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to reset facility preferences");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <Box
        mb={3.5}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: "1.35rem", md: "1.7rem" }, fontWeight: 700 }}
          >
            Facility Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure facility-level scheduling policy and rules
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<FiRotateCcw size={16} />}
          onClick={() => setResetDialogOpen(true)}
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Reset to Defaults
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info banner */}
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
          <Box sx={{ mt: 0.25, color: "info.main", display: "flex" }}>
            <FiInfo size={18} />
          </Box>
          <Typography variant="body2" sx={{ color: "info.dark" }}>
            These settings apply facility-wide and are used by the auto-generate
            engine to enforce scheduling policy. Individual staff preferences
            still apply within these constraints.
          </Typography>
        </Stack>
      </Paper>

      <Stack sx={{ gap: { xs: 2, md: 3 } }}>
        {/* ── Scheduling Pattern ── */}
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
            Scheduling Pattern
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            The rotation pattern your facility uses for shift assignments
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Pattern</InputLabel>
            <Select
              label="Pattern"
              value={prefs.schedulingPattern || "4_on_4_off"}
              onChange={(e) =>
                handleChange("schedulingPattern", e.target.value)
              }
              sx={{ borderRadius: 2 }}
            >
              {SCHEDULING_PATTERNS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* ── Workload Limits ── */}
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
            Workload Limits
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Maximum work thresholds applied during auto-generation
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Max Consecutive Work Days"
              type="number"
              value={prefs.maxConsecutiveWorkDays ?? 4}
              onChange={(e) =>
                handleChange(
                  "maxConsecutiveWorkDays",
                  parseInt(e.target.value) || 1,
                )
              }
              inputProps={{ min: 1, max: 14 }}
              helperText="1 – 14 days"
              fullWidth
            />
            <TextField
              label="Default Max Hours / Week"
              type="number"
              value={prefs.defaultMaxHoursPerWeek ?? 40}
              onChange={(e) =>
                handleChange(
                  "defaultMaxHoursPerWeek",
                  parseInt(e.target.value) || 1,
                )
              }
              inputProps={{ min: 1 }}
              helperText="Facility-level cap"
              fullWidth
            />
            <TextField
              label="Min Rest Between Shifts (hrs)"
              type="number"
              value={prefs.minRestHoursBetweenShifts ?? 8}
              onChange={(e) =>
                handleChange(
                  "minRestHoursBetweenShifts",
                  parseInt(e.target.value) || 0,
                )
              }
              inputProps={{ min: 0 }}
              helperText="Hours between shift end and next start"
              fullWidth
            />
          </Box>
        </Paper>

        {/* ── Fairness & Distribution ── */}
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
            Fairness &amp; Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Controls how auto-generate distributes high-demand shifts
          </Typography>

          <Stack spacing={2} mb={2.5}>
            {[
              {
                field: "evenWeekendDistribution",
                label: "Even Weekend Distribution",
                caption:
                  "Distribute weekend shifts evenly across eligible staff",
              },
              {
                field: "evenNightDistribution",
                label: "Even Night Distribution",
                caption: "Distribute night shifts evenly across eligible staff",
              },
            ].map(({ field, label, caption }) => (
              <Box
                key={field}
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
                      checked={prefs[field] ?? true}
                      onChange={(e) => handleChange(field, e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography>{label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {caption}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            ))}
          </Stack>

          <TextField
            label="Fairness Lookback Period (days)"
            type="number"
            value={prefs.fairnessLookbackDays ?? 28}
            onChange={(e) =>
              handleChange(
                "fairnessLookbackDays",
                parseInt(e.target.value) || 7,
              )
            }
            inputProps={{ min: 7, max: 90 }}
            helperText="7 – 90 days of history used for workload fairness scoring"
            sx={{ maxWidth: 320 }}
          />
        </Paper>

        {/* ── Staff Preference Weight ── */}
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
            Staff Preference Weight
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            How strongly individual staff preferences influence auto-generate
            assignment ranking
          </Typography>
          <Stack spacing={1.5}>
            {PREFERENCE_WEIGHTS.map((opt) => {
              const selected =
                (prefs.staffPreferenceWeight || "balanced") === opt.value;
              return (
                <Box
                  key={opt.value}
                  onClick={() =>
                    handleChange("staffPreferenceWeight", opt.value)
                  }
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: selected ? "primary.lighter" : "background.paper",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: selected ? "primary.main" : "primary.light",
                    },
                  }}
                >
                  <Typography
                    fontWeight={selected ? 700 : 500}
                    color={selected ? "primary.dark" : "text.primary"}
                  >
                    {opt.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.description}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* ── Notifications ── */}
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
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Configure facility-level notification behaviour
          </Typography>

          <Stack spacing={2} mb={2.5}>
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
                    checked={prefs.notifyStaffOnCoveragePost ?? false}
                    onChange={(e) =>
                      handleChange(
                        "notifyStaffOnCoveragePost",
                        e.target.checked,
                      )
                    }
                  />
                }
                label={
                  <Box>
                    <Typography>Notify Staff on Coverage Post</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Broadcast to staff when a new open coverage slot is posted
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Stack>

          <TextField
            label="Shift Reminder Lead Time (hours)"
            type="number"
            value={prefs.shiftReminderLeadHours ?? 24}
            onChange={(e) =>
              handleChange(
                "shiftReminderLeadHours",
                parseInt(e.target.value) || 1,
              )
            }
            inputProps={{ min: 1 }}
            helperText="How many hours before a shift staff receive a reminder"
            sx={{ maxWidth: 320 }}
          />
        </Paper>

        {/* Save button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", pb: 2 }}>
          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FiSave size={16} />
              )
            }
            onClick={handleSave}
            disabled={saving}
            sx={{ borderRadius: 2, textTransform: "none", px: 3, py: 1.25 }}
          >
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
        </Box>
      </Stack>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => !resetting && setResetDialogOpen(false)}
      >
        <DialogTitle>Reset to Defaults?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all customised facility preferences and restore
            schema defaults. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetDialogOpen(false)}
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            disabled={resetting}
            startIcon={
              resetting ? <CircularProgress size={14} color="inherit" /> : null
            }
          >
            {resetting ? "Resetting…" : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
