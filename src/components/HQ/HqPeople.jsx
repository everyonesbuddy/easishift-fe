import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import api from "../../config/api";
import { IOS } from "../../theme/ios";
import { ClickBadge, Empty, RolePill, Section } from "./HqBits";
import { ROLE_LABELS, errorText, n } from "./hqFormat";
import FacilityDrawer from "./FacilityDrawer";

const ROLES = ["leadership", "executive_director", "administrator", "don", "regional", "owner", "scheduler", "other"];

/** The people at those facilities, executives first; real email clicks next to each. */
export default function HqPeople({ reloadKey, onChanged }) {
  const [role, setRole] = useState("leadership");
  const [engaged, setEngaged] = useState(false);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let off = false;
    const params = { page, limit: 100, ...(role ? { role } : {}), ...(engaged ? { engaged: 1 } : {}), ...(query ? { q: query } : {}) };
    api
      .get("/hq/contacts", { params })
      .then((res) => {
        if (off) return;
        setError("");
        setData((prev) => (page > 1 && prev ? { ...res.data, contacts: [...prev.contacts, ...res.data.contacts] } : res.data));
      })
      .catch((err) => !off && setError(errorText(err, "Couldn't load people")));
    return () => {
      off = true;
    };
  }, [role, engaged, query, page, reloadKey]);

  return (
    <Section title={data ? `${n(data.total)} people` : "People"} note="Executives at the facilities on our list. Schedulers we mostly reach with content, so they're here only when we have them.">
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField size="small" placeholder="Search name, email, title, group…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: "1 1 260px", bgcolor: IOS.surface }} />
        <TextField
          size="small"
          select
          label="Role"
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          sx={{ minWidth: 200, bgcolor: IOS.surface }}
        >
          <MenuItem value="">Everyone</MenuItem>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>{r === "leadership" ? "All leadership (ED, admin, DON, regional, owner)" : ROLE_LABELS[r]}</MenuItem>
          ))}
        </TextField>
        <Button
          variant={engaged ? "contained" : "outlined"}
          disableElevation
          onClick={() => {
            setPage(1);
            setEngaged((e) => !e);
          }}
          sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}
        >
          Clicked our emails
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <CircularProgress size={22} />}
      {data && !data.contacts.length && <Empty>No one matches. Import the Lead Bank under Connections.</Empty>}
      {data?.contacts.map((c) => (
        <ButtonBase
          key={c._id}
          onClick={() => c.facilityId && setOpen(c.facilityId)}
          sx={{ display: "flex", width: "100%", textAlign: "left", gap: 2, py: 1.1, px: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "center", "&:hover": { bgcolor: IOS.canvas }, flexWrap: { xs: "wrap", md: "nowrap" } }}
        >
          <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5 }} noWrap>{c.name || c.email}</Typography>
              <RolePill role={c.role} />
            </Box>
            <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{c.title || "–"}</Typography>
          </Box>
          <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5 }} noWrap>{c.facilityName || "–"}</Typography>
            <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{c.group || ""}</Typography>
          </Box>
          <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
            <Typography sx={{ fontSize: 13 }} noWrap>{c.email || c.phone || "–"}</Typography>
            {c.email && <ClickBadge signal={c.signal} />}
          </Box>
        </ButtonBase>
      ))}
      {data && data.contacts.length < data.total && (
        <Button onClick={() => setPage((p) => p + 1)} sx={{ mt: 1.5 }}>
          Show more ({n(data.total - data.contacts.length)} left)
        </Button>
      )}
      <FacilityDrawer id={open} onClose={() => setOpen(null)} onChanged={onChanged} />
    </Section>
  );
}
