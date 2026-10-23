import { useEffect, useMemo, useState } from "react";
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
import DescribeNeeds from "./DescribeNeeds";
import { IOS } from "../../../theme/ios";
import ViewFilter from "../Schedule/ViewFilter";
import useViewFilter from "../../../hooks/useViewFilter";
import { withFilterOptions } from "../Schedule/sectionUtils";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";
import { tagKey } from "../../../utils/tags";

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
  // Bumped after "Describe your week" fills the table, so the editor
  // re-picks weekday/weekend vs each-day columns for the new numbers.
  const [editorKey, setEditorKey] = useState(0);
  // Roles / areas this scheduler chose to see (saved on their account).
  const [filter, setFilter] = useViewFilter("needs");

  const filterOptions = useMemo(() => {
    const roles = new Map();
    const areas = new Map();
    for (const r of facilityPreferences?.roleFamilies || []) roles.set(tagKey(r), r);
    for (const a of facilityPreferences?.unitAreas || []) areas.set(tagKey(a), a);
    for (const rule of rules || []) {
      if (rule.role) roles.set(tagKey(rule.role), rule.role);
      if (rule.unitArea) areas.set(tagKey(rule.unitArea), rule.unitArea);
    }
    const sorted = (m, label) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, raw]) => ({ key, label: label(raw) }));
    return withFilterOptions({ roles: sorted(roles, getRoleDisplayName), areas: sorted(areas, toLabel) }, filter);
  }, [facilityPreferences, rules, filter]);
  const shownCount = (rules || []).filter(
    (rule) =>
      (!filter.roles.length || filter.roles.includes(tagKey(rule.role))) &&
      (!filter.areas.length || filter.areas.includes(tagKey(rule.unitArea))),
  ).length;

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

      {canEdit && rules !== null && (
        <Box sx={{ mt: 3 }}>
          <DescribeNeeds
            rules={rules}
            onRules={(next) => {
              setRules(next);
              setDirty(true);
              setEditorKey((k) => k + 1);
            }}
          />
        </Box>
      )}

      {rules !== null && (
        <Box sx={{ mt: canEdit ? 0 : 3 }}>
          <ViewFilter
            value={filter}
            onChange={setFilter}
            options={filterOptions}
            shownText={`${shownCount} of ${rules.length} rows · hidden rows are kept when you save`}
          />
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        {rules === null ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <StaffingTemplateEditor
            key={editorKey}
            rules={rules}
            onChange={(next) => {
              setRules(next);
              setDirty(true);
            }}
            facilityPreferences={facilityPreferences}
            disabled={!canEdit}
            filter={filter}
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
