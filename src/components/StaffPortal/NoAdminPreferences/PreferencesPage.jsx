import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { FiSave, FiInfo, FiChevronDown } from "react-icons/fi";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { useGuideTour } from "../../../context/GuideTourContext";
import GuideHelpButton from "../../Shared/GuideHelpButton";
import { Navigate, useNavigate } from "react-router-dom";
import { getFacilityRolesFromUser } from "../../../constants/industryRoles";

const PREFERENCES_TOUR_STEPS = [
  {
    target: "guide-preferences-days",
    title: "Preferred work days",
    body: "Select the days you'd prefer to be scheduled. Auto-generate takes this into account when assigning shifts.",
  },
  {
    target: "guide-preferences-save-btn",
    title: "Save your preferences",
    body: "Changes here only apply once you save.",
  },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_SHIFT_TYPES = ["day", "evening", "night"];

const toDisplayLabel = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const ACCORDION_BASE_SX = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: 1,
  overflow: "hidden",
  "&:before": { display: "none" },
  "&.Mui-expanded": {
    margin: 0,
  },
};

const ACCORDION_SUMMARY_SX = {
  px: { xs: 2, md: 3 },
  py: 0.75,
  minHeight: 72,
  bgcolor: "grey.50",
  transition: "background-color 120ms ease",
  "&:hover": {
    bgcolor: "grey.100",
  },
  "&.Mui-focusVisible": {
    bgcolor: "grey.50",
    outline: "none",
  },
  "&:focus, &:focus-visible, &:active": {
    outline: "none",
    boxShadow: "none",
  },
  "&.Mui-expanded": {
    minHeight: 72,
  },
  "& .MuiAccordionSummary-content": {
    my: 1,
  },
  "& .MuiAccordionSummary-content.Mui-expanded": {
    my: 1,
  },
};

const ACCORDION_DETAILS_SX = {
  pt: 2,
  px: { xs: 2, md: 3 },
  pb: { xs: 2, md: 3 },
  bgcolor: "background.paper",
};

