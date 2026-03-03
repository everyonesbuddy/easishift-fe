import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MdAdd, MdRemove } from "react-icons/md";
import { toast } from "react-toastify";
import api from "../../../config/api";

const ROLE_LABELS = {
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

export default function CoverageEditCountForm({
  coverage,
  onClose,
  onSuccess,
}) {
  const [requiredCount, setRequiredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRequiredCount(Number(coverage?.requiredCount) || 0);
    setError("");
  }, [coverage]);

  const originalCount = useMemo(
    () => Number(coverage?.requiredCount) || 0,
    [coverage],
  );

  const delta = requiredCount - originalCount;

  const setAdjustedCount = (change) => {
    setRequiredCount((prev) => Math.max(0, Number(prev) + change));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const nextCount = Number(requiredCount);

    if (!Number.isFinite(nextCount) || nextCount < 0) {
      setError("Required count must be 0 or greater.");
      return;
    }

    if (!coverage?._id) {
      setError("Coverage record not found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.put(`/coverage/${coverage._id}`, {
        requiredCount: nextCount,
      });

      toast.success("Coverage requirement updated.");
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update coverage.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Coverage Count
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {ROLE_LABELS[coverage?.role] || coverage?.role || "Role"} • adjust
            required staff
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Current Count"
            value={originalCount}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="New Count"
            type="number"
            value={requiredCount}
            onChange={(e) =>
              setRequiredCount(Math.max(0, Number(e.target.value) || 0))
            }
            inputProps={{ min: 0 }}
            fullWidth
            required
          />
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            type="button"
            variant="outlined"
            startIcon={<MdRemove size={18} />}
            onClick={() => setAdjustedCount(-1)}
            disabled={loading || requiredCount <= 0}
            sx={{ textTransform: "none" }}
          >
            Subtract 1
          </Button>
          <Button
            type="button"
            variant="outlined"
            startIcon={<MdAdd size={18} />}
            onClick={() => setAdjustedCount(1)}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Add 1
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
            <Typography
              variant="body2"
              color={delta === 0 ? "text.secondary" : "primary.main"}
              sx={{ fontWeight: 600 }}
            >
              {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta}`}
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            fullWidth
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading ? "Saving..." : "Save Count"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
