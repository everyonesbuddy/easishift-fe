// Editable pieces of the facility panel: the facility's details, a person, and a history entry.
import { useState } from "react";
import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { FiEdit2, FiLinkedin, FiMail, FiPhone, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { ClickBadge, RolePill } from "./HqBits";
import { KINDS, ROLE_LABELS, dateInput, errorText, shortDate } from "./hqFormat";


const field = { size: "small", fullWidth: true, sx: { bgcolor: IOS.surface } };

/** Two-step delete: the first tap asks, the second does it. */
export function DeleteButton({ onConfirm, label = "Delete", size = 15 }) {
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <IconButton size="small" aria-label={label} onClick={() => setAsk(true)} sx={{ color: IOS.tertiary, "&:hover": { color: IOS.redText } }}>
        <FiTrash2 size={size} />
      </IconButton>
    );
  }
  return (
    <Box sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}>
      <Button size="small" color="error" variant="contained" disableElevation onClick={onConfirm} sx={{ minWidth: 0, px: 1.25, py: 0.25, fontSize: 12.5 }}>
        {label}?
      </Button>
      <Button size="small" onClick={() => setAsk(false)} sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 12.5 }}>
        No
      </Button>
    </Box>
  );
}

/** The facility's own details. */
export function EditFacility({ facility, stages, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: facility.name || "",
    city: facility.city || "",
    state: facility.state || "",
    group: facility.group || "",
    buildingsInGroup: facility.buildingsInGroup ?? "",
    tier: facility.tier ?? "",
    stage: facility.stage || "",
    frontDeskPhone: facility.frontDeskPhone || "",
    website: facility.website || "",
    currentTool: facility.currentTool || "",
    biggestPain: facility.biggestPain || "",
    notes: facility.notes || "",
    scheduler: { name: "", title: "", email: "", phone: "", ...(facility.scheduler || {}) },
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setS = (k) => (e) => setF({ ...f, scheduler: { ...f.scheduler, [k]: e.target.value } });
  const save = async () => {
    try {
      await api.patch(`/hq/facilities/${facility._id}`, {
        ...f,
        tier: f.tier === "" ? null : Number(f.tier),
        buildingsInGroup: f.buildingsInGroup === "" ? null : Number(f.buildingsInGroup),
      });
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, p: 1.5, bgcolor: IOS.surface, borderRadius: IOS.radius.cell }}>
      <TextField {...field} label="Name" value={f.name} onChange={set("name")} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
      <TextField {...field} label="City" value={f.city} onChange={set("city")} />
      <TextField {...field} label="State" value={f.state} onChange={set("state")} />
      <TextField {...field} label="Group / company" value={f.group} onChange={set("group")} />
      <TextField {...field} label="Buildings in group" type="number" value={f.buildingsInGroup} onChange={set("buildingsInGroup")} />
      <TextField {...field} select label="Tier" value={f.tier} onChange={set("tier")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
        <MenuItem value="">None</MenuItem>
        {[1, 2, 3, 4].map((t) => (
          <MenuItem key={t} value={t}>Tier {t}</MenuItem>
        ))}
      </TextField>
      <TextField {...field} select label="Stage" value={f.stage} onChange={set("stage")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
        <MenuItem value="">None</MenuItem>
        {[...new Set([...stages, f.stage].filter(Boolean))].map((s) => (
          <MenuItem key={s} value={s}>{s}</MenuItem>
        ))}
      </TextField>
      <TextField {...field} label="Front desk phone" value={f.frontDeskPhone} onChange={set("frontDeskPhone")} />
      <TextField {...field} label="Website" value={f.website} onChange={set("website")} />
      <Typography sx={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: IOS.secondary, mt: 0.5 }}>SCHEDULER</Typography>
      <TextField {...field} label="Name" value={f.scheduler.name} onChange={setS("name")} />
      <TextField {...field} label="Title" value={f.scheduler.title} onChange={setS("title")} />
      <TextField {...field} label="Email" value={f.scheduler.email} onChange={setS("email")} />
      <TextField {...field} label="Direct line / ext" value={f.scheduler.phone} onChange={setS("phone")} />
      <TextField {...field} label="Current tool" value={f.currentTool} onChange={set("currentTool")} />
      <TextField {...field} label="Biggest pain" value={f.biggestPain} onChange={set("biggestPain")} />
      <TextField {...field} multiline minRows={2} label="Notes" value={f.notes} onChange={set("notes")} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
      <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
        <Button variant="contained" disableElevation onClick={save} disabled={!f.name.trim()}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
}

/** A person, with edit and delete. */
export function PersonRow({ c, editable = true, onChanged }) {
  const [edit, setEdit] = useState(false);
  const [p, setP] = useState(null);
  const start = () => {
    setP({ name: c.name || "", title: c.title || "", role: c.role || "other", email: c.email || "", phone: c.phone || "", linkedin: c.linkedin || "", notes: c.notes || "" });
    setEdit(true);
  };
  const save = async () => {
    try {
      await api.patch(`/hq/contacts/${c._id}`, p);
      setEdit(false);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/hq/contacts/${c._id}`);
      toast.success(`${c.name || c.email} removed`);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    }
  };
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  if (edit) {
    return (
      <Box sx={{ py: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
        <TextField {...field} label="Name" value={p.name} onChange={set("name")} />
        <TextField {...field} label="Title" value={p.title} onChange={set("title")} />
        <TextField {...field} select label="Role" value={p.role} onChange={set("role")}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField {...field} label="Email" value={p.email} onChange={set("email")} />
        <TextField {...field} label="Phone" value={p.phone} onChange={set("phone")} />
        <TextField {...field} label="LinkedIn URL" value={p.linkedin} onChange={set("linkedin")} />
        <TextField {...field} multiline label="Notes" value={p.notes} onChange={set("notes")} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
        <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
          <Button size="small" variant="contained" disableElevation onClick={save}>Save</Button>
          <Button size="small" onClick={() => setEdit(false)}>Cancel</Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` }, display: "flex", gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{c.name || c.email}</Typography>
          <RolePill role={c.role} />
          {c.facilityName && c.facilityName !== c.name && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{c.facilityName}</Typography>}
        </Box>
        {c.title && <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{c.title}</Typography>}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mt: 0.25 }}>
          {c.email && (
            <Box component="a" href={`mailto:${c.email}`} sx={{ fontSize: 13, color: IOS.blue, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <FiMail size={12} /> {c.email}
            </Box>
          )}
          {c.phone && (
            <Box component="a" href={`tel:${c.phone}`} sx={{ fontSize: 13, color: IOS.blue, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <FiPhone size={12} /> {c.phone}
            </Box>
          )}
          {c.linkedin && (
            <Box component="a" href={c.linkedin} target="_blank" rel="noreferrer" sx={{ fontSize: 13, color: IOS.blue, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <FiLinkedin size={12} /> LinkedIn
            </Box>
          )}
        </Box>
        {c.email && (
          <Box sx={{ mt: 0.25 }}>
            <ClickBadge signal={c.signal} />
          </Box>
        )}
        {c.notes && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.25, whiteSpace: "pre-wrap" }}>{c.notes}</Typography>}
      </Box>
      {editable && c._id && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.25, flexShrink: 0 }}>
          <IconButton size="small" aria-label="Edit" onClick={start} sx={{ color: IOS.tertiary }}>
            <FiEdit2 size={14} />
          </IconButton>
          <DeleteButton onConfirm={remove} label="Remove" size={14} />
        </Box>
      )}
    </Box>
  );
}

/** One history entry, with edit and delete. */
export function HistoryRow({ a, contacts, plays, onChanged }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(null);
  const who = contacts.find((c) => c._id === a.contactId);
  const play = plays.find((p) => p._id === a.playId);
  const start = () => {
    setV({ kind: a.kind, outcome: a.outcome || "", notes: a.notes || "", at: dateInput(a.at), contactId: a.contactId || "", playId: a.playId || "" });
    setEdit(true);
  };
  const save = async () => {
    try {
      await api.patch(`/hq/activities/${a._id}`, { ...v, contactId: v.contactId || null, playId: v.playId || null, at: v.at ? `${v.at}T12:00:00` : undefined });
      setEdit(false);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/hq/activities/${a._id}`);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't delete"));
    }
  };
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  if (edit) {
    return (
      <Box sx={{ py: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
        <TextField {...field} select label="What" value={v.kind} onChange={set("kind")}>
          {KINDS.map(([k, l]) => (
            <MenuItem key={k} value={k}>{l}</MenuItem>
          ))}
        </TextField>
        <TextField {...field} type="date" label="Date" InputLabelProps={{ shrink: true }} value={v.at} onChange={set("at")} />
        <TextField {...field} select label="With" value={v.contactId} onChange={set("contactId")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">Front desk / building</MenuItem>
          {contacts.map((c) => (
            <MenuItem key={c._id} value={c._id}>{c.name || c.email}</MenuItem>
          ))}
        </TextField>
        <TextField {...field} select label="Play" value={v.playId} onChange={set("playId")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">None</MenuItem>
          {plays.filter((p) => p.countsFrom === "activities").map((p) => (
            <MenuItem key={p._id} value={p._id}>{p.title}</MenuItem>
          ))}
        </TextField>
        <TextField {...field} label="Outcome" value={v.outcome} onChange={set("outcome")} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
        <TextField {...field} multiline minRows={2} label="Notes" value={v.notes} onChange={set("notes")} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
        <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
          <Button size="small" variant="contained" disableElevation onClick={save}>Save</Button>
          <Button size="small" onClick={() => setEdit(false)}>Cancel</Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1, display: "flex", gap: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5 }}>
          <Box component="span" sx={{ fontWeight: 700, textTransform: "capitalize" }}>{a.kind}</Box>
          {who ? ` with ${who.name}` : ""}
          {a.outcome ? `: ${a.outcome}` : ""}
        </Typography>
        {a.notes && <Typography sx={{ fontSize: 13, color: IOS.secondary, whiteSpace: "pre-wrap" }}>{a.notes}</Typography>}
        <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>
          {shortDate(a.at)}
          {a.by ? ` · ${a.by}` : ""}
          {play ? ` · ${play.title}` : ""}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.25, flexShrink: 0 }}>
        <IconButton size="small" aria-label="Edit" onClick={start} sx={{ color: IOS.tertiary }}>
          <FiEdit2 size={14} />
        </IconButton>
        <DeleteButton onConfirm={remove} size={14} />
      </Box>
    </Box>
  );
}
