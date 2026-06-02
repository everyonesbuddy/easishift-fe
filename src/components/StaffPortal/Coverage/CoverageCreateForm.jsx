import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MdAccessTime, MdAdd, MdDelete, MdGroups2 } from "react-icons/md";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleDisplayName,
  getRoleOptionsForIndustry,
  getRoleOptionsFromFacilityPreferences,
} from "../../../constants/industryRoles";

const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const horizonOptions = [1, 2, 3, 7, 14, 28, 42, 56];

const requirementTemplates = [
  {
    id: "morning",
    label: "Morning 07-15",
    startTime: "07:00",
    endTime: "15:00",
  },
  {
    id: "business",
    label: "Business 09-17",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "evening",
    label: "Evening 15-23",
    startTime: "15:00",
    endTime: "23:00",
  },
  { id: "night", label: "Night 23-07", startTime: "23:00", endTime: "07:00" },
];

const defaultRequirement = {
  role: "",
  requiredCount: 1,
  startTime: "09:00",
  endTime: "17:00",
  unitArea: "",
  shiftType: "",
  shiftTag: "",
  requiredCertificationTags: [],
};

const toUTCISOString = (dateStr, timeStr) => {
  const [year, month, day] = String(dateStr || "")
    .split("-")
    .map((part) => Number(part));
  const [hour, minute] = String(timeStr || "")
    .split(":")
    .map((part) => Number(part));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return new Date(`${dateStr}T${timeStr}:00`).toISOString();
  }

  // Create a local-time Date explicitly, then convert to UTC ISO.
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
};

const dedupeStrings = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

const isOvernightTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  return endTime <= startTime;
};

