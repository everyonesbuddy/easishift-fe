import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
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
      const payload = {
        preferredDaysOfWeek: Array.isArray(prefs.preferredDaysOfWeek)
          ? prefs.preferredDaysOfWeek
          : [],
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
              These settings control notifications and preferred work days.
            </Typography>
            <Typography variant="body2" sx={{ color: "info.dark", mt: 0.75 }}>
              Facility rules are configured by admins in Facility Preferences.
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
            Notification Preferences
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
                      handleChange("smsNotificationsEnabled", e.target.checked)
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
