import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  InputBase,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FiTrash2, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { IOS, roleColor } from "../../../theme/ios";
import { roleLabel } from "./laborFormat";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** A grouped list like iOS Settings: rows separated by hairlines. */
const Group = ({ title, footer, children }) => (
  <Box sx={{ mb: 3 }}>
    {title && <Typography sx={{ fontSize: 13, fontWeight: 600, color: IOS.secondary, px: 0.5, mb: 0.75 }}>{title}</Typography>}
    <Box sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.cell, border: `1px solid ${IOS.hairline}`, overflow: "hidden" }}>{children}</Box>
    {footer && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, px: 0.5, mt: 0.75, lineHeight: 1.5 }}>{footer}</Typography>}
  </Box>
);

const Line = ({ children, sx }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, minHeight: 52, "& + &": { borderTop: `1px solid ${IOS.hairline}` }, ...sx }}>
    {children}
  </Box>
);

/** Right-aligned number field inside a row, with an optional prefix/suffix. */
function NumberCell({ value, onChange, prefix, suffix, label, step = 0.25, placeholder = "–", width = 96 }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: IOS.secondary, fontSize: 15 }}>
      {prefix}
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        placeholder={placeholder}
        inputProps={{ step, min: 0, "aria-label": label, style: { textAlign: "right", fontVariantNumeric: "tabular-nums" } }}
        sx={{
          width,
          fontSize: 15,
          fontWeight: 600,
          color: IOS.ink,
          px: 1,
          py: 0.25,
          borderRadius: "8px",
          bgcolor: IOS.canvas,
          "&.Mui-focused": { bgcolor: "#fff", boxShadow: `0 0 0 2px ${IOS.blue}` },
          "& input::-webkit-inner-spin-button": { display: "none" },
        }}
      />
      {suffix}
    </Box>
  );
}

/**
 * Labor settings (owners/admins), as a panel from the right: Pay, Budget and
 * the Monday email. Render only while open.
 */
