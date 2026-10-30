import { useEffect, useState } from "react";
import { Autocomplete, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { errorText, weekStartIso } from "./hqFormat";
import { DeleteButton } from "./FacilityParts";

const KIND_FOR = { calls: "call", email: "email", linkedin: "linkedin" };
const KIND_WORD = { call: "call", email: "email", linkedin: "LinkedIn message", meeting: "meeting", note: "note" };
const today = () => new Date().toISOString().slice(0, 10);


/**
 * Log calls, cold emails or LinkedIn messages against a play: one ("called
 * Annandale, voicemail") or a batch ("15 front-desk calls"). The person or
 * facility is optional; picking one also adds it to their history.
 */
export function LogTouch({ plays, playId = "", onLogged, onCancel }) {
  const [v, setV] = useState({ playId: playId || plays[0]?._id || "", count: 1, outcome: "", notes: "", at: today() });
  const [who, setWho] = useState(null);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const play = plays.find((p) => p._id === v.playId);
  const kind = KIND_FOR[play?.channel] || "note";

  useEffect(() => {
    if (q.trim().length < 2) return undefined;
    let off = false;
    const t = setTimeout(() => {
      Promise.all([api.get("/hq/contacts", { params: { q, limit: 8 } }), api.get("/hq/facilities", { params: { q, limit: 8, sort: "name" } })])
        .then(([c, f]) => {
          if (off) return;
          setOptions([
            ...c.data.contacts.map((x) => ({ type: "person", id: x._id, label: x.name || x.email, sub: [x.title, x.facilityName || x.group].filter(Boolean).join(" · "), facilityId: x.facilityId })),
            ...f.data.facilities.map((x) => ({ type: "facility", id: x._id, label: x.name, sub: [x.city, x.state].filter(Boolean).join(", ") })),
          ]);
        })
        .catch(() => {});
    }, 250);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [q]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/hq/activities", {
        playId: v.playId,
        kind,
        count: Number(v.count) || 1,
        outcome: v.outcome,
        notes: v.notes,
        at: `${v.at}T12:00:00`,
        contactId: who?.type === "person" ? who.id : null,
        facilityId: who?.type === "facility" ? who.id : who?.facilityId || null,
      });
      const n = Number(v.count) || 1;
      toast.success(`Logged ${n} ${KIND_WORD[kind]}${n === 1 ? "" : "s"}`);
      setV({ ...v, count: 1, outcome: "", notes: "" });
      setWho(null);
      onLogged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't log it"));
    } finally {
      setSaving(false);
    }
  };

  const f = { size: "small", sx: { bgcolor: IOS.surface } };
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 90px 2fr 140px" }, gap: 1, alignItems: "start", p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell }}>
      <TextField {...f} select label="Play" value={v.playId} onChange={(e) => setV({ ...v, playId: e.target.value })}>
        {plays.map((p) => (
          <MenuItem key={p._id} value={p._id}>{p.title}</MenuItem>
        ))}
      </TextField>
      <TextField {...f} type="number" label="How many" value={v.count} onChange={(e) => setV({ ...v, count: e.target.value })} inputProps={{ min: 1, max: 500 }} />
      <Autocomplete
        size="small"
        options={options}
        value={who}
        onChange={(_, x) => setWho(x)}
        onInputChange={(_, x) => setQ(x)}
        getOptionLabel={(o) => o?.label || ""}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(x) => x}
        renderOption={(props, o) => (
          <li {...props} key={`${o.type}:${o.id}`}>
            <Box>
              <Typography sx={{ fontSize: 14 }}>
                {o.label}
                <Box component="span" sx={{ fontSize: 11.5, color: IOS.secondary, ml: 0.75 }}>{o.type === "person" ? "person" : "facility"}</Box>
              </Typography>
              {o.sub && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{o.sub}</Typography>}
            </Box>
          </li>
        )}
        renderInput={(params) => <TextField {...params} label="Who (optional)" placeholder="Search a person or facility" sx={{ bgcolor: IOS.surface }} />}
        noOptionsText={q.length < 2 ? "Type 2+ letters" : "No match"}
      />
      <TextField {...f} type="date" label="Date" InputLabelProps={{ shrink: true }} value={v.at} onChange={(e) => setV({ ...v, at: e.target.value })} />
      <TextField {...f} label="Outcome" placeholder="Voicemail, spoke, booked setup, replied…" value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })} sx={{ ...f.sx, gridColumn: { md: "1 / 3" } }} />
      <TextField {...f} label="Notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} sx={{ ...f.sx, gridColumn: { md: "3 / 5" } }} />
      <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
        <Button variant="contained" disableElevation disabled={saving || !v.playId} onClick={save}>
          {saving ? "Logging…" : `Log ${Number(v.count) > 1 ? v.count : ""} ${KIND_WORD[kind]}${Number(v.count) > 1 ? "s" : ""}`.replace("  ", " ")}
        </Button>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </Box>
    </Box>
  );
}

/** This week's log for some plays: who did how much, and every entry (deletable). */
export function TouchLog({ plays, reloadKey, onChanged }) {
  const [rows, setRows] = useState(null);
  const [key, setKey] = useState(0);
  const ids = plays.map((p) => p._id).join(",");

  useEffect(() => {
    if (!ids) return undefined;
    let off = false;
    api
      .get("/hq/activities", { params: { playIds: ids, since: weekStartIso(), limit: 300 } })
      .then((res) => !off && setRows(res.data.activities))
      .catch(() => !off && setRows([]));
    return () => {
      off = true;
    };
  }, [ids, reloadKey, key]);

  if (!rows) return null;
  const title = new Map(plays.map((p) => [p._id, p.title]));
  const byPerson = Object.entries(rows.reduce((m, a) => ((m[a.by || "Someone"] = (m[a.by || "Someone"] || 0) + (a.count || 1)), m), {})).sort((a, b) => b[1] - a[1]);
  const remove = async (id) => {
    try {
      await api.delete(`/hq/activities/${id}`);
      setKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't delete"));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "baseline", flexWrap: "wrap", mb: 0.75 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: IOS.secondary }}>THIS WEEK'S LOG</Typography>
        {byPerson.map(([who, n]) => (
          <Typography key={who} sx={{ fontSize: 13.5 }}>
            <b>{who}</b> {n}
          </Typography>
        ))}
      </Box>
      {!rows.length && <Typography sx={{ fontSize: 13.5, color: IOS.tertiary }}>Nothing logged this week yet.</Typography>}
      {rows.map((a) => (
        <Box key={a._id} sx={{ display: "flex", gap: 1.5, alignItems: "center", py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, width: 70, flexShrink: 0 }}>{new Date(a.at).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, width: 44, flexShrink: 0, textAlign: "right" }}>{a.count > 1 ? `×${a.count}` : "1"}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14 }} noWrap>
              {title.get(a.playId) || "—"}
              {a.contactId?.name || a.facilityId?.name ? <Box component="span" sx={{ color: IOS.secondary }}> · {[a.contactId?.name, a.facilityId?.name].filter(Boolean).join(", ")}</Box> : null}
            </Typography>
            {(a.outcome || a.notes) && <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{[a.outcome, a.notes].filter(Boolean).join(" · ")}</Typography>}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: IOS.tertiary, flexShrink: 0 }}>{a.by}</Typography>
          <DeleteButton onConfirm={() => remove(a._id)} size={14} />
        </Box>
      ))}
    </Box>
  );
}
