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

/** Mark the next content piece published (that's what counts for content targets), with its link if you have it. */
function PublishBox({ item, onDone, onCancel }) {
  const [url, setUrl] = useState(item.url || "");
  const [at, setAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/hq/content-plan/${item._id}`, { status: "published", publishedAt: at, url: url.trim() });
      toast.success(`"${item.title}" marked published`);
      onDone();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 150px auto" }, gap: 1, alignItems: "center" }}>
      <TextField size="small" label="Link to the post (optional)" placeholder="https://www.linkedin.com/feed/update/…" value={url} onChange={(e) => setUrl(e.target.value)} sx={{ bgcolor: IOS.surface }} helperText="With the link, its views and engagement show up automatically." />
      <TextField size="small" type="date" label="Published" InputLabelProps={{ shrink: true }} value={at} onChange={(e) => setAt(e.target.value)} sx={{ bgcolor: IOS.surface, alignSelf: "start" }} />
      <Box sx={{ display: "flex", gap: 1, alignSelf: "start" }}>
        <Button variant="contained" disableElevation disabled={saving} onClick={save}>
          Mark published
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
}

const STATUS_LABEL = { idea: "Idea", drafting: "Drafting", ready: "Ready", scheduled: "Scheduled" };
const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/**
 * A content target, piece by piece: what went out this week (ticked), then the
 * next ones to publish. Each gets its own "Mark published", one at a time.
 */
function ContentQueue({ p, onOpenContent, onLogged }) {
  const [openId, setOpenId] = useState(null);
  const row = { display: "flex", alignItems: "center", gap: 1, py: 0.75, px: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } };
  const title = (i) => (
    <ButtonBase onClick={() => onOpenContent(i)} sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start", textAlign: "left", fontSize: 14, fontWeight: 600, "&:hover": { color: IOS.blue } }}>
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</Box>
    </ButtonBase>
  );
  if (!p.queue?.length && !p.published?.length) return null;
  return (
    <Box sx={{ mt: 1, maxWidth: 760, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.cell, bgcolor: IOS.surface }}>
      {(p.published || []).map((i) => (
        <Box key={i._id} sx={row}>
          <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: IOS.green, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><FiCheck size={13} /></Box>
          {title(i)}
          <Typography sx={{ fontSize: 12.5, color: IOS.green, fontWeight: 600, whiteSpace: "nowrap" }}>Published {shortDate(i.publishedAt)}</Typography>
        </Box>
      ))}
      {(p.queue || []).map((i, n) => (
        <Box key={i._id}>
          <Box sx={row}>
            <Box sx={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${n === 0 ? IOS.blue : IOS.separator}`, flexShrink: 0 }} />
            {title(i)}
            <Tag color={i.status === "ready" || i.status === "scheduled" ? IOS.green : IOS.secondary}>{STATUS_LABEL[i.status] || i.status}</Tag>
            <Button
              size="small"
              variant={n === 0 ? "contained" : "outlined"}
              disableElevation
              onClick={() => setOpenId(openId === i._id ? null : i._id)}
              sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Mark published
            </Button>
          </Box>
          {openId === i._id && (
            <Box sx={{ px: 1, pb: 1 }}>
              <PublishBox item={i} onDone={onLogged} onCancel={() => setOpenId(null)} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

function TodoRow({ p, showAudience, onOpenFacility, onOpenContent, doneFor, setDoneFor, note, setNote, onDone, logFor, setLogFor, logPlays, onLogged, publishFor, setPublishFor }) {
  const k = PLAY_KINDS[p.kind] || { label: p.kind, color: IOS.secondary };
  const canLog = p.countsFrom === "activities" && p.playId;
  // Content: what counts is a piece marked published (no logging needed).
  const hasQueue = Array.isArray(p.queue);
  const canPublish = !hasQueue && p.item && p.item.status !== "published" && (p.countsFrom === "content" || ["content", "overdue"].includes(p.kind));
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
        {hasQueue && <ContentQueue p={p} onOpenContent={onOpenContent} onLogged={onLogged} />}
        {publishFor === p.key && <PublishBox item={p.item} onDone={onLogged} onCancel={() => setPublishFor(null)} />}
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
        {p.item && !hasQueue && (
          <Button size="small" variant="outlined" startIcon={<FiEdit3 />} onClick={() => onOpenContent(p.item)} sx={{ borderRadius: IOS.radius.round }}>
            Open
          </Button>
        )}
        {canPublish && (
          <Button size="small" variant="contained" disableElevation startIcon={<FiCheck />} onClick={() => setPublishFor(publishFor === p.key ? null : p.key)} sx={{ borderRadius: IOS.radius.round }}>
            Mark published
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
  const [publishFor, setPublishFor] = useState(null);
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
    publishFor,
    setPublishFor,
    onLogged: () => {
      setLogFor(null);
      setPublishFor(null);
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
