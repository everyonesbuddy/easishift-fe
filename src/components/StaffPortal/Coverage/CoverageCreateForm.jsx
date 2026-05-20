import { useMemo, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Alert,
  Paper,
  Stack,
  Chip,
  IconButton,
  Divider,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MdAdd, MdDelete, MdAccessTime, MdGroups2 } from "react-icons/md";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleDisplayName,
  getRoleOptionsForIndustry,
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
  { id: "day12", label: "Day 07-19", startTime: "07:00", endTime: "19:00" },
];

const horizonOptions = [
  { value: 1, label: "1 Day" },
  { value: 2, label: "2 Days" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "1 Week" },
  { value: 14, label: "2 Weeks" },
  { value: 28, label: "4 Weeks" },
  { value: 42, label: "6 Weeks" },
  { value: 56, label: "8 Weeks" },
];

const defaultRequirement = {
  role: "",
  requiredCount: 1,
  startTime: "09:00",
  endTime: "17:00",
};

function toUTC(dateStr, timeStr) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return new Date(local.toISOString());
}

function buildDatesFromPattern(
  startDateStr,
  horizonDays,
  mode,
  selectedWeekdays,
) {
  const start = new Date(`${startDateStr}T00:00:00`);
  const totalDays = Number(horizonDays);
  const selectedSet = new Set(selectedWeekdays);
  const generated = [];

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + dayOffset);

    if (mode === "weekdays" && (next.getDay() === 0 || next.getDay() === 6)) {
      continue;
    }

    if (mode === "weekends" && next.getDay() !== 0 && next.getDay() !== 6) {
      continue;
    }

    if (mode === "custom" && !selectedSet.has(next.getDay())) {
      continue;
    }

    generated.push(next.toISOString().slice(0, 10));
  }

  return generated;
}

