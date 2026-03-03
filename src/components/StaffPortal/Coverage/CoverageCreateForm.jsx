import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Alert,
  Paper,
  Stack,
  IconButton,
  Divider,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  MdAdd,
  MdDelete,
  MdAccessTime,
  MdGroups2,
  MdEvent,
} from "react-icons/md";
import api from "../../../config/api";
import { toast } from "react-toastify";

const roles = [
  "doctor",
  "nurse",
  "rn",
  "lpn",
  "cna",
  "med_aide",
  "caregiver",
  "activity_aide",
  "dietary_aide",
  "housekeeper",
  "receptionist",
  "billing",
  "staff",
  "other",
];

const roleLabels = {
  doctor: "Doctor",
  nurse: "Nurse",
  rn: "RN",
  lpn: "LPN",
  cna: "CNA",
  med_aide: "Med Aide",
  caregiver: "Caregiver",
  activity_aide: "Activity Aide",
  dietary_aide: "Dietary Aide",
  housekeeper: "Housekeeper",
  receptionist: "Receptionist",
  billing: "Billing",
  staff: "Staff",
  other: "Other",
};

// Convert local date "2025-12-02" and time "08:00" → UTC ISO string
function toUTC(dateStr, timeStr) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return new Date(local.toISOString()); // guaranteed UTC
}

export default function CoverageCreateForm({ tenantId, onSuccess, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [requirements, setRequirements] = useState([
    {
      role: "",
      requiredCount: 1,
      startTime: "09:00",
      endTime: "17:00",
    },
  ]);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("create");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e, autoGenerate = false) => {
    if (e) e.preventDefault();

    if (!date || requirements.length === 0) {
      setError("Please select a date and at least one coverage requirement.");
      toast.error(
        "Please select a date and at least one coverage requirement.",
      );
      return;
    }

    for (let index = 0; index < requirements.length; index += 1) {
      const req = requirements[index];
      if (!req.role || !req.startTime || !req.endTime) {
        const msg = `Requirement ${index + 1} must include role, start time, and end time.`;
        setError(msg);
        toast.error(msg);
        return;
      }

      const startUTC = toUTC(date, req.startTime);
      const endUTC = toUTC(date, req.endTime);

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
      const shifts = requirements.map((req) => ({
        role: req.role,
        requiredCount: Number(req.requiredCount) || 0,
        startTime: toUTC(date, req.startTime),
        endTime: toUTC(date, req.endTime),
        note,
      }));

      const createRes = await api.post("/coverage", {
        tenantId,
        dates: [date],
        shifts,
      });

      let generatedCount = 0;
      if (autoGenerate) {
        const created = Array.isArray(createRes.data)
          ? createRes.data
          : Array.isArray(createRes.data?.created)
            ? createRes.data.created
            : [];

        const coverageIds = created.map((item) => item?._id).filter(Boolean);

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
      setRequirements([
        {
          role: "",
          requiredCount: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      ]);
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
    setRequirements((prev) => [
      ...prev,
      {
        role: "",
        requiredCount: 1,
        startTime: "09:00",
        endTime: "17:00",
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
        p: { xs: 2, sm: 3 },
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
      <Box sx={{ mb: 2.5, pr: onClose ? 5 : 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Add Coverage Requirements
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Define role, count, and shift window for each requirement.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="Select the day for these coverage requirements"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdEvent size={18} />
              </InputAdornment>
            ),
          }}
          required
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mt: 1,
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
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            Add Requirement
          </Button>
        </Box>

        <Stack spacing={2}>
          {requirements.map((req, index) => (
            <Paper
              key={`req-${index}`}
              variant="outlined"
              sx={{
                p: 2,
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
                    {roles.map((r) => (
                      <MenuItem key={r} value={r}>
                        {roleLabels[r] || r}
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
