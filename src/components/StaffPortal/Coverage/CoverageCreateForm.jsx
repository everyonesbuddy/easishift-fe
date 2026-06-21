import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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
import {
  MdAccessTime,
  MdAdd,
  MdDelete,
  MdGroups2,
  MdExpandMore,
  MdExpandLess,
  MdCalendarMonth,
  MdRepeat,
  MdSummarize,
} from "react-icons/md";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleDisplayName,
  getRoleOptionsFromFacilityPreferences,
  getUnitAreaDisplayName,
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

const to12HourTime = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) return raw;

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${meridiem}`;
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
  const { facilityPreferences } = useAuth();

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
        label: `${def.label || toDisplayLabel(def.key)} - ${slot.label || toDisplayLabel(slot.tag)} (${to12HourTime(slot.startLocalTime)} - ${to12HourTime(slot.endLocalTime)})`,
      })),
    );
  }, [shiftTypeDefinitions]);

  const roleOptions = useMemo(() => {
    return getRoleOptionsFromFacilityPreferences(facilityPreferences);
  }, [facilityPreferences]);

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
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

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
        ? "Coverage created and AI draft generated. Review and publish it from the schedule planner."
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

  // ── reusable accordion header ──────────────────────────────────────────────
  const AccordionHeader = ({
    icon,
    title,
    subtitle,
    open,
    onToggle,
    accentColor = "#2563EB",
    badgeText,
  }) => (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 1.5, sm: 2 },
        py: 1.1,
        cursor: "pointer",
        userSelect: "none",
        borderBottom: open ? "1px solid" : "none",
        borderColor: "divider",
        "&:hover": { backgroundColor: "action.hover" },
        borderRadius: open ? 0 : "inherit",
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.1, minWidth: 0 }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            backgroundColor: `${accentColor}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: accentColor,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
        {badgeText && (
          <Chip
            label={badgeText}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              ml: 0.5,
            }}
          />
        )}
      </Box>
      <Box sx={{ color: "text.secondary", flexShrink: 0, ml: 1 }}>
        {open ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
      </Box>
    </Box>
  );

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

      <Box sx={{ mb: 2, pr: onClose ? 5 : 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Coverage Planner
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
          Define your date pattern and shift requirements, then review before
          saving.
        </Typography>
      </Box>

      <Stack spacing={1.75}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {/* ── SECTION 1: Date Pattern ─────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 2.5, overflow: "hidden", borderColor: "#BFDBFE" }}
        >
          {/* Always-visible core: start date + horizon */}
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              pt: 1.5,
              pb: 1.25,
              background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)",
            }}
          >
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  backgroundColor: "#DBEAFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1D4ED8",
                }}
              >
                <MdCalendarMonth size={17} />
              </Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: "#1E3A8A" }}
              >
                Date Pattern
              </Typography>
              {activeDates.length > 0 && (
                <Chip
                  label={`${activeDates.length} dates`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    backgroundColor: "#DBEAFE",
                    color: "#1D4ED8",
                  }}
                />
              )}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={plannerStartDate}
                onChange={(e) => setPlannerStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                fullWidth
                select
                label="Horizon"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                size="small"
              >
                {horizonOptions.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} day{value > 1 ? "s" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>

          {/* Repeat mode accordion */}
          <AccordionHeader
            icon={<MdRepeat size={17} />}
            title="Repeat Mode"
            subtitle={`${repeatMode.charAt(0).toUpperCase() + repeatMode.slice(1)} · ${generatedDates.length} generated`}
            open={repeatOpen}
            onToggle={() => setRepeatOpen((v) => !v)}
            accentColor="#2563EB"
          />
          <Collapse in={repeatOpen}>
            <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
              <ToggleButtonGroup
                value={repeatMode}
                exclusive
                onChange={(_, mode) => mode && handleRepeatModeChange(mode)}
                size="small"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  mb: 1.25,
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    borderRadius: "20px !important",
                    border: "1px solid #BFDBFE",
                    px: 1.5,
                    py: 0.4,
                    fontSize: "0.78rem",
                    color: "#374151",
                    "&.Mui-selected": {
                      backgroundColor: "#2563EB",
                      color: "#fff",
                      borderColor: "#2563EB",
                    },
                  },
                }}
              >
                <ToggleButton value="everyday">Every Day</ToggleButton>
                <ToggleButton value="weekdays">Weekdays</ToggleButton>
                <ToggleButton value="weekends">Weekends</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                {weekdayOptions.map((day) => (
                  <Chip
                    key={day.value}
                    label={day.label}
                    color={
                      selectedWeekdays.includes(day.value)
                        ? "primary"
                        : "default"
                    }
                    variant={
                      selectedWeekdays.includes(day.value)
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() => handleToggleWeekday(day.value)}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
          </Collapse>

          {/* Generated dates accordion */}
          <AccordionHeader
            icon={<MdCalendarMonth size={17} />}
            title="Generated Dates"
            subtitle={`${activeDates.length} active${excludedDates.length ? ` · ${excludedDates.length} excluded` : ""}`}
            open={datesOpen}
            onToggle={() => setDatesOpen((v) => !v)}
            accentColor="#0369A1"
            badgeText={
              excludedDates.length ? `${excludedDates.length} excluded` : null
            }
          />
          <Collapse in={datesOpen}>
            <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mb: 0.75,
                }}
              >
                <Button
                  size="small"
                  onClick={clearExcludedDates}
                  disabled={!excludedDates.length}
                  sx={{ textTransform: "none", px: 0, fontSize: "0.75rem" }}
                >
                  Re-include all
                </Button>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.7,
                  maxHeight: { xs: 155, sm: 190 },
                  overflowY: "auto",
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
          </Collapse>
        </Paper>

        {/* ── SECTION 2: Coverage Requirements ───────────────────────── */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 2.5, overflow: "hidden", borderColor: "#C4B5FD" }}
        >
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.1,
              background: "linear-gradient(135deg, #F5F3FF 0%, #F8FAFC 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #E8E3FF",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  backgroundColor: "#EDE9FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7C3AED",
                }}
              >
                <MdGroups2 size={17} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "#4C1D95" }}
                >
                  Coverage Requirements
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {requirements.length} template
                  {requirements.length !== 1 ? "s" : ""} · applied across all
                  active dates
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={handleAddRequirement}
              startIcon={<MdAdd size={16} />}
              size="small"
              sx={{
                textTransform: "none",
                borderColor: "#C4B5FD",
                color: "#7C3AED",
                "&:hover": {
                  borderColor: "#7C3AED",
                  backgroundColor: "#F5F3FF",
                },
              }}
            >
              Add
            </Button>
          </Box>

          <Stack spacing={0} divider={<Divider />}>
            {requirements.map((req, index) => {
              const selectedSlot = getSelectedSlot(req);

              return (
                <Box key={`req-${index}`} sx={{ p: { xs: 1, sm: 1.25 } }}>
                  <Stack spacing={0.9}>
                    {/* Row header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: 1,
                            backgroundColor: "#EDE9FE",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: "#7C3AED",
                            }}
                          >
                            {index + 1}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: "#4C1D95" }}
                        >
                          Template {index + 1}
                        </Typography>
                        {req.role && (
                          <Chip
                            label={getRoleDisplayName(req.role)}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              backgroundColor: "#EDE9FE",
                              color: "#7C3AED",
                            }}
                          />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveRequirement(index)}
                        disabled={requirements.length === 1}
                      >
                        <MdDelete size={15} />
                      </IconButton>
                    </Box>

                    {/* Row 1: Role + Count */}
                    <Stack direction="row" spacing={0.9}>
                      <TextField
                        select
                        fullWidth
                        label="Role"
                        value={req.role}
                        onChange={(e) =>
                          handleRequirementChange(index, "role", e.target.value)
                        }
                        required
                        size="small"
                        inputProps={{ sx: { fontSize: "0.78rem" } }}
                        InputLabelProps={{ sx: { fontSize: "0.78rem" } }}
                      >
                        {roleOptions.map((item) => (
                          <MenuItem
                            key={item.value}
                            value={item.value}
                            sx={{ fontSize: "0.78rem" }}
                          >
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
                        inputProps={{ min: 0, sx: { fontSize: "0.78rem" } }}
                        InputLabelProps={{ sx: { fontSize: "0.78rem" } }}
                        required
                        size="small"
                        sx={{ width: 100, flexShrink: 0 }}
                      />
                    </Stack>

                    {/* Row 2: Shift Definition */}
                    <TextField
                      select
                      fullWidth
                      label="Time Slot"
                      value={getShiftDefinitionValue(req)}
                      onChange={(e) =>
                        handleShiftDefinitionSelect(index, e.target.value)
                      }
                      disabled={shiftDefinitionOptions.length === 0}
                      size="small"
                      inputProps={{ sx: { fontSize: "0.78rem" } }}
                      InputLabelProps={{ sx: { fontSize: "0.78rem" } }}
                      helperText={
                        shiftDefinitionOptions.length === 0
                          ? "No time slots configured yet."
                          : undefined
                      }
                      FormHelperTextProps={{
                        sx: { fontSize: "0.68rem", mt: 0.3 },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.78rem" }}>
                        Use Custom Manual Time
                      </MenuItem>
                      {shiftDefinitionOptions.map((option) => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                          sx={{ fontSize: "0.78rem" }}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Row 3: Unit Area + Cert Tags */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={0.9}
                    >
                      <TextField
                        select
                        fullWidth
                        label="Unit Area"
                        value={req.unitArea || ""}
                        onChange={(e) =>
                          handleRequirementChange(
                            index,
                            "unitArea",
                            e.target.value || "",
                          )
                        }
                        disabled={!facilityPreferences?.unitAreas?.length}
                        size="small"
                        inputProps={{ sx: { fontSize: "0.78rem" } }}
                        InputLabelProps={{ sx: { fontSize: "0.78rem" } }}
                      >
                        <MenuItem value="" sx={{ fontSize: "0.78rem" }}>
                          Any Area
                        </MenuItem>
                        {(facilityPreferences?.unitAreas || []).map((area) => (
                          <MenuItem
                            key={area}
                            value={area}
                            sx={{ fontSize: "0.78rem" }}
                          >
                            {getUnitAreaDisplayName(area)}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        fullWidth
                        select
                        label="Cert Tags"
                        value={req.requiredCertificationTags || []}
                        onChange={(e) => {
                          const vals =
                            typeof e.target.value === "string"
                              ? e.target.value.split(",")
                              : e.target.value;
                          handleRequirementChange(
                            index,
                            "requiredCertificationTags",
                            dedupeStrings(vals),
                          );
                        }}
                        SelectProps={{
                          multiple: true,
                          renderValue: (selected) =>
                            selected?.length ? selected.join(", ") : "None",
                        }}
                        disabled={
                          !facilityPreferences?.certificationTags?.length
                        }
                        size="small"
                        inputProps={{ sx: { fontSize: "0.78rem" } }}
                        InputLabelProps={{ sx: { fontSize: "0.78rem" } }}
                      >
                        {(facilityPreferences?.certificationTags || []).map(
                          (cert) => (
                            <MenuItem
                              key={cert}
                              value={cert}
                              sx={{ fontSize: "0.78rem" }}
                            >
                              {cert}
                            </MenuItem>
                          ),
                        )}
                      </TextField>
                    </Stack>

                    {/* Row 4: Start + End time (only shown when no slot locked) */}
                    <Stack direction="row" spacing={0.9}>
                      <TextField
                        fullWidth
                        label="Start"
                        type="time"
                        value={selectedSlot?.startLocalTime || req.startTime}
                        onChange={(e) =>
                          handleRequirementChange(
                            index,
                            "startTime",
                            e.target.value,
                          )
                        }
                        disabled={Boolean(selectedSlot)}
                        InputLabelProps={{
                          shrink: true,
                          sx: { fontSize: "0.78rem" },
                        }}
                        inputProps={{ sx: { fontSize: "0.78rem" } }}
                        size="small"
                        required
                      />
                      <TextField
                        fullWidth
                        label="End"
                        type="time"
                        value={selectedSlot?.endLocalTime || req.endTime}
                        onChange={(e) =>
                          handleRequirementChange(
                            index,
                            "endTime",
                            e.target.value,
                          )
                        }
                        disabled={Boolean(selectedSlot)}
                        InputLabelProps={{
                          shrink: true,
                          sx: { fontSize: "0.78rem" },
                        }}
                        inputProps={{ sx: { fontSize: "0.78rem" } }}
                        size="small"
                        required
                      />
                    </Stack>

                    {isOvernightTimeRange(
                      selectedSlot?.startLocalTime || req.startTime,
                      selectedSlot?.endLocalTime || req.endTime,
                    ) && (
                      <Alert
                        severity="info"
                        sx={{ py: 0, fontSize: "0.72rem" }}
                      >
                        Overnight — ends on the next calendar day.
                      </Alert>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* ── SECTION 3: Plan Summary accordion ──────────────────────── */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 2.5, overflow: "hidden", borderColor: "#6EE7B7" }}
        >
          <AccordionHeader
            icon={<MdSummarize size={17} />}
            title="Plan Summary"
            subtitle={`${totalShiftBlocks} entries · ${totalRequestedStaff} staff positions · ${activeDates.length} dates`}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((v) => !v)}
            accentColor="#059669"
          />
          <Collapse in={summaryOpen}>
            {previewByDate.length === 0 ? (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Add active dates and at least one requirement to preview your
                  plan.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
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
                        py: 0.6,
                        backgroundColor: "#F0FDF4",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: "#065F46" }}
                      >
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
                          py: 0.55,
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
                          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ flex: 1 }}
                          noWrap
                        >
                          {row.timeLabel}
                          {row.unitArea
                            ? ` · ${getUnitAreaDisplayName(row.unitArea)}`
                            : ""}
                          {row.shiftType
                            ? ` · ${toDisplayLabel(row.shiftType)}`
                            : ""}
                          {row.shiftTag
                            ? ` · ${toDisplayLabel(row.shiftTag)}`
                            : ""}
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
                          sx={{
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            color: "#059669",
                          }}
                        >
                          ×{row.count}
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                ))}
              </Box>
            )}
          </Collapse>
        </Paper>

        {/* Notes */}
        <TextField
          label="Notes (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          rows={2}
          placeholder="Any additional notes about these coverage requirements..."
          size="small"
        />

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
          sx={{
            textTransform: "none",
            fontWeight: 700,
            py: 1.1,
            borderRadius: 2,
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          {loading && loadingMode === "create"
            ? "Saving…"
            : "Save Requirements"}
        </Button>
      </Stack>
    </Paper>
  );
}
