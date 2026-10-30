import { useEffect, useState } from "react";
import { Autocomplete, Box, Button, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { ROLE_LABELS, errorText } from "./hqFormat";

const EMPTY = { name: "", title: "", role: "", email: "", phone: "", linkedin: "", group: "" };

/** Add someone by hand (a new ED you heard about, a regional VP…), optionally at a facility. */
export default function AddPerson({ onAdded, onCancel }) {
  const [p, setP] = useState(EMPTY);
  const [facility, setFacility] = useState(null);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return undefined;
    let off = false;
    const t = setTimeout(() => {
      api
        .get("/hq/facilities", { params: { q, limit: 15, sort: "name" } })
        .then((res) => !off && setOptions(res.data.facilities))
        .catch(() => {});
    }, 250);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [q]);

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/hq/contacts", {
        ...p,
        role: p.role || undefined,
        facilityId: facility?._id || null,
        facilityName: facility?.name || "",
        group: p.group || facility?.group || "",
      });
      toast.success(`${p.name || p.email} added`);
      setP(EMPTY);
      setFacility(null);
      onAdded?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't add them"));
    } finally {
      setSaving(false);
    }
  };

  const f = { size: "small", sx: { bgcolor: IOS.surface } };
  return (
    <Box sx={{ p: 2, mb: 2, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
      <TextField {...f} label="Name" value={p.name} onChange={set("name")} autoFocus />
      <TextField {...f} label="Title" placeholder="Director of Nursing" value={p.title} onChange={set("title")} />
      <TextField {...f} select label="Role" value={p.role} onChange={set("role")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
        <MenuItem value="">From the title</MenuItem>
        {Object.entries(ROLE_LABELS).map(([k, v]) => (
          <MenuItem key={k} value={k}>{v}</MenuItem>
        ))}
      </TextField>
      <TextField {...f} label="Email" value={p.email} onChange={set("email")} />
      <TextField {...f} label="Phone" value={p.phone} onChange={set("phone")} />
      <TextField {...f} label="LinkedIn URL" value={p.linkedin} onChange={set("linkedin")} />
      <Autocomplete
        size="small"
        options={options}
        value={facility}
        onChange={(_, v) => setFacility(v)}
        onInputChange={(_, v) => setQ(v)}
        getOptionLabel={(o) => o?.name || ""}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        filterOptions={(x) => x}
        renderOption={(props, o) => (
          <li {...props} key={o._id}>
            {o.name}
            <Box component="span" sx={{ color: IOS.secondary, ml: 1, fontSize: 13 }}>{[o.city, o.state].filter(Boolean).join(", ")}</Box>
          </li>
        )}
        renderInput={(params) => <TextField {...params} label="Facility (search)" sx={{ bgcolor: IOS.surface }} />}
        noOptionsText={q.length < 2 ? "Type 2+ letters" : "No match. Add the facility first."}
      />
      <TextField {...f} label="Group / company" placeholder={facility?.group || ""} value={p.group} onChange={set("group")} />
      <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
        <Button variant="contained" disableElevation disabled={saving || (!p.name.trim() && !p.email.trim())} onClick={save} sx={{ borderRadius: IOS.radius.round }}>
          {saving ? "Adding…" : "Add person"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
}