export default function PreferencesPage() {
  const { user, logout, facilityPreferences } = useAuth();
  const navigate = useNavigate();
  const hasSchedulableRole =
    getFacilityRolesFromUser(user, facilityPreferences).length > 0;
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { startTourIfUnseen } = useGuideTour();
  const shiftTypeOptions = useMemo(() => {
    const configured = Array.from(
      new Set((facilityPreferences?.shiftTypes || []).filter(Boolean)),
    );
    return configured.length ? configured : DEFAULT_SHIFT_TYPES;
  }, [facilityPreferences?.shiftTypes]);

  useEffect(() => {
    if (loading) return;
    startTourIfUnseen("preferences", PREFERENCES_TOUR_STEPS);
    // Only ever auto-launched once per user via localStorage — intentionally minimal deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!hasSchedulableRole) {
      setLoading(false);
      return;
    }

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
  }, [hasSchedulableRole]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (!hasSchedulableRole) {
    return <Navigate to="/dashboard" replace />;
  }

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
      const payload = {
        preferredDaysOfWeek: Array.isArray(prefs.preferredDaysOfWeek)
          ? prefs.preferredDaysOfWeek
          : [],
        avoidDaysOfWeek: Array.isArray(prefs.avoidDaysOfWeek)
          ? prefs.avoidDaysOfWeek
          : [],
        preferredShiftTypes: Array.isArray(prefs.preferredShiftTypes)
          ? prefs.preferredShiftTypes
          : [],
        targetHoursPerWeek:
          prefs.targetHoursPerWeek === "" || prefs.targetHoursPerWeek == null
            ? null
            : Number(prefs.targetHoursPerWeek),
        maxShiftsPerWeek:
          prefs.maxShiftsPerWeek === "" || prefs.maxShiftsPerWeek == null
            ? null
            : Number(prefs.maxShiftsPerWeek),
        maxConsecutiveDays:
          prefs.maxConsecutiveDays === "" || prefs.maxConsecutiveDays == null
            ? null
            : Number(prefs.maxConsecutiveDays),
        wantsOvertime: !!prefs.wantsOvertime,
        rotationCadence: prefs.rotationCadence || "none",
        rotationScope: prefs.rotationScope || "all_days",
        rotationAnchorDate:
          prefs.rotationCadence === "biweekly" && prefs.rotationAnchorDate
            ? prefs.rotationAnchorDate
            : null,
        emailNotificationsEnabled: prefs.emailNotificationsEnabled ?? true,
        smsNotificationsEnabled: prefs.smsNotificationsEnabled ?? true,
      };

      await api.post("/preferences/me", payload);
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

  const handleDeleteAccount = async () => {
    const userId = user?._id || user?.id;

    if (!userId) {
      setError("Unable to determine which account to delete");
      setDeleteDialogOpen(false);
      return;
    }

    setDeletingAccount(true);
    setError("");

    try {
      const res = await api.delete(`/auth/${userId}`);

      toast.success(res.data?.message || "Your account has been deleted", {
        position: "top-right",
        autoClose: 2500,
      });

      logout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  const hasPref = (arr, idx) => Array.isArray(arr) && arr.includes(idx);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, margin: "0 auto" }}>
      <Box mb={3.5}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: "1.35rem", md: "1.7rem" },
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          My Preferences
          <GuideHelpButton
            tourId="preferences"
            tourSteps={PREFERENCES_TOUR_STEPS}
          />
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
              These settings control notifications and preferred work days.
            </Typography>
            <Typography variant="body2" sx={{ color: "info.dark", mt: 0.75 }}>
              Facility rules are configured by admins in Facility Preferences.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack sx={{ gap: { xs: 2, md: 3 } }}>
        <Accordion
          disableGutters
          sx={ACCORDION_BASE_SX}
          data-guide-id="guide-preferences-days"
        >
          <AccordionSummary
            expandIcon={<FiChevronDown size={18} />}
            sx={ACCORDION_SUMMARY_SX}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Preferred Days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select the days you prefer to work
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={ACCORDION_DETAILS_SX}>
            <ToggleButtonGroup
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
                gap: 1,
              }}
            >
              {DAYS.map((d, i) => {
                const isPreferred = hasPref(prefs.preferredDaysOfWeek, i);
                return (
                  <ToggleButton
                    key={i}
                    value={d}
                    selected={isPreferred}
                    onClick={() => toggleArrayItem("preferredDaysOfWeek", i)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 44,
                      fontWeight: 600,
                      bgcolor: isPreferred
                        ? "success.lighter"
                        : "background.paper",
                      color: isPreferred ? "success.dark" : "text.primary",
                      border: isPreferred ? "2px solid" : "1px solid",
                      borderColor: isPreferred ? "success.main" : "divider",
                      "&:hover": {
                        borderColor: "success.light",
                      },
                    }}
                  >
                    {d}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters sx={ACCORDION_BASE_SX}>
          <AccordionSummary
            expandIcon={<FiChevronDown size={18} />}
            sx={ACCORDION_SUMMARY_SX}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Scheduling Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                These are soft preferences — auto-generate weighs them but they
                never block an assignment.
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={ACCORDION_DETAILS_SX}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Days to Avoid
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  Days you'd rather not work, if it can be avoided
                </Typography>
                <ToggleButtonGroup
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
                    gap: 1,
                  }}
                >
                  {DAYS.map((d, i) => {
                    const isAvoided = hasPref(prefs.avoidDaysOfWeek, i);
                    return (
                      <ToggleButton
                        key={i}
                        value={d}
                        selected={isAvoided}
                        onClick={() => toggleArrayItem("avoidDaysOfWeek", i)}
                        sx={{
                          borderRadius: 2,
                          minHeight: 44,
                          fontWeight: 600,
                          bgcolor: isAvoided
                            ? "error.lighter"
                            : "background.paper",
                          color: isAvoided ? "error.dark" : "text.primary",
                          border: isAvoided ? "2px solid" : "1px solid",
                          borderColor: isAvoided ? "error.main" : "divider",
                          "&:hover": { borderColor: "error.light" },
                        }}
                      >
                        {d}
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Preferred Shift Types
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  Shift types you'd prefer to be scheduled for
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {shiftTypeOptions.map((shiftType) => {
                    const isSelected = (
                      prefs.preferredShiftTypes || []
                    ).includes(shiftType);
                    return (
                      <Chip
                        key={shiftType}
                        label={toDisplayLabel(shiftType)}
                        clickable
                        color={isSelected ? "primary" : "default"}
                        variant={isSelected ? "filled" : "outlined"}
                        onClick={() =>
                          toggleArrayItem("preferredShiftTypes", shiftType)
                        }
                      />
                    );
                  })}
                </Stack>
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
                      checked={!!prefs.wantsOvertime}
                      onChange={(e) =>
                        handleChange("wantsOvertime", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography>Open to Overtime</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Projected overtime won't count against you when ranking
                        assignments
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Target Hours / Week"
                  value={prefs.targetHoursPerWeek ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "targetHoursPerWeek",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  inputProps={{ min: 0, max: 168 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Max Shifts / Week"
                  value={prefs.maxShiftsPerWeek ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "maxShiftsPerWeek",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  inputProps={{ min: 1, max: 7 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Max Consecutive Days"
                  value={prefs.maxConsecutiveDays ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "maxConsecutiveDays",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  inputProps={{ min: 1, max: 31 }}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Rotation
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Cadence</InputLabel>
                    <Select
                      label="Cadence"
                      value={prefs.rotationCadence || "none"}
                      onChange={(e) =>
                        handleChange("rotationCadence", e.target.value)
                      }
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="biweekly">Biweekly</MenuItem>
                    </Select>
                  </FormControl>

                  {prefs.rotationCadence &&
                    prefs.rotationCadence !== "none" && (
                      <FormControl fullWidth>
                        <InputLabel>Scope</InputLabel>
                        <Select
                          label="Scope"
                          value={prefs.rotationScope || "all_days"}
                          onChange={(e) =>
                            handleChange("rotationScope", e.target.value)
                          }
                        >
                          <MenuItem value="all_days">Every day</MenuItem>
                          <MenuItem value="weekends_only">
                            Weekends only
                          </MenuItem>
                        </Select>
                      </FormControl>
                    )}

                  {prefs.rotationCadence === "biweekly" && (
                    <TextField
                      fullWidth
                      type="date"
                      label="Anchor Date"
                      InputLabelProps={{ shrink: true }}
                      value={
                        prefs.rotationAnchorDate
                          ? String(prefs.rotationAnchorDate).slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        handleChange("rotationAnchorDate", e.target.value)
                      }
                      helperText="Defines which week is the 'on' week"
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters sx={ACCORDION_BASE_SX}>
          <AccordionSummary
            expandIcon={<FiChevronDown size={18} />}
            sx={ACCORDION_SUMMARY_SX}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose how you receive important updates
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={ACCORDION_DETAILS_SX}>
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
                      checked={prefs.emailNotificationsEnabled ?? true}
                      onChange={(e) =>
                        handleChange(
                          "emailNotificationsEnabled",
                          e.target.checked,
                        )
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography>Email Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive email alerts for important updates
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
                      checked={prefs.smsNotificationsEnabled ?? true}
                      onChange={(e) =>
                        handleChange(
                          "smsNotificationsEnabled",
                          e.target.checked,
                        )
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography>SMS Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive text alerts for important updates
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion
          disableGutters
          sx={{
            ...ACCORDION_BASE_SX,
            borderColor: "error.light",
            bgcolor: "error.50",
            "& .MuiAccordionSummary-root": {
              bgcolor: "error.50",
            },
            "& .MuiAccordionDetails-root": {
              bgcolor: "error.50",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<FiChevronDown size={18} />}
            sx={ACCORDION_SUMMARY_SX}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Delete your account and remove your personal scheduling data
                from this facility.
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={ACCORDION_DETAILS_SX}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deletingAccount}
              sx={{ textTransform: "none", borderRadius: 2.5 }}
            >
              Delete My Account
            </Button>
          </AccordionDetails>
        </Accordion>

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<FiSave />}
            onClick={handleSave}
            disabled={saving}
            data-guide-id="guide-preferences-save-btn"
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingAccount && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Your Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your account, preferences, messages,
            time-off requests, schedules, and shift swap history tied to your
            profile. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deletingAccount}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deletingAccount}
          >
            {deletingAccount ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
