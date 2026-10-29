import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Section, Tag } from "./HqBits";
import { ago, errorText, n, num, shortDate } from "./hqFormat";
import FacilityDrawer from "./FacilityDrawer";

const COLS = "minmax(220px, 2.2fr) 1fr 70px minmax(150px, 1.4fr) 110px 90px 90px";

/** Every facility we market to: call-list buildings, CRM entry points and signups. */
export default function HqFacilities({ reloadKey, onChanged }) {
  const [filters, setFilters] = useState({ q: "", tier: "", stage: "", state: "", customers: "", sort: "tier" });
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", city: "", state: "", group: "" });

  // Search as you type, a beat after the last key.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q })), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let off = false;
    const params = Object.fromEntries(Object.entries({ ...filters, page, limit: 100 }).filter(([, v]) => v !== ""));
    api
      .get("/hq/facilities", { params })
      .then((res) => {
        if (off) return;
        setError("");
        setData((prev) => (page > 1 && prev ? { ...res.data, facilities: [...prev.facilities, ...res.data.facilities] } : res.data));
      })
      .catch((err) => !off && setError(errorText(err, "Couldn't load facilities")));
    return () => {
      off = true;
    };
  }, [filters, page, reloadKey]);

  const set = (k) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  };

  const add = async () => {
    try {
      const res = await api.post("/hq/facilities", draft);
      setAdding(false);
      setDraft({ name: "", city: "", state: "", group: "" });
      setOpen(res.data.facility._id);
      setPage(1);
      setFilters((f) => ({ ...f }));
    } catch (err) {
      toast.error(errorText(err, "Couldn't add"));
    }
  };

  const sel = { size: "small", select: true, sx: { minWidth: 130, bgcolor: IOS.surface } };

  return (
    <Section
      title={data ? `${n(data.total)} facilities` : "Facilities"}
      right={
        <Button size="small" variant="outlined" onClick={() => setAdding((a) => !a)} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
          {adding ? "Cancel" : "Add facility"}
        </Button>
      }
    >
      {adding && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {["name", "city", "state", "group"].map((k) => (
            <TextField key={k} size="small" label={k[0].toUpperCase() + k.slice(1)} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
          ))}
          <Button variant="contained" disableElevation disabled={!draft.name.trim()} onClick={add}>Add</Button>
        </Box>
      )}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField size="small" placeholder="Search name, group, city, scheduler…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: "1 1 260px", bgcolor: IOS.surface }} />
        <TextField {...sel} label="Tier" value={filters.tier} onChange={set("tier")}>
          <MenuItem value="">All tiers</MenuItem>
          {[1, 2, 3, 4].map((t) => <MenuItem key={t} value={t}>Tier {t}</MenuItem>)}
        </TextField>
        <TextField {...sel} label="Stage" value={filters.stage} onChange={set("stage")} sx={{ ...sel.sx, minWidth: 180 }}>
          <MenuItem value="">Any stage</MenuItem>
          {(data?.stages || []).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField {...sel} label="State" value={filters.state} onChange={set("state")} sx={{ ...sel.sx, minWidth: 100 }}>
          <MenuItem value="">All</MenuItem>
          {(data?.states || []).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField {...sel} label="Show" value={filters.customers} onChange={set("customers")}>
          <MenuItem value="">Everyone</MenuItem>
          <MenuItem value="1">Customers</MenuItem>
          <MenuItem value="0">Not yet</MenuItem>
        </TextField>
        <TextField {...sel} label="Sort" value={filters.sort} onChange={set("sort")}>
          <MenuItem value="tier">Tier, then score</MenuItem>
          <MenuItem value="next">Next date</MenuItem>
          <MenuItem value="recent">Recently changed</MenuItem>
          <MenuItem value="name">Name</MenuItem>
        </TextField>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <CircularProgress size={22} />}
      {data && !data.facilities.length && <Empty>No facilities yet. Import your call list under Connections.</Empty>}
      {data && data.facilities.length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 900 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: COLS, gap: 1.5, px: 1, pb: 0.75, borderBottom: `1px solid ${IOS.separator}`, fontSize: 12, fontWeight: 700, color: IOS.secondary }}>
              <span>Facility</span>
              <span>Where</span>
              <span>Tier</span>
              <span>Stage</span>
              <span>Next</span>
              <span>People</span>
              <span>Real clicks</span>
            </Box>
            {data.facilities.map((f) => (
              <ButtonBase
                key={f._id}
                onClick={() => setOpen(f._id)}
                sx={{ display: "grid", gridTemplateColumns: COLS, gap: 1.5, px: 1, py: 1.1, width: "100%", textAlign: "left", alignItems: "center", borderBottom: `1px solid ${IOS.hairline}`, "&:hover": { bgcolor: IOS.canvas } }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                    {f.name} {f.customer && <Tag color={IOS.green}>Customer</Tag>}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>
                    {f.group || "Independent"}
                    {f.buildingsInGroup > 1 ? ` · ${f.buildingsInGroup} buildings` : ""}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13 }} noWrap>{[f.city, f.state].filter(Boolean).join(", ") || "–"}</Typography>
                <Typography sx={{ fontSize: 13, ...num }}>{f.tier || "–"}</Typography>
                <Typography sx={{ fontSize: 13, color: IOS.secondary }} noWrap>{f.stage || "–"}</Typography>
                <Typography sx={{ fontSize: 13, color: f.nextDate && new Date(f.nextDate) < new Date() ? IOS.redText : IOS.ink }} noWrap>
                  {f.nextDate ? shortDate(f.nextDate) : f.lastCallDate ? `called ${ago(f.lastCallDate)}` : "–"}
                </Typography>
                <Typography sx={{ fontSize: 13, ...num }}>
                  {f.contacts}
                  {f.leaders ? <Box component="span" sx={{ color: IOS.secondary }}> ({f.leaders} lead.)</Box> : null}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: f.humanClicks ? 700 : 400, color: f.humanClicks ? IOS.blue : IOS.tertiary, ...num }}>{f.humanClicks || "–"}</Typography>
              </ButtonBase>
            ))}
          </Box>
          {data.facilities.length < data.total && (
            <Button onClick={() => setPage((p) => p + 1)} sx={{ mt: 1.5 }}>
              Show more ({n(data.total - data.facilities.length)} left)
            </Button>
          )}
        </Box>
      )}
      <FacilityDrawer id={open} onClose={() => setOpen(null)} onChanged={onChanged} />
    </Section>
  );
}