const formatShiftPreview = (dateValue, startTime, endTime) => {
  if (!dateValue || !startTime || !endTime) {
    return `${startTime || "--:--"} - ${endTime || "--:--"}`;
  }

  const start = new Date(`${dateValue}T${startTime}:00`);
  const end = new Date(`${dateValue}T${endTime}:00`);

  if (isOvernightTimeRange(startTime, endTime)) {
    end.setDate(end.getDate() + 1);
  }

  return `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const buildDatesFromPattern = (startDateStr, horizonDays, mode, weekdays) => {
  const start = new Date(`${startDateStr}T00:00:00`);
  const totalDays = Number(horizonDays);
  const selectedWeekdays = new Set(weekdays);

  if (!Number.isFinite(totalDays) || totalDays <= 0) return [];
  if (Number.isNaN(start.getTime())) return [];

  const dates = [];

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);

    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;

    if (mode === "weekdays" && isWeekend) continue;
    if (mode === "weekends" && !isWeekend) continue;
    if (mode === "custom" && !selectedWeekdays.has(day)) continue;

    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
};

export default function CoverageCreateForm({ tenantId, onSuccess, onClose }) {
  const { tenant, facilityPreferences } = useAuth();

  const shiftTypeDefinitions = useMemo(() => {
    const defs = Array.isArray(facilityPreferences?.shiftTypeDefinitions)
      ? facilityPreferences.shiftTypeDefinitions
      : [];

    return defs
      .map((def) => ({
        key: normalizeToken(def?.key),
        label: String(def?.label || "").trim(),
        timeSlots: (Array.isArray(def?.timeSlots) ? def.timeSlots : [])
          .map((slot) => ({
            tag: normalizeToken(slot?.tag),
            label: String(slot?.label || "").trim(),
            startLocalTime: String(slot?.startLocalTime || "").trim(),
            endLocalTime: String(slot?.endLocalTime || "").trim(),
          }))
          .filter(
            (slot) => slot.tag && slot.startLocalTime && slot.endLocalTime,
          ),
      }))
      .filter((def) => def.key);
  }, [facilityPreferences?.shiftTypeDefinitions]);

  const slotLookup = useMemo(() => {
    const map = new Map();

    shiftTypeDefinitions.forEach((def) => {
      def.timeSlots.forEach((slot) => {
        map.set(`${def.key}:${slot.tag}`, slot);
      });
    });

    return map;
  }, [shiftTypeDefinitions]);

  const shiftDefinitionOptions = useMemo(() => {
    return shiftTypeDefinitions.flatMap((def) =>
      def.timeSlots.map((slot) => ({
        value: `${def.key}:${slot.tag}`,
        shiftType: def.key,
        shiftTag: slot.tag,
        label: `${def.label || toDisplayLabel(def.key)} - ${slot.label || toDisplayLabel(slot.tag)} (${slot.startLocalTime} - ${slot.endLocalTime})`,
      })),
    );
  }, [shiftTypeDefinitions]);

  const roleOptions = useMemo(() => {
    const facilityOptions =
      getRoleOptionsFromFacilityPreferences(facilityPreferences);
    if (facilityOptions.length) return facilityOptions;
    return getRoleOptionsForIndustry(tenant?.industry);
  }, [facilityPreferences, tenant?.industry]);

  const today = new Date().toISOString().slice(0, 10);

  const [plannerStartDate, setPlannerStartDate] = useState(today);
  const [horizonDays, setHorizonDays] = useState(14);
  const [repeatMode, setRepeatMode] = useState("weekdays");
  const [selectedWeekdays, setSelectedWeekdays] = useState([1, 2, 3, 4, 5]);
  const [excludedDates, setExcludedDates] = useState([]);
  const [requirements, setRequirements] = useState([{ ...defaultRequirement }]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("create");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const generatedDates = useMemo(
    () =>
      buildDatesFromPattern(
        plannerStartDate,
        horizonDays,
        repeatMode,
        selectedWeekdays,
      ),
    [plannerStartDate, horizonDays, repeatMode, selectedWeekdays],
  );

  const activeDates = useMemo(
    () => generatedDates.filter((date) => !excludedDates.includes(date)),
    [generatedDates, excludedDates],
  );

  const includedDateSet = useMemo(() => new Set(activeDates), [activeDates]);

  const totalShiftBlocks = activeDates.length * requirements.length;
  const totalRequestedStaff =
    activeDates.length *
    requirements.reduce(
      (sum, req) => sum + (Number(req.requiredCount) || 0),
      0,
    );

  const previewByDate = useMemo(
    () =>
      activeDates.map((dateValue) => ({
        dateValue,
        dateLabel: new Date(`${dateValue}T00:00:00`).toLocaleDateString(
          undefined,
          {
            weekday: "short",
            month: "short",
            day: "numeric",
          },
        ),
        rows: requirements.map((req, reqIndex) => ({
          id: `${dateValue}-${reqIndex}`,
          role: req.role ? getRoleDisplayName(req.role) : "—",
          timeLabel: formatShiftPreview(dateValue, req.startTime, req.endTime),
          count: Number(req.requiredCount) || 0,
          spansOvernight: isOvernightTimeRange(req.startTime, req.endTime),
          unitArea: req.unitArea || "",
          shiftType: req.shiftType || "",
          shiftTag: req.shiftTag || "",
        })),
      })),
    [activeDates, requirements],
  );

  const handleToggleWeekday = (day) => {
    setRepeatMode("custom");
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== day);
      }
      return [...prev, day];
    });
  };

  const handleRepeatModeChange = (mode) => {
    setRepeatMode(mode);
    if (mode === "weekdays") setSelectedWeekdays([1, 2, 3, 4, 5]);
    if (mode === "weekends") setSelectedWeekdays([6, 0]);
    if (mode === "everyday") setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleRequirementChange = (index, field, value) => {
    setRequirements((prev) =>
      prev.map((req, i) => (i === index ? { ...req, [field]: value } : req)),
    );
  };

  const getShiftSlotsForType = (shiftType) => {
    const key = normalizeToken(shiftType);
    if (!key) return [];
    const matched = shiftTypeDefinitions.find((def) => def.key === key);
    return matched?.timeSlots || [];
  };

  const getSelectedSlot = (req) => {
    const shiftType = normalizeToken(req?.shiftType);
    const shiftTag = normalizeToken(req?.shiftTag);
    if (!shiftType || !shiftTag) return null;
    return slotLookup.get(`${shiftType}:${shiftTag}`) || null;
  };

  const getShiftDefinitionValue = (req) => {
    const shiftType = normalizeToken(req?.shiftType);
    const shiftTag = normalizeToken(req?.shiftTag);
    if (!shiftType || !shiftTag) return "";
    return `${shiftType}:${shiftTag}`;
  };

  const handleShiftDefinitionSelect = (index, selectionValue) => {
    const normalizedValue = String(selectionValue || "").trim();

    if (!normalizedValue) {
      handleRequirementChange(index, "shiftType", "");
      handleRequirementChange(index, "shiftTag", "");
      return;
    }

    const selectedOption = shiftDefinitionOptions.find(
      (option) => option.value === normalizedValue,
    );

    if (!selectedOption) return;

    const selectedSlot = slotLookup.get(
      `${selectedOption.shiftType}:${selectedOption.shiftTag}`,
    );

    handleRequirementChange(index, "shiftType", selectedOption.shiftType);
    handleRequirementChange(index, "shiftTag", selectedOption.shiftTag);

    if (selectedSlot?.startLocalTime && selectedSlot?.endLocalTime) {
      handleRequirementChange(index, "startTime", selectedSlot.startLocalTime);
      handleRequirementChange(index, "endTime", selectedSlot.endLocalTime);
    }
  };

  const handleAddRequirement = () => {
    setRequirements((prev) => [...prev, { ...defaultRequirement }]);
  };

  const handleAddTemplateRequirement = (template) => {
    setRequirements((prev) => [
      ...prev,
      {
        ...defaultRequirement,
        startTime: template.startTime,
        endTime: template.endTime,
      },
    ]);
  };

  const handleRemoveRequirement = (index) => {
    setRequirements((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const handleToggleDate = (date) => {
    setExcludedDates((prev) =>
      prev.includes(date)
        ? prev.filter((value) => value !== date)
        : [...prev, date],
    );
  };

  const clearExcludedDates = () => {
    setExcludedDates([]);
  };

  const handleSubmit = async (event, autoGenerate = false) => {
    if (event) event.preventDefault();

    setError("");
    setSuccess("");

    if (!activeDates.length) {
      const msg = "Please include at least one active date.";
      setError(msg);
      toast.error(msg);
      return;
    }

    for (let index = 0; index < requirements.length; index += 1) {
      const req = requirements[index];
      const slotsForType = getShiftSlotsForType(req.shiftType);
      const selectedSlot = getSelectedSlot(req);
      const requiresSlotTag =
        !!normalizeToken(req.shiftType) && slotsForType.length > 0;

      if (!req.role) {
        const msg = `Requirement ${index + 1} must include a role.`;
        setError(msg);
        toast.error(msg);
        return;
      }

      if (requiresSlotTag && !selectedSlot) {
        const msg = `Requirement ${index + 1} must include a shift slot for selected shift type.`;
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!selectedSlot && (!req.startTime || !req.endTime)) {
        const msg = `Requirement ${index + 1} must include start time and end time.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setLoadingMode(autoGenerate ? "ai" : "create");
    setLoading(true);

    try {
      const createdCoverages = [];

      const createResponses = await Promise.all(
        activeDates.map((date) => {
          const shifts = requirements.map((req) => {
            const selectedSlot = getSelectedSlot(req);
            const startTime = selectedSlot?.startLocalTime || req.startTime;
            const endTime = selectedSlot?.endLocalTime || req.endTime;

            // For overnight shifts (end <= start), the end falls on the next calendar day
            const isOvernight = isOvernightTimeRange(startTime, endTime);
            let endDate = date;
            if (isOvernight) {
              const d = new Date(`${date}T00:00:00`);
              d.setDate(d.getDate() + 1);
              endDate = d.toISOString().slice(0, 10);
            }

            const shiftPayload = {
              role: req.role,
              requiredCount: Number(req.requiredCount) || 0,
              unitArea: req.unitArea || null,
              shiftType: req.shiftType || null,
              shiftTag: req.shiftTag || null,
              startTime: toUTCISOString(date, startTime),
              endTime: toUTCISOString(endDate, endTime),
              requiredCertificationTags: dedupeStrings(
                req.requiredCertificationTags,
              ),
              note,
            };

            return shiftPayload;
          });

          return api.post("/coverage", {
            tenantId,
            dates: [date],
            shifts,
          });
        }),
      );

      createResponses.forEach((response) => {
        const createdForDate = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.created)
            ? response.data.created
            : [];

        createdCoverages.push(...createdForDate);
      });

      if (autoGenerate && createdCoverages.length) {
        await api.post("/schedules/auto-generate", {
          coverageIds: createdCoverages.map((item) => item._id),
        });
      }

      const message = autoGenerate
        ? "Coverage created and auto-scheduling completed."
        : "Coverage requirements added successfully.";

      setSuccess(message);
      toast.success(message);

      setRequirements([{ ...defaultRequirement }]);
      setPlannerStartDate(today);
      setHorizonDays(14);
      setRepeatMode("weekdays");
      setSelectedWeekdays([1, 2, 3, 4, 5]);
      setExcludedDates([]);
      setNote("");
      onSuccess?.();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to add coverage.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMode("create");
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: { xs: 1.5, sm: 3 },
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        position: "relative",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 10, right: 10 }}
        >
          <CloseIcon />
        </IconButton>
      )}

      <Box sx={{ mb: { xs: 2, sm: 2.5 }, pr: onClose ? 5 : 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Coverage Planner
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Set a horizon and repeat pattern, then fill role requirements once.
        </Typography>
      </Box>

      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 1.25, sm: 2 },
            backgroundColor: "background.default",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Quick Planner
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dates generate automatically from start date, horizon, and repeat
            mode.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={plannerStartDate}
                onChange={(e) => setPlannerStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                select
                label="Horizon"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
              >
                {horizonOptions.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} day{value > 1 ? "s" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.75 }}
              >
                Repeat mode
              </Typography>

              <ToggleButtonGroup
                value={repeatMode}
                exclusive
                onChange={(_, mode) => mode && handleRepeatModeChange(mode)}
                size="small"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    borderRadius: "20px !important",
                    border: "1px solid",
                    borderColor: "divider",
                    px: 1.75,
                    py: 0.5,
                    fontSize: "0.8125rem",
                  },
                }}
              >
                <ToggleButton value="everyday">Every Day</ToggleButton>
                <ToggleButton value="weekdays">Weekdays</ToggleButton>
                <ToggleButton value="weekends">Weekends</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {weekdayOptions.map((day) => (
                <Chip
                  key={day.value}
                  label={day.label}
                  color={
                    selectedWeekdays.includes(day.value) ? "primary" : "default"
                  }
                  variant={
                    selectedWeekdays.includes(day.value) ? "filled" : "outlined"
                  }
                  onClick={() => handleToggleWeekday(day.value)}
                  size="small"
                />
              ))}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Generated {generatedDates.length} dates, using{" "}
              {activeDates.length} active dates.
            </Typography>
          </Stack>
        </Box>

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 1.25, sm: 2 },
            backgroundColor: "background.default",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Generated Dates
            </Typography>
            <Button
              size="small"
              onClick={clearExcludedDates}
              sx={{ textTransform: "none", px: 0 }}
              disabled={!excludedDates.length}
            >
              Re-include all
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 1,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              maxHeight: { xs: 170, sm: 220 },
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {generatedDates.map((date) => (
              <Chip
                key={date}
                label={new Date(`${date}T00:00:00`).toLocaleDateString()}
                onClick={() => handleToggleDate(date)}
                color={includedDateSet.has(date) ? "primary" : "default"}
                variant={includedDateSet.has(date) ? "filled" : "outlined"}
                size="small"
                sx={{
                  textDecoration: includedDateSet.has(date)
                    ? "none"
                    : "line-through",
                }}
              />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 1,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Coverage Requirements
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {requirements.length}{" "}
              {requirements.length === 1 ? "entry" : "entries"}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={handleAddRequirement}
            startIcon={<MdAdd size={18} />}
            sx={{ textTransform: "none", width: { xs: "100", sm: "auto" } }}
          >
            Add Requirement
          </Button>
        </Box>

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            Shift templates
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {requirementTemplates.map((template) => (
              <Button
                key={template.id}
                type="button"
                size="small"
                variant="outlined"
                onClick={() => handleAddTemplateRequirement(template)}
                sx={{ textTransform: "none" }}
              >
                {template.label}
              </Button>
            ))}
          </Stack>
        </Box>

        <Stack spacing={2}>
          {requirements.map((req, index) => (
            <Paper
              key={`req-${index}`}
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2.5,
                borderColor: "divider",
                backgroundColor: "background.default",
              }}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Requirement {index + 1}
                  </Typography>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveRequirement(index)}
                    disabled={requirements.length === 1}
                    aria-label={`Remove requirement ${index + 1}`}
                  >
                    <MdDelete size={18} />
                  </IconButton>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <TextField
                    select
                    fullWidth
                    label="Role"
                    value={req.role}
                    onChange={(e) =>
                      handleRequirementChange(index, "role", e.target.value)
                    }
                    required
                  >
                    {roleOptions.map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Count"
                    type="number"
                    value={req.requiredCount}
                    onChange={(e) =>
                      handleRequirementChange(
                        index,
                        "requiredCount",
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                    inputProps={{ min: 0 }}
                    required
                    sx={{ minWidth: { md: 130 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdGroups2 size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Start"
                    type="time"
                    value={
                      getSelectedSlot(req)?.startLocalTime || req.startTime
                    }
                    onChange={(e) =>
                      handleRequirementChange(
                        index,
                        "startTime",
                        e.target.value,
                      )
                    }
                    disabled={Boolean(getSelectedSlot(req))}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdAccessTime size={18} />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />

                  <TextField
                    fullWidth
                    label="End"
                    type="time"
                    value={getSelectedSlot(req)?.endLocalTime || req.endTime}
                    onChange={(e) =>
                      handleRequirementChange(index, "endTime", e.target.value)
                    }
                    disabled={Boolean(getSelectedSlot(req))}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdAccessTime size={18} />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Stack>

                {isOvernightTimeRange(req.startTime, req.endTime) && (
                  <Alert severity="info" sx={{ py: 0 }}>
                    This shift will be treated as overnight and end the next
                    day.
                  </Alert>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    select
                    fullWidth
                    label="Unit Area (Optional)"
                    value={req.unitArea || ""}
                    onChange={(e) =>
                      handleRequirementChange(
                        index,
                        "unitArea",
                        e.target.value || "",
                      )
                    }
                    disabled={!facilityPreferences?.unitAreas?.length}
                    helperText={
                      facilityPreferences?.unitAreas?.length
                        ? ""
                        : "Admin has not configured unit areas yet."
                    }
                  >
                    <MenuItem value="">Any Area</MenuItem>
                    {(facilityPreferences?.unitAreas || []).map((area) => (
                      <MenuItem key={area} value={area}>
                        {area}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Shift Definition (Optional)"
                    value={getShiftDefinitionValue(req)}
                    onChange={(e) =>
                      handleShiftDefinitionSelect(index, e.target.value)
                    }
                    disabled={shiftDefinitionOptions.length === 0}
                    helperText={
                      shiftDefinitionOptions.length > 0
                        ? "Selecting one definition auto-populates start/end and saves shift type + slot tag."
                        : "No shift definitions configured yet. Configure shift type time slots in Facility Preferences."
                    }
                  >
                    <MenuItem value="">Manual Time Entry</MenuItem>
                    {shiftDefinitionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.75 }}
                  >
                    Required Certifications (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    select
                    label="Cert Tags (Optional)"
                    value={req.requiredCertificationTags || []}
                    onChange={(e) => {
                      const selectedValues =
                        typeof e.target.value === "string"
                          ? e.target.value.split(",")
                          : e.target.value;

                      handleRequirementChange(
                        index,
                        "requiredCertificationTags",
                        dedupeStrings(selectedValues),
                      );
                    }}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) =>
                        selected?.length
                          ? selected.join(", ")
                          : "None required",
                    }}
                    disabled={!facilityPreferences?.certificationTags?.length}
                    helperText={
                      facilityPreferences?.certificationTags?.length
                        ? ""
                        : "Admin has not configured certification tags yet."
                    }
                  >
                    {(facilityPreferences?.certificationTags || []).map(
                      (cert) => (
                        <MenuItem key={cert} value={cert}>
                          {cert}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Divider />

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2.5,
            overflow: "hidden",
            backgroundColor: "background.default",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1.25, sm: 1.5 }, pb: 1 }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Plan Summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalShiftBlocks} coverage entries • {totalRequestedStaff}{" "}
                staff positions • {activeDates.length} active dates
              </Typography>
            </Box>
          </Stack>

          {previewByDate.length === 0 ? (
            <Box sx={{ px: 2, pb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Add active dates and at least one requirement to see the plan.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                maxHeight: 320,
                overflowY: "auto",
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              {previewByDate.map((group, gi) => (
                <Box
                  key={group.dateValue}
                  sx={{
                    borderBottom:
                      gi < previewByDate.length - 1 ? "1px solid" : "none",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      px: { xs: 1.5, sm: 2 },
                      py: 0.75,
                      backgroundColor: "action.hover",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {group.dateLabel}
                    </Typography>
                  </Box>

                  {group.rows.map((row) => (
                    <Stack
                      key={row.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        px: { xs: 1.5, sm: 2 },
                        py: 0.6,
                        "&:not(:last-child)": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        },
                      }}
                    >
                      <Chip
                        label={row.role}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 1 }}
                      >
                        {row.timeLabel}
                        {row.unitArea ? ` • ${row.unitArea}` : ""}
                        {row.shiftType ? ` • ${row.shiftType}` : ""}
                        {row.shiftTag ? ` • ${row.shiftTag}` : ""}
                      </Typography>
                      {row.spansOvernight && (
                        <Chip
                          label="Overnight"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                      >
                        ×{row.count}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <TextField
          label="Notes (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          rows={3}
          placeholder="Add any additional notes about these coverage requirements..."
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading && loadingMode === "create"
              ? "Saving..."
              : "Save Requirements"}
          </Button>

          <Button
            type="button"
            variant="contained"
            disabled={loading}
            onClick={(e) => handleSubmit(e, true)}
            fullWidth
            sx={{
              textTransform: "none",
              fontWeight: 600,
              backgroundColor: "#111827",
              "&:hover": { backgroundColor: "#1f2937" },
            }}
          >
            {loading && loadingMode === "ai"
              ? "Creating + AI Scheduling..."
              : "Save + AI Generate Schedule"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
