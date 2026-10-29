import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import { FiCheck, FiMail, FiPhone } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, RolePill, Section, Tag } from "./HqBits";
import { PLAY_KINDS, ROLE_LABELS, errorText } from "./hqFormat";
import FacilityDrawer from "./FacilityDrawer";

const ROLE_FILTERS = ["", "scheduler", "don", "executive_director", "administrator", "regional"];

/** What to do next, by person and role, from product use, email clicks and the call list. */
export default function HqPlays({ reloadKey, onChanged }) {
  const [plays, setPlays] = useState(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [open, setOpen] = useState(null); // facility id
  const [doneFor, setDoneFor] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let off = false;
    api
      .get("/hq/plays", { params: role ? { role } : {} })
      .then((res) => !off && setPlays(res.data.plays))
      .catch((err) => !off && setError(errorText(err, "Couldn't load plays")));
    return () => {
      off = true;
    };
  }, [role, reloadKey]);

  const markDone = async (p) => {
    try {
      await api.post("/hq/plays/done", { key: p.key, notes: note, facilityId: p.facilityId, contactId: p.contactId });
      setPlays((list) => list.filter((x) => x.key !== p.key));
      setDoneFor(null);
      setNote("");
      toast.success("Done. It'll come back if something changes.");
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };

  const today = plays?.filter((p) => p.priority === 1) || [];
  const later = plays?.filter((p) => p.priority !== 1) || [];

  const Row = ({ p }) => {
    const k = PLAY_KINDS[p.kind] || { label: p.kind, color: IOS.secondary };
    return (
      <Box sx={{ display: "flex", gap: 1.5, py: 1.5, "& + &": { borderTop: `1px solid ${IOS.hairline}` }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Box sx={{ width: 4, borderRadius: 2, bgcolor: k.color, flexShrink: 0, display: { xs: "none", sm: "block" } }} />
        <Box sx={{ flex: { xs: "1 1 100%", md: 1 }, minWidth: 0 }}>
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap", mb: 0.25 }}>
            <Tag color={k.color}>{k.label}</Tag>
            <RolePill role={p.role} />
            {p.facilityName && (
              <ButtonBase onClick={() => p.facilityId && setOpen(p.facilityId)} sx={{ fontSize: 12.5, color: IOS.blue, fontWeight: 600 }}>
                {p.facilityName}
              </ButtonBase>
            )}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15.5 }}>{p.title}</Typography>
          <Typography sx={{ color: IOS.secondary, fontSize: 13.5 }}>{p.why}</Typography>
          <Typography sx={{ fontSize: 13.5, mt: 0.25 }}>
            <Box component="span" sx={{ fontWeight: 600 }}>Do: </Box>
            {p.action}
          </Typography>
          {doneFor === p.key && (
            <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
              <TextField size="small" autoFocus placeholder="What happened? (optional)" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1, maxWidth: 420 }} />
              <Button variant="contained" disableElevation size="small" onClick={() => markDone(p)}>Save</Button>
              <Button size="small" onClick={() => setDoneFor(null)}>Cancel</Button>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "flex-start", flexShrink: 0 }}>
          {p.email && (
            <Button size="small" variant="outlined" startIcon={<FiMail />} href={`mailto:${p.email}`} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
              Email
            </Button>
          )}
          {p.facilityId && (
            <Button size="small" variant="outlined" startIcon={<FiPhone />} onClick={() => setOpen(p.facilityId)} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
              Open
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<FiCheck />}
            onClick={() => {
              setDoneFor(p.key);
              setNote("");
            }}
            sx={{ borderRadius: IOS.radius.round, textTransform: "none", bgcolor: IOS.ink }}
          >
            Done
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
        {ROLE_FILTERS.map((r) => (
          <ButtonBase
            key={r || "all"}
            onClick={() => setRole(r)}
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: IOS.radius.round,
              fontSize: 13.5,
              fontWeight: 600,
              bgcolor: role === r ? IOS.ink : tint("#000000", 0.05),
              color: role === r ? "#fff" : IOS.ink,
            }}
          >
            {r ? ROLE_LABELS[r] : "Everyone"}
          </ButtonBase>
        ))}
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!plays && !error && <CircularProgress size={22} />}
      {plays && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Section title={`Today (${today.length})`} note="Signups that need a hand, people really clicking, groups heating up, and call-backs due.">
            {today.length ? today.map((p) => <Row key={p.key} p={p} />) : <Empty>Nothing urgent. Nice.</Empty>}
          </Section>
          {later.length > 0 && (
            <Section title={`This week (${later.length})`}>
              {later.map((p) => <Row key={p.key} p={p} />)}
            </Section>
          )}
        </Box>
      )}
      <FacilityDrawer id={open} onClose={() => setOpen(null)} onChanged={onChanged} />
    </>
  );
}