export default function CoverageCreateForm({ tenantId, onSuccess, onClose }) {
  const { tenant } = useAuth();
  const roleOptions = useMemo(
    () => getRoleOptionsForIndustry(tenant?.industry),
    [tenant?.industry],
  );

  const today = new Date().toISOString().slice(0, 10);
  const [requirements, setRequirements] = useState([{ ...defaultRequirement }]);
  const [plannerStartDate, setPlannerStartDate] = useState(today);
  const [horizonDays, setHorizonDays] = useState(14);
  const [repeatMode, setRepeatMode] = useState("weekdays");
  const [selectedWeekdays, setSelectedWeekdays] = useState([1, 2, 3, 4, 5]);
  const [excludedDates, setExcludedDates] = useState([]);
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

  const dates = useMemo(
    () => generatedDates.filter((d) => !excludedDates.includes(d)),
    [generatedDates, excludedDates],
  );

  const includedDateSet = useMemo(() => new Set(dates), [dates]);

  const totalShiftBlocks = dates.length * requirements.length;
  const totalRequestedStaff =
    dates.length *
    requirements.reduce(
      (sum, req) => sum + (Number(req.requiredCount) || 0),
      0,
    );

  const previewByDate = useMemo(
    () =>
      dates.map((dateValue) => ({
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
          timeLabel: `${req.startTime} – ${req.endTime}`,
          count: Number(req.requiredCount) || 0,
        })),
      })),
    [dates, requirements],
  );

  const handleDateToggle = (dateValue) => {
    setExcludedDates((prev) =>
      prev.includes(dateValue)
        ? prev.filter((d) => d !== dateValue)
        : [...prev, dateValue],
    );
    setError("");
  };

  const clearExcludedDates = () => {
    setExcludedDates([]);
    setError("");
  };

  const handleWeekdayToggle = (weekday) => {
    if (repeatMode !== "custom") {
      setRepeatMode("custom");
    }

    setSelectedWeekdays((prev) => {
      if (prev.includes(weekday)) {
        return prev.length === 1 ? prev : prev.filter((d) => d !== weekday);
      }
      return [...prev, weekday];
    });
    setError("");
  };

  const handleRepeatModeChange = (_, mode) => {
    if (!mode) return;
    setRepeatMode(mode);
    if (mode === "weekdays") setSelectedWeekdays([1, 2, 3, 4, 5]);
    else if (mode === "weekends") setSelectedWeekdays([6, 0]);
    else if (mode === "everyday") setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleSubmit = async (e, autoGenerate = false) => {
    if (e) e.preventDefault();

    if (!dates.length || requirements.length === 0) {
      setError(
        "Please add at least one active date and one coverage requirement.",
      );
      toast.error(
        "Please add at least one active date and one coverage requirement.",
      );
      return;
    }

    const referenceDate = dates[0];

    for (let index = 0; index < requirements.length; index += 1) {
      const req = requirements[index];
      if (!req.role || !req.startTime || !req.endTime) {
        const msg = `Requirement ${index + 1} must include role, start time, and end time.`;
        setError(msg);
        toast.error(msg);
        return;
      }

      const startUTC = toUTC(referenceDate, req.startTime);
      const endUTC = toUTC(referenceDate, req.endTime);

      if (startUTC >= endUTC) {
        const msg = `Requirement ${index + 1} must have end time after start time.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setLoadingMode(autoGenerate ? "ai" : "create");
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const allCreated = [];

      const createResponses = await Promise.all(
        dates.map((selectedDate) => {
          const shifts = requirements.map((req) => ({
            role: req.role,
            requiredCount: Number(req.requiredCount) || 0,
            startTime: toUTC(selectedDate, req.startTime),
            endTime: toUTC(selectedDate, req.endTime),
            note,
          }));

          return api.post("/coverage", {
            tenantId,
            dates: [selectedDate],
            shifts,
          });
        }),
      );

      createResponses.forEach((createRes) => {
        const createdForDate = Array.isArray(createRes.data)
          ? createRes.data
          : Array.isArray(createRes.data?.created)
            ? createRes.data.created
            : [];

        allCreated.push(...createdForDate);
      });

      let generatedCount = 0;
      if (autoGenerate) {
        const coverageIds = allCreated.map((item) => item?._id).filter(Boolean);

        if (coverageIds.length > 0) {
          const autoRes = await api.post("/schedules/auto-generate", {
            coverageIds,
          });
          generatedCount = autoRes.data?.generatedCount ?? 0;
        }
      }

      const successMsg = autoGenerate
        ? `Coverage created + AI auto-schedule complete (${generatedCount} shifts generated).`
        : "Coverage requirements added successfully!";

      setSuccess(successMsg);
      toast.success(successMsg);
      setRequirements([{ ...defaultRequirement }]);
      setPlannerStartDate(today);
      setHorizonDays(14);
      setRepeatMode("weekdays");
      setSelectedWeekdays([1, 2, 3, 4, 5]);
      setExcludedDates([]);
      setNote("");

      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add coverage.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setLoadingMode("create");
    }
  };

  const handleRequirementChange = (index, key, value) => {
    setRequirements((prev) =>
      prev.map((req, i) => (i === index ? { ...req, [key]: value } : req)),
    );
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
                {horizonOptions.map((option) => (
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
                Repeat mode
              </Typography>

              <ToggleButtonGroup
                value={repeatMode}
                exclusive
                onChange={handleRepeatModeChange}
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
              {weekdayOptions.map((weekday) => (
                <Chip
                  key={weekday.value}
                  label={weekday.label}
                  color={
                    selectedWeekdays.includes(weekday.value)
                      ? "primary"
                      : "default"
                  }
                  variant={
                    selectedWeekdays.includes(weekday.value)
                      ? "filled"
                      : "outlined"
                  }
                  onClick={() => handleWeekdayToggle(weekday.value)}
                  size="small"
                />
              ))}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Generated {generatedDates.length} dates, using {dates.length}{" "}
              active dates.
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
            <Typography variant="caption" color="text.secondary">
              Tap a date chip to include or skip it.
            </Typography>
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
            {generatedDates.map((d) => (
              <Chip
                key={d}
                label={new Date(`${d}T00:00:00`).toLocaleDateString()}
                onClick={() => handleDateToggle(d)}
                color={includedDateSet.has(d) ? "primary" : "default"}
                variant={includedDateSet.has(d) ? "filled" : "outlined"}
                size="small"
                sx={{
                  textDecoration: includedDateSet.has(d)
                    ? "none"
                    : "line-through",
                }}
              />
            ))}
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{ mt: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Active dates: {dates.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Skipped: {generatedDates.length - dates.length}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Horizon starts{" "}
            {new Date(`${plannerStartDate}T00:00:00`).toLocaleDateString()}.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 1,
            mt: 0.5,
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
            sx={{
              textTransform: "none",
              whiteSpace: "nowrap",
              width: { xs: "100%", sm: "auto" },
            }}
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
                        Number(e.target.value),
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
                    value={req.startTime}
                    onChange={(e) =>
                      handleRequirementChange(
                        index,
                        "startTime",
                        e.target.value,
                      )
                    }
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
                    value={req.endTime}
                    onChange={(e) =>
                      handleRequirementChange(index, "endTime", e.target.value)
                    }
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
                {totalShiftBlocks} coverage entries &middot;{" "}
                {totalRequestedStaff} staff positions &middot; {dates.length}{" "}
                active dates
              </Typography>
            </Box>
            <Tooltip title="Duplicate checking is enforced by the server on save.">
              <Chip
                size="small"
                label="Duplicate protection on"
                color="warning"
                variant="outlined"
              />
            </Tooltip>
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
                      </Typography>
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
