import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import StaffingTemplateEditor from "../Setup/StaffingTemplateEditor";

/**
 * "What a normal week needs": how many of each role on each shift, by day.
 * Every new week's open slots come from this.
 */
export default function StaffingTemplatePage() {
  const { facilityPreferences, can } = useAuth();
  const navigate = useNavigate();
  const canEdit = can("coverage.manage");
  const [rules, setRules] = useState(null);
  const [applyTo, setApplyTo] = useState("unpublished");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api
      .get("/staffing-template")
      .then((res) => setRules(res.data?.rules || []))
      .catch((err) => {
        console.error("Failed to load staffing template", err);
        setRules([]);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/staffing-template", { rules, applyTo });
      const updated = res.data?.weeksUpdated || 0;
      toast.success(
        updated
          ? `Saved. Updated ${updated} upcoming week${updated === 1 ? "" : "s"}.`
          : "Saved. New weeks will use this.",
        { position: "top-right", autoClose: 3000 },
      );
      setDirty(false);
    } catch (err) {
      // Plan answers (402) are shown by the upgrade dialog.
      if (err?.response?.status === 402) return;
      toast.error(err?.response?.data?.message || "Couldn't save", {
        position: "top-right",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5">Weekly Needs</Typography>
          <Typography color="text.secondary">
            How many people each shift needs on a normal week. Each new week's
            open slots are filled in from this; change a single day on the
            schedule when a week is different.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate("/schedule")} sx={{ textTransform: "none" }}>
          Back to schedule
        </Button>
      </Box>

      <Paper sx={{ mt: 3, p: { xs: 2, md: 3 } }}>
        {rules === null ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <StaffingTemplateEditor
            rules={rules}
            onChange={(next) => {
              setRules(next);
              setDirty(true);
            }}
            facilityPreferences={facilityPreferences}
            disabled={!canEdit}
          />
        )}
      </Paper>

      {canEdit && rules !== null && (
        <Paper sx={{ mt: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Apply changes to</Typography>
          <RadioGroup value={applyTo} onChange={(e) => setApplyTo(e.target.value)}>
            <FormControlLabel
              value="unpublished"
              control={<Radio />}
              label="New and unpublished weeks (recommended)"
            />
            <FormControlLabel
              value="all_future"
              control={<Radio />}
              label="All upcoming weeks, including ones already published"
            />
          </RadioGroup>
          {applyTo === "all_future" && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Days you've changed by hand on the schedule are left alone.
            </Alert>
          )}
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              disabled={saving || !dirty}
              onClick={save}
              sx={{ textTransform: "none", borderRadius: 2, px: 3 }}
            >
              {saving ? "Saving…" : "Save weekly needs"}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
