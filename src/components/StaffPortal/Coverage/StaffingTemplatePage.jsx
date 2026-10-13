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
import { IOS } from "../../../theme/ios";

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
    <Container sx={{ mt: 4, mb: 6 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Box>
          <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: IOS.ink }}>Weekly Needs</Typography>
          <Typography sx={{ color: IOS.secondary, maxWidth: 720 }}>
            How many people each shift needs on a normal week. Each new week's
            open slots are filled in from this; change a single day on the
            schedule when a week is different.
          </Typography>
        </Box>
        <Button onClick={() => navigate("/schedule")} sx={{ bgcolor: IOS.fill, color: IOS.ink, borderRadius: "10px", px: 2, "&:hover": { bgcolor: "rgba(118,118,128,0.2)" } }}>
          Back to schedule
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
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
      </Box>

      {canEdit && rules !== null && (
        <Paper elevation={0} sx={{ mt: 2, p: { xs: 2, md: 3 }, borderRadius: IOS.radius.card, boxShadow: IOS.shadow, border: `1px solid ${IOS.hairline}` }}>
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
              disableElevation
              sx={{ borderRadius: "10px", px: 3, bgcolor: IOS.blue, "&.Mui-disabled": { bgcolor: IOS.fill, color: IOS.tertiary } }}
            >
              {saving ? "Saving…" : "Save weekly needs"}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
