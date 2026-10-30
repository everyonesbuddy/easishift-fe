import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, TextField, Typography } from "@mui/material";
import { FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Tag } from "./HqBits";
import { dateInput, errorText, n, shortDate } from "./hqFormat";
import { DeleteButton } from "./FacilityParts";
import { copyText } from "./playFormat";
import usePlaybookPlays, { AUDIENCES } from "./usePlaybookPlays";

const STATUSES = [
  ["idea", "Ideas", IOS.tertiary],
  ["drafting", "Drafting", IOS.orange],
  ["ready", "Ready", "#5856D6"],
  ["scheduled", "Scheduled", IOS.blue],
  ["published", "Published", IOS.green],
];
const FORMATS = {
  video: "Video",
  short_video: "Short video",
  linkedin_post: "LinkedIn post",
  blog_post: "Blog post",
  newsletter: "Klaviyo email",
  email: "Email",
  template: "Template / checklist",
  facebook_post: "Facebook group post",
  other: "Other",
};
const CHANNELS = { youtube: "YouTube", linkedin: "LinkedIn", blog: "Blog", newsletter: "Klaviyo", facebook: "Facebook groups", website: "Website", email: "Email", other: "Other" };
// A sensible channel for each format, so adding is one step.
const CHANNEL_FOR = { video: "youtube", short_video: "youtube", linkedin_post: "linkedin", blog_post: "blog", newsletter: "newsletter", email: "email", template: "website", facebook_post: "facebook", other: "other" };

function Metrics({ m }) {
  if (!m) return null;
  if (m.pending) return <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>{m.source}: numbers after the next refresh</Typography>;
  const parts =
    m.source === "YouTube"
      ? [`${n(m.views)} views`, `${n(m.likes)} likes`]
      : m.source === "LinkedIn"
        ? [`${n(m.impressions)} impressions`, `${n(m.engagement)} engagement`]
        : [`${n(m.views)} views`];
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: IOS.greenText }}>
      {parts.join(" · ")}
      <Box component="span" sx={{ fontWeight: 400, color: IOS.secondary }}> ({m.source})</Box>
    </Typography>
  );
}

