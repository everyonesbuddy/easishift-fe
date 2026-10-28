import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { IOS } from "../../../theme/ios";
import { roleLabel } from "./laborFormat";

const Section = ({ title, hint, children }) => (
  <Box sx={{ py: 2, "& + &": { borderTop: `1px solid ${IOS.separator}` } }}>
    <Typography sx={{ fontWeight: 700, color: IOS.ink }}>{title}</Typography>
    {hint && <Typography sx={{ color: IOS.secondary, fontSize: 13, mb: 1.5 }}>{hint}</Typography>}
    {children}
  </Box>
);

const dollarProps = {
  startAdornment: <InputAdornment position="start">$</InputAdornment>,
  endAdornment: <InputAdornment position="end">/h</InputAdornment>,
};

/**
 * Labor settings (owners/admins): pay rates, budget, usual residents and the
 * Monday email. Render only while open.
 */
export default function LaborSettingsDialog({ onClose, onSaved, roles }) {
  const [form, setForm] = useState(null);
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([api.get("/labor/settings"), api.get("/staff")])
      .then(([s, st]) => {
        if (!live) return;
        const d = s.data || {};
        const rates = Object.fromEntries((d.payRates || []).map((r) => [r.role, String(r.hourlyRate)]));
        setForm({
          rates,
          staffRates: (d.staffRates || []).map((r) => ({ staffId: String(r.staffId), hourlyRate: String(r.hourlyRate) })),
          overtimeMultiplier: String(d.overtimeMultiplier ?? 1.5),
          budget: d.budgetHoursPerResidentDay ?? "",
          typicalCensus: d.typicalCensus ?? "",
          reportEnabled: d.mondayReport?.enabled !== false,
          extraRecipients: (d.mondayReport?.extraRecipients || []).join(", "),
        });
        setStaff(Array.isArray(st.data) ? st.data : []);
      })
      .catch(() => live && toast.error("Couldn't load labor settings"));
    return () => {
      live = false;
    };
  }, []);

  const staffById = useMemo(() => new Map(staff.map((s) => [String(s._id), s])), [staff]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/labor/settings", {
        payRates: roles.map((role) => ({ role, hourlyRate: form.rates[role] ?? "" })),
        staffRates: form.staffRates.filter((r) => r.hourlyRate !== ""),
        overtimeMultiplier: form.overtimeMultiplier,
        budgetHoursPerResidentDay: form.budget === "" ? null : form.budget,
        typicalCensus: form.typicalCensus === "" ? null : form.typicalCensus,
        mondayReport: {
          enabled: form.reportEnabled,
          extraRecipients: form.extraRecipients.split(/[,\s;]+/).map((e) => e.trim()).filter(Boolean),
        },
      });
      toast.success("Labor settings saved", { position: "top-right", autoClose: 2500 });
      onSaved();
    } catch (err) {
      if (err?.response?.status === 402) return;
      toast.error(err?.response?.data?.message || "Couldn't save", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const res = await api.post("/labor/report/send");
      if (res.data?.sent) {
        toast.success(`Sent to ${res.data.sentTo.join(", ")}`, { position: "top-right", autoClose: 4000 });
      } else {
        toast.info("No one to send it to yet: add an email above or invite an admin.", { position: "top-right" });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send", { position: "top-right" });
    } finally {
      setSending(false);
    }
  };

  const addable = staff.filter((s) => !form?.staffRates.some((r) => r.staffId === String(s._id)));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Labor settings</DialogTitle>
      <DialogContent dividers>
        {!form ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <>
            <Section title="Pay rates" hint="Average hourly pay for each role. Turns hours into dollars on the Labor page and in the Monday email. Only owners and admins see these.">
              {!roles.length && <Alert severity="info">Add your roles in Facility Preferences first.</Alert>}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                {roles.map((role) => (
                  <TextField
                    key={role}
                    size="small"
                    label={roleLabel(role)}
                    type="number"
                    value={form.rates[role] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, rates: { ...f.rates, [role]: e.target.value } }))}
                    InputProps={dollarProps}
                    inputProps={{ min: 0, max: 500, step: 0.25 }}
                  />
                ))}
              </Box>
              <TextField
                size="small"
                label="Overtime pays"
                type="number"
                value={form.overtimeMultiplier}
                onChange={set("overtimeMultiplier")}
                InputProps={{ endAdornment: <InputAdornment position="end">× the hourly rate</InputAdornment> }}
                inputProps={{ min: 1, max: 3, step: 0.25 }}
                sx={{ mt: 1.5, width: 260 }}
              />
            </Section>

            <Section title="Different rate for one person" hint="Optional: when someone is paid differently from their role's rate.">
              <Stack spacing={1}>
                {form.staffRates.map((r, i) => (
                  <Box key={r.staffId} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography sx={{ flex: 1, fontSize: 14 }}>{staffById.get(r.staffId)?.name || "Former staff"}</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={r.hourlyRate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, staffRates: f.staffRates.map((x, j) => (j === i ? { ...x, hourlyRate: e.target.value } : x)) }))
                      }
                      InputProps={dollarProps}
                      inputProps={{ min: 0, max: 500, step: 0.25, "aria-label": "Hourly rate" }}
                      sx={{ width: 150 }}
                    />
                    <IconButton
                      size="small"
                      aria-label="Remove"
                      onClick={() => setForm((f) => ({ ...f, staffRates: f.staffRates.filter((_, j) => j !== i) }))}
                    >
                      <FiTrash2 size={15} />
                    </IconButton>
                  </Box>
                ))}
                <Autocomplete
                  size="small"
                  options={addable}
                  getOptionLabel={(s) => s.name || ""}
                  value={null}
                  onChange={(_, s) => s && setForm((f) => ({ ...f, staffRates: [...f.staffRates, { staffId: String(s._id), hourlyRate: "" }] }))}
                  renderInput={(params) => <TextField {...params} placeholder="Add a person…" />}
                  sx={{ maxWidth: 320 }}
                />
              </Stack>
            </Section>

            <Section title="Budget" hint="Care hours per resident day (PPD) you aim for, and how many residents you usually have. Update the number of residents when it changes.">
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  label="Target hours per resident day"
                  type="number"
                  value={form.budget}
                  onChange={set("budget")}
                  inputProps={{ min: 0, max: 24, step: 0.05 }}
                  sx={{ width: 240 }}
                />
                <TextField
                  size="small"
                  label="Usual number of residents"
                  type="number"
                  value={form.typicalCensus}
                  onChange={set("typicalCensus")}
                  inputProps={{ min: 0, max: 5000, step: 1 }}
                  sx={{ width: 220 }}
                />
              </Box>
            </Section>

            <Section title="Monday labor email" hint="Every Monday at 7 a.m., owners and admins get last week's labor on one page: hours, budget, cost, overtime coming, call-outs, credentials and who to watch.">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch checked={form.reportEnabled} onChange={(e) => setForm((f) => ({ ...f, reportEnabled: e.target.checked }))} />
                <Typography sx={{ fontSize: 14 }}>{form.reportEnabled ? "On" : "Off"}</Typography>
              </Box>
              <TextField
                size="small"
                fullWidth
                label="Also send to (e.g. your regional VP)"
                placeholder="vp@company.com, don@company.com"
                value={form.extraRecipients}
                onChange={set("extraRecipients")}
                helperText="Up to 10 emails, separated by commas. They don't need a login."
                sx={{ mt: 1 }}
              />
              <Button size="small" onClick={sendNow} disabled={sending} sx={{ mt: 1, fontWeight: 600 }}>
                {sending ? "Sending…" : "Send this week's email now"}
              </Button>
            </Section>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!form || saving}
          onClick={save}
          sx={{ borderRadius: "10px", bgcolor: IOS.blue }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
