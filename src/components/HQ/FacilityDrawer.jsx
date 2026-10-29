import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Drawer, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { FiEdit2, FiExternalLink, FiPhone, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Tag } from "./HqBits";
import { KINDS, ROLE_LABELS, ago, dateInput, errorText, shortDate } from "./hqFormat";
import { DeleteButton, EditFacility, HistoryRow, PersonRow } from "./FacilityParts";
import usePlaybookPlays from "./usePlaybookPlays";

const STAGES = [
  "Trying (no answer / voicemail)",
  "Got scheduler name",
  "Spoke: sending photo",
  "Photo sent",
  "Demo booked",
  "Published ✓",
  "Not interested",
  "Uses other software",
  "Wrong number / closed",
  "Already a customer",
];

const Label = ({ children }) => (
  <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.04em", mt: 2.5, mb: 0.75 }}>
    {children}
  </Typography>
);

/** One facility: where it stands, the people there, what we've done, and logging the next touch. */
export default function FacilityDrawer({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [log, setLog] = useState({ kind: "call", outcome: "", notes: "", contactId: "", playId: "", stage: "", nextStep: "", nextDate: "" });
  const [editing, setEditing] = useState(false);
  const plays = usePlaybookPlays();
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState({ name: "", title: "", email: "", phone: "" });

  const load = useCallback(() => {
    if (!id) return;
    api
      .get(`/hq/facilities/${id}`)
      .then((res) => {
        setD(res.data);
        setError("");
        const f = res.data.facility;
        setLog((l) => ({ ...l, stage: f.stage || "", nextStep: f.nextStep || "", nextDate: dateInput(f.nextDate) }));
      })
      .catch((err) => setError(errorText(err, "Couldn't load this facility")));
  }, [id]);

  useEffect(() => {
    setD(null);
    load();
  }, [load]);

  const saveLog = async () => {
    setSaving(true);
    try {
      await api.post("/hq/activities", {
        facilityId: id,
        contactId: log.contactId || null,
        playId: log.playId || null,
        kind: log.kind,
        outcome: log.outcome,
        notes: log.notes,
        stage: log.stage || undefined,
        nextStep: log.nextStep,
        nextDate: log.nextDate || null,
      });
      toast.success("Logged");
      setLog((l) => ({ ...l, outcome: "", notes: "" }));
      load();
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const addPerson = async () => {
    try {
      await api.post("/hq/contacts", { ...person, facilityId: id, facilityName: d.facility.name, group: d.facility.group });
      setPerson({ name: "", title: "", email: "", phone: "" });
      setAdding(false);
      load();
    } catch (err) {
      toast.error(errorText(err, "Couldn't add"));
    }
  };

  const removeFacility = async () => {
    try {
      await api.delete(`/hq/facilities/${id}`);
      toast.success("Facility removed");
      onChanged?.();
      onClose();
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    }
  };
  const changed = () => {
    load();
    onChanged?.();
  };

  const f = d?.facility;
  const w = d?.workspace;
  const field = { size: "small", fullWidth: true, sx: { bgcolor: IOS.surface } };

  return (
    <Drawer
      anchor="right"
      open={Boolean(id)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, bgcolor: IOS.canvas, borderTopLeftRadius: { sm: 20 }, borderBottomLeftRadius: { sm: 20 } } }}
    >
      <Box sx={{ p: 2.5, pb: 2, bgcolor: IOS.surface, borderBottom: `1px solid ${IOS.separator}`, display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: IOS.secondary, fontSize: 13 }}>
            {f ? [f.group, [f.city, f.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Facility" : "Facility"}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>{f?.name || "…"}</Typography>
          {f && (
            <Box sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
              {f.tenantId && <Tag color={IOS.green}>Customer</Tag>}
              {f.tier && <Tag color={IOS.blue}>Tier {f.tier}</Tag>}
              {f.stage && <Tag>{f.stage}</Tag>}
              {f.buildingsInGroup > 1 && <Tag color="#FF2D55">{f.buildingsInGroup} buildings in group</Tag>}
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignSelf: "flex-start", alignItems: "center" }}>
          {f && !editing && (
            <IconButton onClick={() => setEditing(true)} aria-label="Edit facility" size="small" sx={{ color: IOS.secondary }}>
              <FiEdit2 size={16} />
            </IconButton>
          )}
          {f && !f.tenantId && <DeleteButton onConfirm={removeFacility} label="Remove facility" size={16} />}
          <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ bgcolor: IOS.fill, color: IOS.secondary }}>
            <FiX />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto" }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!d && !error && <CircularProgress size={22} />}
        {d && editing && (
          <EditFacility
            facility={f}
            stages={STAGES}
            onSaved={() => {
              setEditing(false);
              changed();
            }}
            onCancel={() => setEditing(false)}
          />
        )}
        {d && !editing && (
          <>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", fontSize: 13.5 }}>
              {f.frontDeskPhone && (
                <Box component="a" href={`tel:${f.frontDeskPhone}`} sx={{ color: IOS.blue, display: "inline-flex", gap: 0.5, alignItems: "center" }}>
                  <FiPhone size={13} /> Front desk {f.frontDeskPhone}
                </Box>
              )}
              {f.website && (
                <Box component="a" href={f.website} target="_blank" rel="noreferrer" sx={{ color: IOS.blue, display: "inline-flex", gap: 0.5, alignItems: "center" }}>
                  <FiExternalLink size={13} /> Website
                </Box>
              )}
            </Box>
            {(f.whyTier || f.currentTool || f.biggestPain) && (
              <Typography sx={{ fontSize: 13.5, color: IOS.secondary, mt: 1 }}>
                {[f.whyTier, f.currentTool && `Uses: ${f.currentTool}`, f.biggestPain && `Pain: ${f.biggestPain}`].filter(Boolean).join(" · ")}
              </Typography>
            )}

            {w && (
              <>
                <Label>Their WiserShifts</Label>
                <Box sx={{ p: 1.5, bgcolor: IOS.surface, borderRadius: IOS.radius.cell, fontSize: 13.5 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {w.active ? "Active" : w.setupDone ? "Quiet" : "Hasn't finished setup"} · {w.paid ? "Paying" : w.trialDaysLeft !== null ? `Trial, ${w.trialDaysLeft} days left` : "Free"}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
                    Signed up {shortDate(w.createdAt)}
                    {w.signupRole ? ` by a ${ROLE_LABELS[w.signupRole] || w.signupRole}` : ""} · last seen {ago(w.lastActiveAt)} · {w.staffCount} staff · {w.shifts14} shifts in 2 weeks
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: w.leadershipReached ? IOS.greenText : IOS.orangeText, fontWeight: 600, mt: 0.25 }}>
                    {w.leadershipReached ? "Leadership sees the labor numbers" : "No one in leadership is on it yet"}
                  </Typography>
                </Box>
              </>
            )}

            {(f.scheduler?.name || f.scheduler?.email) && (
              <>
                <Label>Scheduler</Label>
                <PersonRow c={{ ...f.scheduler, role: "scheduler" }} editable={false} />
              </>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>People here</Label>
              <Button size="small" onClick={() => setAdding((a) => !a)} sx={{ mt: 1.5 }}>
                {adding ? "Cancel" : "Add person"}
              </Button>
            </Box>
            {adding && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
                <TextField {...field} label="Name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
                <TextField {...field} label="Title" value={person.title} onChange={(e) => setPerson({ ...person, title: e.target.value })} />
                <TextField {...field} label="Email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                <TextField {...field} label="Phone" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                <Button variant="contained" disableElevation onClick={addPerson} disabled={!person.name && !person.email} sx={{ gridColumn: "1 / -1" }}>
                  Add
                </Button>
              </Box>
            )}
            <Box sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.cell, px: 1.5 }}>
              {d.contacts.length ? d.contacts.map((c) => <PersonRow key={c._id} c={c} onChanged={changed} />) : <Empty>No one yet.</Empty>}
            </Box>

            {d.groupContacts.length > 0 && (
              <>
                <Label>Elsewhere in {f.group}</Label>
                <Box sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.cell, px: 1.5 }}>
                  {d.groupContacts.slice(0, 12).map((c) => <PersonRow key={c._id} c={c} onChanged={changed} />)}
                </Box>
              </>
            )}

            <Label>Log a touch</Label>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <TextField {...field} select label="What" value={log.kind} onChange={(e) => setLog({ ...log, kind: e.target.value })}>
                {KINDS.map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
              <TextField {...field} select label="With" value={log.contactId} onChange={(e) => setLog({ ...log, contactId: e.target.value })} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                <MenuItem value="">Front desk / building</MenuItem>
                {d.contacts.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.name || c.email}</MenuItem>
                ))}
              </TextField>
              <TextField {...field} select label="Play (for the scoreboard)" value={log.playId} onChange={(e) => setLog({ ...log, playId: e.target.value })} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} sx={{ ...field.sx, gridColumn: "1 / -1" }}>
                <MenuItem value="">None</MenuItem>
                {plays.filter((p) => p.countsFrom === "activities").map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.title}</MenuItem>
                ))}
              </TextField>
              <TextField {...field} label="Outcome" placeholder="Voicemail, spoke, booked demo…" value={log.outcome} onChange={(e) => setLog({ ...log, outcome: e.target.value })} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
              <TextField {...field} multiline minRows={2} label="Notes" value={log.notes} onChange={(e) => setLog({ ...log, notes: e.target.value })} sx={{ ...field.sx, gridColumn: "1 / -1" }} />
              <TextField {...field} select label="Stage" value={log.stage} onChange={(e) => setLog({ ...log, stage: e.target.value })} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} sx={{ ...field.sx, gridColumn: "1 / -1" }}>
                <MenuItem value="">(no change)</MenuItem>
                {[...new Set([...STAGES, f.stage].filter(Boolean))].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField {...field} label="Next step" value={log.nextStep} onChange={(e) => setLog({ ...log, nextStep: e.target.value })} />
              <TextField {...field} type="date" label="Next date" InputLabelProps={{ shrink: true }} value={log.nextDate} onChange={(e) => setLog({ ...log, nextDate: e.target.value })} />
              <Button variant="contained" disableElevation onClick={saveLog} disabled={saving} sx={{ gridColumn: "1 / -1", borderRadius: IOS.radius.round, fontWeight: 600 }}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </Box>

            <Label>History</Label>
            <Box sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.cell, px: 1.5 }}>
              {d.activities.length ? (
                d.activities.map((a) => <HistoryRow key={a._id} a={a} contacts={d.contacts} plays={plays} onChanged={changed} />)
              ) : (
                <Empty>Nothing logged yet.</Empty>
              )}
            </Box>

            {d.sameGroup.length > 0 && (
              <>
                <Label>Other buildings in {f.group} ({d.sameGroup.length})</Label>
                <Typography sx={{ fontSize: 13.5, color: IOS.secondary }}>
                  {d.sameGroup.map((s) => `${s.name}${s.tenantId ? " ✓" : ""}`).join(" · ")}
                </Typography>
              </>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