export function ItemDialog({ item, plays, onClose, onSaved }) {
  const [v, setV] = useState({
    title: item.title || "",
    format: item.format || "other",
    channel: item.channel || "other",
    audience: item.audience || [],
    status: item.status || "idea",
    dueDate: dateInput(item.dueDate),
    publishedAt: dateInput(item.publishedAt),
    url: item.url || "",
    owner: item.owner || "",
    playId: item.playId || "",
    notes: item.notes || "",
  });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const f = { size: "small", fullWidth: true };
  const save = async () => {
    const body = { ...v, playId: v.playId || null, dueDate: v.dueDate || null, publishedAt: v.publishedAt || (v.status === "published" ? new Date().toISOString().slice(0, 10) : null) };
    try {
      if (item._id) await api.patch(`/hq/content-plan/${item._id}`, body);
      else await api.post("/hq/content-plan", body);
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/hq/content-plan/${item._id}`);
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item._id ? "Content piece" : "New content piece"}</DialogTitle>
      <DialogContent sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, pt: "8px !important" }}>
        <TextField {...f} label="Title" value={v.title} onChange={set("title")} sx={{ gridColumn: "1 / -1" }} autoFocus={!item._id} />
        <TextField {...f} select label="Format" value={v.format} onChange={(e) => setV({ ...v, format: e.target.value, channel: v.channel === CHANNEL_FOR[v.format] || v.channel === "other" ? CHANNEL_FOR[e.target.value] : v.channel })}>
          {Object.entries(FORMATS).map(([k, l]) => (
            <MenuItem key={k} value={k}>{l}</MenuItem>
          ))}
        </TextField>
        <TextField {...f} select label="Where it goes" value={v.channel} onChange={set("channel")}>
          {Object.entries(CHANNELS).map(([k, l]) => (
            <MenuItem key={k} value={k}>{l}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, mr: 0.5 }}>For:</Typography>
          {Object.entries(AUDIENCES).map(([k, a]) => {
            const on = v.audience.includes(k);
            return (
              <ButtonBase
                key={k}
                onClick={() => setV({ ...v, audience: on ? v.audience.filter((x) => x !== k) : [...v.audience, k] })}
                sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: on ? a.color : tint(a.color, 0.1), color: on ? "#fff" : a.color }}
              >
                {a.short}
              </ButtonBase>
            );
          })}
        </Box>
        <TextField {...f} select label="Status" value={v.status} onChange={set("status")}>
          {STATUSES.map(([k, l]) => (
            <MenuItem key={k} value={k}>{l.replace(/s$/, "")}</MenuItem>
          ))}
        </TextField>
        <TextField {...f} label="Who's making it" value={v.owner} onChange={set("owner")} />
        <TextField {...f} type="date" label="Due" InputLabelProps={{ shrink: true }} value={v.dueDate} onChange={set("dueDate")} />
        <TextField {...f} type="date" label="Published" InputLabelProps={{ shrink: true }} value={v.publishedAt} onChange={set("publishedAt")} />
        <TextField {...f} label="Link once it's live (YouTube, LinkedIn, wisershifts.com…)" value={v.url} onChange={set("url")} sx={{ gridColumn: "1 / -1" }} helperText="The link is how its views are matched." />
        <TextField {...f} select label="Marketing play it's for" value={v.playId} onChange={set("playId")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} sx={{ gridColumn: "1 / -1" }}>
          <MenuItem value="">None</MenuItem>
          {plays.filter((p) => p.countsFrom === "content").map((p) => (
            <MenuItem key={p._id} value={p._id}>{p.title}</MenuItem>
          ))}
        </TextField>
        <TextField {...f} multiline minRows={3} label="Notes, outline or script" value={v.notes} onChange={set("notes")} sx={{ gridColumn: "1 / -1" }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {item._id && (
          <Box sx={{ mr: "auto" }}>
            <DeleteButton onConfirm={remove} label="Remove" />
          </Box>
        )}
        {v.notes && (
          <Button onClick={() => copyText(v.notes.replace(/^When:.*\n+/, ""))}>Copy text</Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={save} disabled={!v.title.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Content plan: a board from idea to published, filterable by buyer and channel. */
export default function HqContentPlan({ reloadKey, audiences = null }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState("");
  const [channel, setChannel] = useState("");
  const [open, setOpen] = useState(null);
  const [key, setKey] = useState(0);
  const plays = usePlaybookPlays();
  const [today] = useState(() => new Date(new Date().toDateString()).getTime());

  useEffect(() => {
    let off = false;
    api
      .get("/hq/content-plan")
      .then((res) => !off && setItems(res.data.items))
      .catch((err) => !off && setError(errorText(err, "Couldn't load the content plan")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);

  const move = async (item, status) => {
    setItems((list) => list.map((x) => (x._id === item._id ? { ...x, status } : x)));
    try {
      await api.patch(`/hq/content-plan/${item._id}`, { status, ...(status === "published" && !item.publishedAt ? { publishedAt: new Date().toISOString().slice(0, 10) } : {}) });
      setKey((k) => k + 1);
    } catch (err) {
      toast.error(errorText(err, "Couldn't move it"));
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items) return <CircularProgress size={22} />;

  const shown = items.filter(
    (i) => (audiences ? i.audience.some((a) => audiences.includes(a)) : !audience || i.audience.includes(audience)) && (!channel || i.channel === channel),
  );
  const soon = shown.filter((i) => i.status !== "published" && i.dueDate && new Date(i.dueDate).getTime() < today + 8 * 86400000);
  const sel = { size: "small", select: true, SelectProps: { displayEmpty: true }, sx: { minWidth: 170, bgcolor: IOS.surface } };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2, alignItems: "center" }}>
        <TextField {...sel} value={audience} onChange={(e) => setAudience(e.target.value)} sx={{ ...sel.sx, display: audiences ? "none" : undefined }}>
          <MenuItem value="">Every buyer</MenuItem>
          {Object.entries(AUDIENCES).map(([k, a]) => (
            <MenuItem key={k} value={k}>{a.label}</MenuItem>
          ))}
        </TextField>
        <TextField {...sel} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <MenuItem value="">Every channel</MenuItem>
          {Object.entries(CHANNELS).map(([k, l]) => (
            <MenuItem key={k} value={k}>{l}</MenuItem>
          ))}
        </TextField>
        {soon.length > 0 && (
          <Typography sx={{ fontSize: 13.5, color: IOS.orangeText, fontWeight: 600 }}>
            {soon.length} due in the next 7 days
          </Typography>
        )}
        <Button variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setOpen({ status: "idea", audience: audiences ? [audiences[0]] : audience ? [audience] : [] })} sx={{ ml: "auto", borderRadius: IOS.radius.round }}>
          Add content
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1.25, alignItems: "start" }}>
        {STATUSES.map(([status, label, color], si) => {
          const col = shown
            .filter((i) => i.status === status)
            .sort((a, b) => (status === "published" ? new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0) : new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15)));
          return (
            <Box key={status} sx={{ bgcolor: tint("#000000", 0.035), borderRadius: IOS.radius.cell, p: 1, minHeight: 120 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, mb: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{label}</Typography>
                <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{col.length}</Typography>
              </Box>
              {col.map((i) => {
                const late = i.status !== "published" && i.dueDate && new Date(i.dueDate).getTime() < today;
                return (
                  <Box key={i._id} sx={{ bgcolor: IOS.surface, borderRadius: "10px", p: 1.25, mb: 0.75, boxShadow: IOS.shadow }}>
                    <ButtonBase onClick={() => setOpen(i)} sx={{ display: "block", textAlign: "left", width: "100%" }}>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.5 }}>
                        <Tag color={IOS.blue}>{FORMATS[i.format] || i.format}</Tag>
                        {i.audience.map((a) => (AUDIENCES[a] ? <Tag key={a} color={AUDIENCES[a].color}>{AUDIENCES[a].short}</Tag> : null))}
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{i.title}</Typography>
                      <Typography sx={{ fontSize: 12, color: late ? IOS.redText : IOS.secondary, mt: 0.25 }}>
                        {i.status === "published" ? `Published ${shortDate(i.publishedAt)}` : i.dueDate ? `Due ${shortDate(i.dueDate)}` : "No date"}
                        {i.owner ? ` · ${i.owner}` : ""}
                      </Typography>
                    </ButtonBase>
                    {i.status === "published" && <Metrics m={i.metrics} />}
                    {i.status === "published" && i.url && (
                      <Link href={i.url} target="_blank" rel="noreferrer" sx={{ fontSize: 12 }}>
                        Open
                      </Link>
                    )}
                    {si < STATUSES.length - 1 && (
                      <ButtonBase onClick={() => move(i, STATUSES[si + 1][0])} sx={{ fontSize: 12, color: IOS.blue, fontWeight: 600, mt: 0.5 }}>
                        Move to {STATUSES[si + 1][1].replace(/s$/, "").toLowerCase()} →
                      </ButtonBase>
                    )}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {open && (
        <ItemDialog
          item={open}
          plays={plays}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            setKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
