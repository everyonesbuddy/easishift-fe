import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import { FiCheck, FiEdit3, FiMail, FiPhone, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, RolePill, Section, Tag } from "./HqBits";
import { PLAY_KINDS, errorText } from "./hqFormat";
import FacilityDrawer from "./FacilityDrawer";
import { ItemDialog } from "./HqContentPlan";
import usePlaybookPlays, { AUDIENCES, CHANNEL_LABELS } from "./usePlaybookPlays";
import { LogTouch } from "./LogTouch";

const CHANNEL_SHORT = { calls: "Call", email: "Cold email", linkedin: "LinkedIn", newsletter: "Klaviyo", youtube: "YouTube", blog: "Blog & search", facebook: "Facebook", search: "Search", other: "Other" };

function Progress({ done, target, unit }) {
  const pct = Math.min(100, Math.round((done / Math.max(target, 1)) * 100));
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, maxWidth: 420 }}>
      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: IOS.fill }}>
        <Box sx={{ width: `${pct}%`, height: "100%", borderRadius: 4, bgcolor: pct >= 100 ? IOS.green : IOS.blue }} />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>
        {done} of {target} {unit}
      </Typography>
    </Box>
  );
}

function TodoRow({ p, showAudience, onOpenFacility, onOpenContent, doneFor, setDoneFor, note, setNote, onDone, logFor, setLogFor, logPlays, onLogged }) {
  const k = PLAY_KINDS[p.kind] || { label: p.kind, color: IOS.secondary };
  const canLog = p.countsFrom === "activities" && p.playId;
  const isTarget = p.kind === "cadence";
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.5, "& + &": { borderTop: `1px solid ${IOS.hairline}` }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
      <Box sx={{ width: 4, borderRadius: 2, bgcolor: k.color, flexShrink: 0, display: { xs: "none", sm: "block" } }} />
      <Box sx={{ flex: { xs: "1 1 100%", md: 1 }, minWidth: 0 }}>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap", mb: 0.25 }}>
          <Tag color={IOS.ink}>{CHANNEL_SHORT[p.channel] || CHANNEL_LABELS[p.channel] || "Other"}</Tag>
          <Tag color={k.color}>{k.label}</Tag>
          {p.role && p.role !== "other" && !p.contentId && !p.playId && <RolePill role={p.role} />}
          {showAudience && (p.contentId || p.playId) && (p.audiences || []).map((a) => (AUDIENCES[a] ? <Tag key={a} color={AUDIENCES[a].color}>{AUDIENCES[a].short}</Tag> : null))}
          {p.facilityName && (
            <ButtonBase onClick={() => onOpenFacility(p.facilityId)} sx={{ fontSize: 12.5, color: IOS.blue, fontWeight: 600 }}>
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
        {p.progress && <Progress {...p.progress} />}
        {logFor === p.key && (
          <Box sx={{ mt: 1 }}>
            <LogTouch plays={logPlays} playId={p.playId} onLogged={onLogged} onCancel={() => setLogFor(null)} />
          </Box>
        )}
        {doneFor === p.key && (
          <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
            <TextField size="small" autoFocus placeholder="What happened? (optional)" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1, maxWidth: 420 }} />
            <Button variant="contained" disableElevation size="small" onClick={() => onDone(p)}>Save</Button>
            <Button size="small" onClick={() => setDoneFor(null)}>Cancel</Button>
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "flex-start", flexShrink: 0 }}>
        {p.email && (
          <Button size="small" variant="outlined" startIcon={<FiMail />} href={`mailto:${p.email}`} sx={{ borderRadius: IOS.radius.round }}>
            Email
          </Button>
        )}
        {p.facilityId && (
          <Button size="small" variant="outlined" startIcon={<FiPhone />} onClick={() => onOpenFacility(p.facilityId)} sx={{ borderRadius: IOS.radius.round }}>
            Open
          </Button>
        )}
        {p.item && (
          <Button size="small" variant="outlined" startIcon={<FiEdit3 />} onClick={() => onOpenContent(p.item)} sx={{ borderRadius: IOS.radius.round }}>
            Open
          </Button>
        )}
        {canLog && (
          <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setLogFor(logFor === p.key ? null : p.key)} sx={{ borderRadius: IOS.radius.round }}>
            Log
          </Button>
        )}
        <Button
          size="small"
          variant={isTarget ? "text" : "contained"}
          disableElevation
          startIcon={isTarget ? null : <FiCheck />}
          title={isTarget ? "Hide this reminder until next Monday (doesn't count as progress)" : "Mark this handled; it comes back only if something changes"}
          onClick={() => {
            setDoneFor(p.key);
            setNote("");
          }}
          sx={isTarget ? { borderRadius: IOS.radius.round, color: IOS.secondary } : { borderRadius: IOS.radius.round, bgcolor: IOS.ink }}
        >
          {isTarget ? "Skip this week" : "Done"}
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Everything to do now, across every channel: people to contact (clicks,
 * replies, website leads, signups, call-backs) and content (overdue, due,
 * behind the weekly target, do more of what worked). `audiences` limits it
 * to one buyer's page.
 */
