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
import { FiX, FiPlus } from "react-icons/fi";
import api from "../../../config/api";
import { toast } from "react-toastify";

const SCHEDULING_PATTERNS = [
  { value: "balance", label: "Balance (fairness-based)" },
  { value: "4_on_4_off", label: "4 On / 4 Off" },
  { value: "2_2_3", label: "2-2-3 (Pitman)" },
  { value: "panama", label: "Panama (28-day cycle)" },
  { value: "fixed_5_2", label: "Fixed 5/2 (Mon–Fri)" },
  { value: "rotating_3", label: "Rotating 3 shifts/week" },
  { value: "custom", label: "Custom (coverage-driven)" },
];

const TAXONOMY_FIELDS = [
  "roleFamilies",
  "unitAreas",
  "shiftTypes",
  "certificationTags",
];

const toSnakeCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const toDisplayLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const normalizeArrayValues = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => toSnakeCase(item))
        .filter(Boolean),
    ),
  );

const normalizeTaxonomyPrefs = (inputPrefs) => {
  const safePrefs = inputPrefs || {};
  const next = { ...safePrefs };

  delete next.facilityTimezone;

  TAXONOMY_FIELDS.forEach((field) => {
    next[field] = normalizeArrayValues(safePrefs[field]);
  });

  next.shiftTypeDefinitions = (
    Array.isArray(safePrefs.shiftTypeDefinitions)
      ? safePrefs.shiftTypeDefinitions
      : []
  )
    .map((definition) => {
      const key = toSnakeCase(definition?.key);
      if (!key) return null;

      const timeSlots = Array.from(
        new Map(
          (Array.isArray(definition?.timeSlots) ? definition.timeSlots : [])
            .map((slot) => {
              const tag = toSnakeCase(slot?.tag);
              const startLocalTime = String(slot?.startLocalTime || "").trim();
              const endLocalTime = String(slot?.endLocalTime || "").trim();

              if (!tag || !startLocalTime || !endLocalTime) return null;

              return [
                tag,
                {
                  tag,
                  label: String(slot?.label || "").trim() || null,
                  startLocalTime,
                  endLocalTime,
                  spansOvernight: Boolean(slot?.spansOvernight),
                },
              ];
            })
            .filter(Boolean),
        ).values(),
      );

      return {
        key,
        label: String(definition?.label || "").trim() || null,
        timeSlots,
      };
    })
    .filter(Boolean);

  const definitionKeys = next.shiftTypeDefinitions.map((item) => item.key);
  next.shiftTypes = Array.from(
    new Set([...(next.shiftTypes || []), ...definitionKeys]),
  );

  return next;
};

