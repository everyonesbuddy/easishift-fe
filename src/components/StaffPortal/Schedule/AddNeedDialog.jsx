import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { GRID, slotLabel, titleCase } from "./weekGridUtils";

const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Add a need for one day only (an extra caregiver Friday, a census spike).
 * It's kept when Weekly Needs changes later.
 */
export default function AddNeedDialog({ open, initial, weekStart, days, onClose, onAdded }) {
  const { facilityPreferences: prefs } = useAuth();
  const slots = useMemo(
    () =>
      (prefs?.shiftTypeDefinitions || []).flatMap((def) =>
        (def.timeSlots || []).map((slot) => ({
          value: `${def.key}:${slot.tag}`,
          shiftType: def.key,
          shiftTag: slot.tag,
          label: `${slotLabel(prefs, def.key, slot.tag).name} ${slotLabel(prefs, def.key, slot.tag).time}`,
        })),
      ),
    [prefs],
  );
  const [form, setForm] = useState({ date: "", slot: "", role: "", unitArea: "", certs: [], count: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      date: initial?.date || days?.[0] || "",
      slot: initial?.shiftType ? `${initial.shiftType}:${initial.shiftTag}` : slots[0]?.value || "",
      role: initial?.role || prefs?.roleFamilies?.[0] || "",
      unitArea: initial?.unitArea || "",
      certs: [],
      count: 1,
    });
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    const slot = slots.find((s) => s.value === form.slot);
    if (!slot || !form.role || !form.date) return;
    setSaving(true);
    try {
      await api.post(`/weeks/${weekStart}/slots`, {
        date: form.date,
        shiftType: slot.shiftType,
        shiftTag: slot.shiftTag,
        role: form.role,
        unitArea: form.unitArea || null,
        requiredCertificationTags: form.certs,
        count: Number(form.count) || 1,
      });
      toast.success("Need added for that day", { autoClose: 2000 });
      onAdded?.();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(err?.response?.data?.message || "Couldn't add the need");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Add a need for one day</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: GRID.muted, mb: 2, fontSize: 14 }}>
          For a one-off, like an extra caregiver on Friday. To change every week, edit Weekly Needs.
        </Typography>
        <Stack spacing={2}>
          <TextField select label="Day" value={form.date} onChange={set("date")} size="small">
            {(days || []).map((day) => (
              <MenuItem key={day} value={day}>
                {keyToDate(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Shift" value={form.slot} onChange={set("slot")} size="small">
            {slots.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField select label="Role" value={form.role} onChange={set("role")} size="small" sx={{ flex: 1 }}>
              {(prefs?.roleFamilies || []).map((role) => (
                <MenuItem key={role} value={role}>
                  {getRoleDisplayName(role)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="How many"
              type="number"
              size="small"
              value={form.count}
              onChange={set("count")}
              inputProps={{ min: 1, max: 50 }}
              sx={{ width: 110 }}
            />
          </Stack>
          {(prefs?.unitAreas || []).length > 0 && (
            <TextField select label="Unit area (optional)" value={form.unitArea} onChange={set("unitArea")} size="small">
              <MenuItem value="">Any area</MenuItem>
              {prefs.unitAreas.map((area) => (
                <MenuItem key={area} value={String(area).toLowerCase()}>
                  {titleCase(area)}
                </MenuItem>
              ))}
            </TextField>
          )}
          {(prefs?.certificationTags || []).length > 0 && (
            <TextField
              select
              label="Required certifications (optional)"
              value={form.certs}
              onChange={(e) => setForm((f) => ({ ...f, certs: e.target.value }))}
              size="small"
              SelectProps={{
                multiple: true,
                renderValue: (selected) => (
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                    {selected.map((c) => (
                      <Chip key={c} size="small" label={titleCase(c)} />
                    ))}
                  </Stack>
                ),
              }}
            >
              {prefs.certificationTags.map((tag) => (
                <MenuItem key={tag} value={String(tag).toLowerCase()}>
                  {titleCase(tag)}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.slot || !form.role} onClick={save} sx={{ textTransform: "none", fontWeight: 700 }}>
          {saving ? "Adding…" : "Add need"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