export default function HqPlays({ reloadKey, onChanged, audiences = null, filter = null, hideChannels = false, title = "To do now", note: sectionNote, emptyText = "Nothing urgent. Nice." }) {
  const [plays, setPlays] = useState(null);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState("");
  const [openFacility, setOpenFacility] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [doneFor, setDoneFor] = useState(null);
  const [note, setNote] = useState("");
  const [key, setKey] = useState(0);
  const [logFor, setLogFor] = useState(null);
  const playbookPlays = usePlaybookPlays();
  const logPlays = playbookPlays.filter((x) => x.countsFrom === "activities");
  const audKey = (audiences || []).join(",");

  useEffect(() => {
    let off = false;
    const aud = audKey ? audKey.split(",") : null;
    api
      .get("/hq/plays")
      .then((res) => !off && setPlays(aud ? res.data.plays.filter((p) => (p.audiences || []).some((a) => aud.includes(a))) : res.data.plays))
      .catch((err) => !off && setError(errorText(err, "Couldn't load the to-do list")));
    return () => {
      off = true;
    };
  }, [audKey, reloadKey, key]);

  const markDone = async (p) => {
    try {
      await api.post("/hq/plays/done", { key: p.key, notes: note, facilityId: p.facilityId, contactId: p.contactId });
      setPlays((list) => list.filter((x) => x.key !== p.key));
      setDoneFor(null);
      setNote("");
      toast.success(p.kind === "cadence" ? "Skipped until next Monday." : "Done. It comes back only if something changes.");
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!plays) return <CircularProgress size={22} />;

  const mine = filter ? plays.filter(filter) : plays;
  const channels = [...new Set(mine.map((p) => p.channel || "other"))];
  const shown = mine.filter((p) => !channel || (p.channel || "other") === channel);
  const today = shown.filter((p) => p.priority === 1);
  const later = shown.filter((p) => p.priority !== 1);
  const rowProps = {
    showAudience: !audiences,
    onOpenFacility: setOpenFacility,
    onOpenContent: setOpenItem,
    doneFor,
    setDoneFor,
    note,
    setNote,
    onDone: markDone,
    logFor,
    setLogFor,
    logPlays,
    onLogged: () => {
      setLogFor(null);
      setKey((x) => x + 1);
      onChanged?.();
    },
  };

  return (
    <>
      {!hideChannels && channels.length > 1 && (
        <Box sx={{ display: "flex", gap: 0.75, mb: 1.5, flexWrap: "wrap" }}>
          {["", ...channels].map((c) => (
            <ButtonBase
              key={c || "all"}
              onClick={() => setChannel(c)}
              sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: channel === c ? IOS.ink : tint("#000000", 0.05), color: channel === c ? "#fff" : IOS.ink }}
            >
              {c ? CHANNEL_SHORT[c] || c : "Every channel"}
              <Box component="span" sx={{ ml: 0.75, opacity: 0.6 }}>{c ? mine.filter((p) => (p.channel || "other") === c).length : mine.length}</Box>
            </ButtonBase>
          ))}
        </Box>
      )}
      <Box sx={{ display: "grid", gap: 2 }}>
        <Section title={`${title} (${today.length})`} note={sectionNote || "People to contact and content to ship, across every channel. Most urgent first."}>
          {today.length ? today.map((p) => <TodoRow key={p.key} p={p} {...rowProps} />) : <Empty>{emptyText}</Empty>}
        </Section>
        {later.length > 0 && (
          <Section title={`This week (${later.length})`}>
            {later.map((p) => (
              <TodoRow key={p.key} p={p} {...rowProps} />
            ))}
          </Section>
        )}
      </Box>
      <FacilityDrawer id={openFacility} onClose={() => setOpenFacility(null)} onChanged={onChanged} />
      {openItem && (
        <ItemDialog
          item={openItem}
          plays={playbookPlays}
          onClose={() => setOpenItem(null)}
          onSaved={() => {
            setOpenItem(null);
            setKey((x) => x + 1);
          }}
        />
      )}
    </>
  );
}