export default function LaborSettingsDialog({ onClose, onSaved, roles }) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("sm"));
  const [tab, setTab] = useState("pay");
  const [form, setForm] = useState(null);
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([api.get("/labor/settings"), api.get("/staff")])
      .then(([s, st]) => {
        if (!live) return;
        const d = s.data || {};
        setForm({
          rates: Object.fromEntries((d.payRates || []).map((r) => [r.role, String(r.hourlyRate)])),
          staffRates: (d.staffRates || []).map((r) => ({ staffId: String(r.staffId), hourlyRate: String(r.hourlyRate) })),
          overtimeMultiplier: String(d.overtimeMultiplier ?? 1.5),
          budget: d.budgetHoursPerResidentDay ?? "",
          typicalCensus: d.typicalCensus ?? "",
          reportEnabled: d.mondayReport?.enabled !== false,
          recipients: d.mondayReport?.extraRecipients || [],
        });
        setStaff(Array.isArray(st.data) ? st.data : []);
      })
      .catch(() => live && setLoadError("Couldn't load labor settings. Close and try again."));
    return () => {
      live = false;
    };
  }, []);

  const staffById = useMemo(() => new Map(staff.map((s) => [String(s._id), s])), [staff]);
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addRecipient = () => {
    const parts = emailDraft.split(/[,\s;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const bad = parts.find((e) => !isEmail(e));
    if (bad) {
      toast.error(`"${bad}" isn't an email address`, { position: "top-right" });
      return;
    }
    update({ recipients: [...new Set([...form.recipients, ...parts])].slice(0, 10) });
    setEmailDraft("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const pending = emailDraft.trim() && isEmail(emailDraft.trim()) ? [emailDraft.trim().toLowerCase()] : [];
      await api.put("/labor/settings", {
        payRates: roles.map((role) => ({ role, hourlyRate: form.rates[role] ?? "" })),
        staffRates: form.staffRates.filter((r) => r.hourlyRate !== ""),
        overtimeMultiplier: form.overtimeMultiplier,
        budgetHoursPerResidentDay: form.budget === "" ? null : form.budget,
        typicalCensus: form.typicalCensus === "" ? null : form.typicalCensus,
        mondayReport: { enabled: form.reportEnabled, extraRecipients: [...new Set([...form.recipients, ...pending])] },
      });
      toast.success("Labor settings saved", { position: "top-right", autoClose: 2500 });
      onSaved();
    } catch (err) {
      if (err?.response?.status === 402) return;
      toast.error(err?.response?.data?.message || "Couldn't save labor settings", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const res = await api.post("/labor/report/send");
      if (res.data?.sent) toast.success(`Sent to ${res.data.sentTo.join(", ")}`, { position: "top-right", autoClose: 4000 });
      else toast.info("No one to send it to yet. Add an email and save first.", { position: "top-right" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send the email", { position: "top-right" });
    } finally {
      setSending(false);
    }
  };

  const addable = staff.filter((s) => !form?.staffRates.some((r) => r.staffId === String(s._id)));
  const dailyTarget =
    form && form.budget !== "" && form.typicalCensus !== "" ? Math.round(Number(form.budget) * Number(form.typicalCensus) * 10) / 10 : null;

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      PaperProps={{ sx: { width: narrow ? "100%" : 460, bgcolor: IOS.canvas, display: "flex", flexDirection: "column" } }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1, bgcolor: IOS.canvas }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Labor settings</Typography>
          <IconButton aria-label="Close" onClick={onClose} sx={{ bgcolor: IOS.fill }}>
            <FiX />
          </IconButton>
        </Box>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            mt: 1.5,
            minHeight: 36,
            bgcolor: IOS.fill,
            borderRadius: "10px",
            p: "2px",
            "& .MuiTabs-indicator": { height: "100%", borderRadius: "8px", bgcolor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", zIndex: 0 },
            "& .MuiTab-root": { minHeight: 32, py: 0, textTransform: "none", fontWeight: 600, fontSize: 13.5, color: IOS.ink, zIndex: 1 },
            "& .MuiTab-root.Mui-selected": { color: IOS.ink },
          }}
        >
          <Tab value="pay" label="Pay" />
          <Tab value="budget" label="Budget" />
          <Tab value="email" label="Monday email" />
        </Tabs>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pt: 2, pb: 2 }}>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {!form && !loadError && <Typography color="text.secondary">Loading…</Typography>}

        {form && tab === "pay" && (
          <>
            <Group
              title="Hourly rate by role"
              footer="Average pay for each role. Only owners and admins see these. Leave a role blank to leave its hours out of labor cost."
            >
              {!roles.length && (
                <Line>
                  <Typography sx={{ color: IOS.secondary, fontSize: 14 }}>Add roles in Facility Preferences first.</Typography>
                </Line>
              )}
              {roles.map((role) => (
                <Line key={role}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: roleColor(role, roles) }} />
                  <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{roleLabel(role)}</Typography>
                  <NumberCell
                    label={`${roleLabel(role)} hourly rate`}
                    value={form.rates[role] ?? ""}
                    onChange={(v) => update({ rates: { ...form.rates, [role]: v } })}
                    prefix="$"
                    suffix="/h"
                  />
                </Line>
              ))}
            </Group>

            <Group title="Overtime" footer="Hours over the weekly limit are paid at this multiple. 1.5 is time and a half.">
              <Line>
                <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>Overtime pays</Typography>
                <NumberCell label="Overtime multiplier" value={form.overtimeMultiplier} onChange={(v) => update({ overtimeMultiplier: v })} suffix="×" width={64} />
              </Line>
            </Group>

            <Group title="Someone paid differently" footer="Optional. This person's rate replaces their role's rate.">
              {form.staffRates.map((r, i) => (
                <Line key={r.staffId}>
                  <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }} noWrap>
                    {staffById.get(r.staffId)?.name || "Former staff"}
                  </Typography>
                  <NumberCell
                    label="Hourly rate"
                    value={r.hourlyRate}
                    onChange={(v) => update({ staffRates: form.staffRates.map((x, j) => (j === i ? { ...x, hourlyRate: v } : x)) })}
                    prefix="$"
                    suffix="/h"
                  />
                  <IconButton size="small" aria-label="Remove" onClick={() => update({ staffRates: form.staffRates.filter((_, j) => j !== i) })}>
                    <FiTrash2 size={15} />
                  </IconButton>
                </Line>
              ))}
              <Line sx={{ py: 1 }}>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={addable}
                  getOptionLabel={(s) => s.name || ""}
                  value={null}
                  onChange={(_, s) => s && update({ staffRates: [...form.staffRates, { staffId: String(s._id), hourlyRate: "" }] })}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Add a person" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />
                  )}
                />
              </Line>
            </Group>
          </>
        )}

        {form && tab === "budget" && (
          <>
            <Group title="Your building">
              <Line>
                <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>Usual number of residents</Typography>
                <NumberCell label="Usual number of residents" value={form.typicalCensus} onChange={(v) => update({ typicalCensus: v })} step={1} width={80} />
              </Line>
              <Line>
                <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>Target hours per resident day</Typography>
                <NumberCell label="Target hours per resident day" value={form.budget} onChange={(v) => update({ budget: v })} step={0.05} width={80} />
              </Line>
            </Group>
            <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: dailyTarget !== null ? IOS.surface : "transparent", border: dailyTarget !== null ? `1px solid ${IOS.hairline}` : "none" }}>
              {dailyTarget !== null ? (
                <>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {dailyTarget.toLocaleString()} h
                  </Typography>
                  <Typography sx={{ color: IOS.secondary, fontSize: 14 }}>
                    of care staff a day is your budget: {form.typicalCensus} residents × {form.budget} hours. About{" "}
                    {Math.round(dailyTarget * 7).toLocaleString()} h a week.
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: IOS.secondary, fontSize: 13.5, lineHeight: 1.5 }}>
                  Hours per resident day is the standard way to budget care staff: total care hours divided by
                  residents. Enter both numbers to see your daily budget. Update the residents when occupancy changes.
                </Typography>
              )}
            </Box>
          </>
        )}

        {form && tab === "email" && (
          <>
            <Group footer="Every Monday at 7 a.m.: last week's hours, budget, cost, call-outs and open shifts, plus who's heading into overtime, certifications expiring and who to check in with.">
              <Line>
                <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>Send the Monday labor email</Typography>
                <Switch checked={form.reportEnabled} onChange={(e) => update({ reportEnabled: e.target.checked })} inputProps={{ "aria-label": "Send the Monday labor email" }} />
              </Line>
            </Group>

            <Group
              title="Who gets it"
              footer="Owners and admins always get it. Add others, like your regional VP, up to 10. They don't need a login, and they'll see labor cost."
            >
              {form.recipients.length > 0 && (
                <Line sx={{ flexWrap: "wrap", gap: 0.75, py: 1.25 }}>
                  {form.recipients.map((e) => (
                    <Chip key={e} label={e} onDelete={() => update({ recipients: form.recipients.filter((x) => x !== e) })} sx={{ fontWeight: 500 }} />
                  ))}
                </Line>
              )}
              <Line>
                <InputBase
                  fullWidth
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                  placeholder="name@company.com"
                  inputProps={{ "aria-label": "Add an email" }}
                  sx={{ fontSize: 15 }}
                />
                <Button size="small" onClick={addRecipient} disabled={!emailDraft.trim() || form.recipients.length >= 10} sx={{ fontWeight: 600 }}>
                  Add
                </Button>
              </Line>
            </Group>

            <Button onClick={sendNow} disabled={sending} sx={{ fontWeight: 600, px: 0.5 }}>
              {sending ? "Sending…" : "Send this week's email now"}
            </Button>
            <Typography sx={{ fontSize: 12.5, color: IOS.secondary, px: 0.5 }}>Uses your saved settings.</Typography>
          </>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", px: 2.5, py: 1.75, borderTop: `1px solid ${IOS.separator}`, bgcolor: "rgba(245,245,247,0.94)", backdropFilter: "blur(12px)" }}>
        <Button onClick={onClose} sx={{ borderRadius: "10px", fontWeight: 600, color: IOS.ink }}>
          Cancel
        </Button>
        <Button variant="contained" disableElevation disabled={!form || saving} onClick={save} sx={{ borderRadius: "10px", bgcolor: IOS.blue, px: 3, fontWeight: 600 }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </Drawer>
  );
}