export default function FacilityPreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // UI state for adding new items to arrays
  const [arrayInputs, setArrayInputs] = useState({
    roleFamilies: "",
    unitAreas: "",
    shiftTypes: "",
    certificationTags: "",
  });
  const [slotInputsByShiftType, setSlotInputsByShiftType] = useState({});
  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await api.get("/facility-preferences");
        setPrefs(normalizeTaxonomyPrefs(res.data));
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

  const handleArrayAdd = (field) => {
    const value = toSnakeCase(arrayInputs[field]);
    if (!value) return;

    setPrefs((prev) => {
      const existing = normalizeArrayValues(prev[field]);
      if (existing.includes(value)) {
        toast.warning(`${toDisplayLabel(value)} is already in the list`, {
          autoClose: 1500,
        });
        return prev;
      }
      return { ...prev, [field]: [...existing, value] };
    });

    setArrayInputs((prev) => ({ ...prev, [field]: "" }));
  };

  const handleArrayRemove = (field, index) => {
    setPrefs((prev) => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleArrayInputChange = (field, value) => {
    setArrayInputs((prev) => ({ ...prev, [field]: value }));
  };

  const getShiftTypeDefinition = (shiftTypeKey) => {
    const key = toSnakeCase(shiftTypeKey);
    return (prefs.shiftTypeDefinitions || []).find((item) => item.key === key);
  };

  const getSlotInput = (shiftTypeKey) => {
    const key = toSnakeCase(shiftTypeKey);
    return (
      slotInputsByShiftType[key] || {
        tag: "",
        startLocalTime: "",
        endLocalTime: "",
        spansOvernight: false,
      }
    );
  };

  const handleSlotInputChange = (shiftTypeKey, field, value) => {
    const key = toSnakeCase(shiftTypeKey);
    setSlotInputsByShiftType((prev) => ({
      ...prev,
      [key]: {
        ...getSlotInput(key),
        [field]: value,
      },
    }));
  };

  const handleAddShiftSlot = (shiftTypeKey) => {
    const key = toSnakeCase(shiftTypeKey);
    const input = getSlotInput(key);
    const tag = toSnakeCase(input.tag);
    const startLocalTime = String(input.startLocalTime || "").trim();
    const endLocalTime = String(input.endLocalTime || "").trim();

    if (!tag || !startLocalTime || !endLocalTime) {
      toast.warning("Provide slot tag, start time, and end time", {
        autoClose: 1500,
      });
      return;
    }

    setPrefs((prev) => {
      const existingDefinitions = Array.isArray(prev.shiftTypeDefinitions)
        ? prev.shiftTypeDefinitions
        : [];

      const defIndex = existingDefinitions.findIndex(
        (item) => item.key === key,
      );
      const nextDefinitions = [...existingDefinitions];

      if (defIndex === -1) {
        nextDefinitions.push({
          key,
          label: null,
          timeSlots: [
            {
              tag,
              label: null,
              startLocalTime,
              endLocalTime,
              spansOvernight: Boolean(input.spansOvernight),
            },
          ],
        });
      } else {
        const definition = nextDefinitions[defIndex];
        const currentSlots = Array.isArray(definition.timeSlots)
          ? definition.timeSlots
          : [];

        if (currentSlots.some((slot) => slot.tag === tag)) {
          toast.warning(
            `${toDisplayLabel(tag)} already exists for ${toDisplayLabel(key)}`,
            {
              autoClose: 1500,
            },
          );
          return prev;
        }

        nextDefinitions[defIndex] = {
          ...definition,
          timeSlots: [
            ...currentSlots,
            {
              tag,
              label: null,
              startLocalTime,
              endLocalTime,
              spansOvernight: Boolean(input.spansOvernight),
            },
          ],
        };
      }

      return {
        ...prev,
        shiftTypeDefinitions: nextDefinitions,
      };
    });

    setSlotInputsByShiftType((prev) => ({
      ...prev,
      [key]: {
        tag: "",
        startLocalTime: "",
        endLocalTime: "",
        spansOvernight: false,
      },
    }));
  };

  const handleRemoveShiftSlot = (shiftTypeKey, slotIndex) => {
    const key = toSnakeCase(shiftTypeKey);
    setPrefs((prev) => ({
      ...prev,
      shiftTypeDefinitions: (prev.shiftTypeDefinitions || []).map(
        (definition) => {
          if (definition.key !== key) return definition;
          return {
            ...definition,
            timeSlots: (definition.timeSlots || []).filter(
              (_, idx) => idx !== slotIndex,
            ),
          };
        },
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = normalizeTaxonomyPrefs(prefs);
      const res = await api.post("/facility-preferences", payload);
      setPrefs(normalizeTaxonomyPrefs(res.data));
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
      setPrefs(normalizeTaxonomyPrefs(res.data));
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
              value={prefs.schedulingPattern || "balance"}
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

        {/* ── Facility Taxonomy ── */}
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
            Facility Taxonomy
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Define the roles, areas, shift types, and certifications valid at
            your facility
          </Typography>

          <Stack spacing={3}>
            {/* Role Families */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Role Families
              </Typography>
              <Stack spacing={1} mb={2}>
                {(prefs.roleFamilies || []).map((role, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography>{toDisplayLabel(role)}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleArrayRemove("roleFamilies", idx)}
                      startIcon={<FiX size={14} />}
                      sx={{ minWidth: "auto" }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="e.g., receptionist, nurse, doctor"
                  value={arrayInputs.roleFamilies}
                  onChange={(e) =>
                    handleArrayInputChange("roleFamilies", e.target.value)
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleArrayAdd("roleFamilies");
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FiPlus size={14} />}
                  onClick={() => handleArrayAdd("roleFamilies")}
                  sx={{ px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {/* Unit Areas */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Unit Areas{" "}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  (Optional)
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                e.g., AL (Assisted Living), IL (Independent Living), MC (Memory
                Care) – leave empty if not applicable
              </Typography>
              <Stack spacing={1} mb={2}>
                {(prefs.unitAreas || []).map((area, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography>{toDisplayLabel(area)}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleArrayRemove("unitAreas", idx)}
                      startIcon={<FiX size={14} />}
                      sx={{ minWidth: "auto" }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="e.g., AL, IL, MC"
                  value={arrayInputs.unitAreas}
                  onChange={(e) =>
                    handleArrayInputChange("unitAreas", e.target.value)
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleArrayAdd("unitAreas");
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FiPlus size={14} />}
                  onClick={() => handleArrayAdd("unitAreas")}
                  sx={{ px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {/* Shift Types */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Shift Types
              </Typography>
              <Stack spacing={1} mb={2}>
                {(prefs.shiftTypes || []).map((shiftType, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography>{toDisplayLabel(shiftType)}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleArrayRemove("shiftTypes", idx)}
                      startIcon={<FiX size={14} />}
                      sx={{ minWidth: "auto" }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="e.g., day, evening, night"
                  value={arrayInputs.shiftTypes}
                  onChange={(e) =>
                    handleArrayInputChange("shiftTypes", e.target.value)
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleArrayAdd("shiftTypes");
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FiPlus size={14} />}
                  onClick={() => handleArrayAdd("shiftTypes")}
                  sx={{ px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {/* Shift Slot Definitions */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Shift Type Time Slots
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                Configure local-time slots for each shift type (e.g. day_am
                07:00-11:00). Coverage can then use shift type + slot tag.
              </Typography>

              {(prefs.shiftTypes || []).length === 0 ? (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Add at least one shift type before configuring time slots.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {(prefs.shiftTypes || []).map((shiftTypeKey) => {
                    const definition = getShiftTypeDefinition(shiftTypeKey);
                    const slots = definition?.timeSlots || [];
                    const slotInput = getSlotInput(shiftTypeKey);

                    return (
                      <Box
                        key={shiftTypeKey}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "grey.50",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          {toDisplayLabel(shiftTypeKey)}
                        </Typography>

                        <Stack spacing={1} mb={1.5}>
                          {slots.length === 0 ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              No slots configured yet.
                            </Typography>
                          ) : (
                            slots.map((slot, idx) => (
                              <Box
                                key={`${slot.tag}-${idx}`}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: "background.paper",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Typography variant="body2">
                                  {toDisplayLabel(slot.tag)} (
                                  {slot.startLocalTime} - {slot.endLocalTime})
                                  {slot.spansOvernight ? " • Overnight" : ""}
                                </Typography>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleRemoveShiftSlot(shiftTypeKey, idx)
                                  }
                                  startIcon={<FiX size={14} />}
                                  sx={{ minWidth: "auto" }}
                                >
                                  Remove
                                </Button>
                              </Box>
                            ))
                          )}
                        </Stack>

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                        >
                          <TextField
                            size="small"
                            label="Slot Tag"
                            placeholder="e.g., day_am"
                            value={slotInput.tag}
                            onChange={(e) =>
                              handleSlotInputChange(
                                shiftTypeKey,
                                "tag",
                                e.target.value,
                              )
                            }
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            size="small"
                            label="Start"
                            type="time"
                            value={slotInput.startLocalTime}
                            onChange={(e) =>
                              handleSlotInputChange(
                                shiftTypeKey,
                                "startLocalTime",
                                e.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                          <TextField
                            size="small"
                            label="End"
                            type="time"
                            value={slotInput.endLocalTime}
                            onChange={(e) =>
                              handleSlotInputChange(
                                shiftTypeKey,
                                "endLocalTime",
                                e.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<FiPlus size={14} />}
                            onClick={() => handleAddShiftSlot(shiftTypeKey)}
                          >
                            Add Slot
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Certification Tags */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Certification Tags{" "}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  (Optional)
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                e.g., med-pass, bilingual, forklift-certified – leave empty if
                not applicable
              </Typography>
              <Stack spacing={1} mb={2}>
                {(prefs.certificationTags || []).map((cert, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography>{toDisplayLabel(cert)}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        handleArrayRemove("certificationTags", idx)
                      }
                      startIcon={<FiX size={14} />}
                      sx={{ minWidth: "auto" }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="e.g., med-pass, bilingual"
                  value={arrayInputs.certificationTags}
                  onChange={(e) =>
                    handleArrayInputChange("certificationTags", e.target.value)
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleArrayAdd("certificationTags");
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FiPlus size={14} />}
                  onClick={() => handleArrayAdd("certificationTags")}
                  sx={{ px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Stack>
        </Paper>
        {/* ── Workload Signals ── */}
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
            Workload Signals
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.25}>
            Thresholds used as signals during auto-generation ranking
          </Typography>
          <TextField
            label="Weekly Overtime Threshold (hours)"
            type="number"
            value={prefs.weeklyOvertimeThresholdHours ?? 40}
            onChange={(e) =>
              handleChange(
                "weeklyOvertimeThresholdHours",
                parseInt(e.target.value) || 1,
              )
            }
            inputProps={{ min: 1 }}
            helperText="Hours/week at which projected overtime is flagged"
            sx={{ maxWidth: 320 }}
          />
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

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            Timezone is fixed to UTC and converted to local time in the app.
          </Typography>
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
