import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from "@mui/material";
import { FiCheck, FiChevronDown, FiChevronRight, FiCopy, FiEdit2, FiExternalLink, FiMoreHorizontal, FiPlus, FiRotateCcw } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, Section, Stat, Tag } from "./HqBits";
import { errorText, n, num } from "./hqFormat";
import { DeleteButton } from "./FacilityParts";
import { AUDIENCES } from "./usePlaybookPlays";
import { SubTabs } from "./HqAudience";
import { copyText } from "./playFormat";

const STATUS_COLOR = { found: IOS.secondary, requested: IOS.orange, joined: IOS.blue, asked: IOS.purple, approved: IOS.green, declined: IOS.secondary, left: IOS.tertiary, to_message: IOS.orange, messaged: IOS.blue, replied: IOS.purple, call_booked: IOS.green, signed_up: IOS.green, not_interested: IOS.tertiary };
const FILTERS = [
  ["", "All", () => true],
  ["todo", "To join", (g) => g.status === "found" || g.status === "requested"],
  ["in", "In, no offer yet", (g) => ["joined", "asked", "approved"].includes(g.status) && !g.offerAt],
  ["asked", "Waiting on the admin", (g) => g.status === "asked"],
  ["offer", "Offer posted", (g) => Boolean(g.offerAt)],
  ["none", "No promotion", (g) => g.status === "declined" || g.promo === "none"],
];
const PEOPLE_ORDER = ["to_message", "messaged", "replied", "call_booked", "signed_up", "not_interested"];
const ago = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};
const short = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Pill({ status, labels }) {
  const c = STATUS_COLOR[status] || IOS.secondary;
  return <Tag color={c}>{labels[status] || status}</Tag>;
}

/** Add or edit a group. */
function GroupDialog({ group, labels, onClose, onSaved }) {
  const [g, setG] = useState({ name: "", url: "", region: "", audience: ["scheduler"], allowsPages: "unknown", promo: "unknown", admin: "", priority: 2, status: "found", rules: "", notes: "", ...(group || {}), members: group?.members ?? "" });
  const set = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const f = { size: "small", fullWidth: true };
  const save = async () => {
    try {
      if (group?._id) await api.patch(`/hq/facebook/groups/${group._id}`, g);
      else await api.post("/hq/facebook/groups", g);
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{group?._id ? "Edit group" : "Add a Facebook group"}</DialogTitle>
      <DialogContent sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: "8px !important" }}>
        <TextField {...f} autoFocus label="Group name" value={g.name} onChange={set("name")} sx={{ gridColumn: "1 / -1" }} />
        <TextField {...f} label="Link" placeholder="https://www.facebook.com/groups/…" value={g.url} onChange={set("url")} sx={{ gridColumn: "1 / -1" }} />
        <TextField {...f} label="Members" value={g.members} onChange={set("members")} />
        <TextField {...f} label="State or region" placeholder="Ohio, National…" value={g.region} onChange={set("region")} />
        <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, mr: 0.5 }}>Who's in it:</Typography>
          {Object.entries(AUDIENCES).map(([k, v]) => {
            const on = g.audience.includes(k);
            return (
              <ButtonBase key={k} onClick={() => setG({ ...g, audience: on ? g.audience.filter((x) => x !== k) : [...g.audience, k] })} sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: on ? v.color : tint(v.color, 0.1), color: on ? "#fff" : v.color }}>
                {v.short}
              </ButtonBase>
            );
          })}
        </Box>
        <TextField {...f} select label="Can Pages join?" value={g.allowsPages} onChange={set("allowsPages")}>
          <MenuItem value="unknown">Not sure yet</MenuItem>
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No, profiles only</MenuItem>
        </TextField>
        <TextField {...f} select label="Promotion" value={g.promo} onChange={set("promo")}>
          {Object.entries(labels.promo).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField {...f} label="Admin" placeholder="Who to message" value={g.admin} onChange={set("admin")} />
        <TextField {...f} select label="Fit" value={g.priority} onChange={set("priority")}>
          <MenuItem value={1}>Best fit</MenuItem>
          <MenuItem value={2}>Good fit</MenuItem>
          <MenuItem value={3}>Maybe</MenuItem>
        </TextField>
        {group?._id && (
          <TextField {...f} select label="Where we stand" value={g.status} onChange={set("status")} sx={{ gridColumn: "1 / -1" }}>
            {Object.entries(labels.groupStatuses).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField {...f} multiline minRows={2} label="Their rules (paste the important ones)" value={g.rules} onChange={set("rules")} sx={{ gridColumn: "1 / -1" }} />
        <TextField {...f} multiline minRows={2} label="Notes" value={g.notes} onChange={set("notes")} sx={{ gridColumn: "1 / -1" }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!g.name.trim()} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Add or edit someone to message. */
function PersonDialog({ person, groups, labels, onClose, onSaved }) {
  const [p, setP] = useState({ name: "", profileUrl: "", postUrl: "", said: "", role: "", facility: "", status: "to_message", notes: "", ...(person || {}), groupId: person?.groupId || "" });
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const f = { size: "small", fullWidth: true };
  const save = async () => {
    try {
      if (person?._id) await api.patch(`/hq/facebook/people/${person._id}`, p);
      else await api.post("/hq/facebook/people", p);
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{person?._id ? "Edit" : "Add someone to message"}</DialogTitle>
      <DialogContent sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: "8px !important" }}>
        <TextField {...f} autoFocus label="Name" value={p.name} onChange={set("name")} />
        <TextField {...f} select label="Where they came from" value={p.groupId} onChange={set("groupId")} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">Our Page</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>
          ))}
        </TextField>
        <TextField {...f} label="Their profile link" value={p.profileUrl} onChange={set("profileUrl")} sx={{ gridColumn: "1 / -1" }} />
        <TextField {...f} multiline minRows={2} label="What they said" placeholder="WEEK, or their comment" value={p.said} onChange={set("said")} sx={{ gridColumn: "1 / -1" }} />
        <TextField {...f} label="Role" placeholder="Scheduler, DON…" value={p.role} onChange={set("role")} />
        <TextField {...f} label="Facility" value={p.facility} onChange={set("facility")} />
        <TextField {...f} label="Link to the post or comment" value={p.postUrl} onChange={set("postUrl")} sx={{ gridColumn: "1 / -1" }} />
        {person?._id && (
          <TextField {...f} select label="Where it stands" value={p.status} onChange={set("status")}>
            {Object.entries(labels.personStatuses).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField {...f} multiline minRows={2} label="Notes" value={p.notes} onChange={set("notes")} sx={{ gridColumn: "1 / -1" }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!p.name.trim()} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** "Done" for the next step, plus a menu for anything else that happened. */
function Actions({ next, actions, onLog, busy }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
      {next && (
        <Button size="small" variant="contained" disableElevation startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <FiCheck />} disabled={busy} onClick={() => onLog(next.action)} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap" }}>
          Done
        </Button>
      )}
      <IconButton size="small" aria-label="Log something else" onClick={(e) => setAnchor(e.currentTarget)}>
        <FiMoreHorizontal />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem disabled sx={{ fontSize: 12, opacity: "1 !important", color: IOS.secondary }}>Log what happened</MenuItem>
        {Object.entries(actions).map(([k, v]) => (
          <MenuItem
            key={k}
            onClick={() => {
              setAnchor(null);
              onLog(k);
            }}
          >
            {v}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

function History({ groupId, labels, reloadKey, onUndone }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let off = false;
    api.get(`/hq/facebook/groups/${groupId}/history`).then((r) => !off && setList(r.data.activities)).catch(() => !off && setList([]));
    return () => {
      off = true;
    };
  }, [groupId, reloadKey]);
  if (!list) return <CircularProgress size={16} />;
  if (!list.length) return <Typography sx={{ fontSize: 13, color: IOS.secondary }}>Nothing logged yet.</Typography>;
  return list.map((a) => (
    <Box key={a._id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.4 }}>
      <Typography sx={{ fontSize: 12.5, color: IOS.secondary, width: 56, flexShrink: 0, ...num }}>{short(a.at)}</Typography>
      <Typography sx={{ fontSize: 13.5, flex: 1 }}>
        {labels.groupActions[a.fbAction] || labels.personActions[a.fbAction] || a.fbAction}
        {a.notes && <Box component="span" sx={{ color: IOS.secondary }}> · {a.notes}</Box>}
        {a.by && <Box component="span" sx={{ color: IOS.tertiary }}> · {a.by}</Box>}
      </Typography>
      <IconButton
        size="small"
        title="Undo"
        onClick={async () => {
          await api.delete(`/hq/facebook/activity/${a._id}`);
          onUndone();
        }}
      >
        <FiRotateCcw size={13} />
      </IconButton>
    </Box>
  ));
}

function GroupRow({ g, labels, busy, onLog, onEdit, onDelete, reloadKey, onUndone }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ py: 1.5, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <IconButton size="small" onClick={() => setOpen(!open)} aria-label={open ? "Close" : "Open"} sx={{ mt: 0.25 }}>
          {open ? <FiChevronDown /> : <FiChevronRight />}
        </IconButton>
        <Box sx={{ flex: { xs: "1 1 calc(100% - 48px)", md: 1 }, minWidth: 0 }}>
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15.5 }}>{g.name}</Typography>
            {g.url && (
              <IconButton size="small" href={g.url} target="_blank" rel="noreferrer" aria-label="Open the group" sx={{ color: IOS.blue }}>
                <FiExternalLink size={14} />
              </IconButton>
            )}
            <Pill status={g.status} labels={labels.groupStatuses} />
            {g.priority === 1 && <Tag color={IOS.orange}>Best fit</Tag>}
          </Box>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.25 }}>
            {[g.members ? `${n(g.members)} members` : "", g.region, (g.audience || []).map((a) => AUDIENCES[a]?.short).filter(Boolean).join(", "), g.allowsPages === "yes" ? "Pages can join" : g.allowsPages === "no" ? "Profiles only" : "", `Promotion: ${labels.promo[g.promo] || "Not sure yet"}`, g.lastTouchAt ? `Last touch ${ago(g.lastTouchAt)}` : ""].filter(Boolean).join(" · ")}
          </Typography>
          {g.next && (
            <Typography sx={{ fontSize: 14, mt: 0.5 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>Next: </Box>
              {g.next.title}
              {g.next.why && <Box component="span" sx={{ color: IOS.secondary }}> {g.next.why}</Box>}
            </Typography>
          )}
        </Box>
        <Box sx={{ ml: { xs: 5, md: 0 } }}>
          <Actions next={g.next} actions={labels.groupActions} onLog={(a) => onLog(g, a)} busy={busy} />
        </Box>
      </Box>
      {open && (
        <Box sx={{ ml: { xs: 0, md: 5 }, mt: 1, p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell }}>
          {g.admin && <Typography sx={{ fontSize: 13.5 }}><b>Admin:</b> {g.admin}</Typography>}
          {g.rules && <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", mt: 0.5 }}><b>Rules:</b> {g.rules}</Typography>}
          {g.notes && <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", mt: 0.5 }}><b>Notes:</b> {g.notes}</Typography>}
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em", mt: 1.25, mb: 0.5 }}>History</Typography>
          <History groupId={g._id} labels={labels} reloadKey={reloadKey} onUndone={onUndone} />
          <Box sx={{ display: "flex", gap: 1, mt: 1.25, alignItems: "center" }}>
            <Button size="small" startIcon={<FiEdit2 />} onClick={() => onEdit(g)}>Edit</Button>
            <Box sx={{ ml: "auto" }}>
              <DeleteButton onConfirm={() => onDelete(g)} label="Remove this group" />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function PersonRow({ p, labels, busy, onLog, onEdit, onDelete }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.25, alignItems: "flex-start", "& + &": { borderTop: `1px solid ${IOS.hairline}` }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
      <Box sx={{ flex: { xs: "1 1 100%", md: 1 }, minWidth: 0 }}>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{p.name}</Typography>
          {p.profileUrl && (
            <IconButton size="small" href={p.profileUrl} target="_blank" rel="noreferrer" aria-label="Open their profile" sx={{ color: IOS.blue }}>
              <FiExternalLink size={14} />
            </IconButton>
          )}
          <Pill status={p.status} labels={labels.personStatuses} />
        </Box>
        <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
          {[p.groupName ? `From ${p.groupName}` : "From our Page", p.role, p.facility, p.messagedAt ? `Messaged ${ago(p.messagedAt)}` : "", p.repliedAt ? `Replied ${ago(p.repliedAt)}` : ""].filter(Boolean).join(" · ")}
        </Typography>
        {p.said && <Typography sx={{ fontSize: 13.5, mt: 0.25 }}>"{p.said}"</Typography>}
        {p.next && (
          <Typography sx={{ fontSize: 13.5, mt: 0.25 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>Next: </Box>
            {p.next.title}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Actions next={p.next} actions={labels.personActions} onLog={(a) => onLog(p, a)} busy={busy} />
        <IconButton size="small" aria-label="Edit" onClick={() => onEdit(p)}>
          <FiEdit2 size={14} />
        </IconButton>
        <DeleteButton onConfirm={() => onDelete(p)} label="Remove" size={14} />
      </Box>
    </Box>
  );
}

/**
 * HQ Facebook: the groups where our buyers talk, one next step at a time
 * (join as the Page, message the admin, post the offer, keep answering),
 * the people we message from them, and the scripts.
 */
export default function HqFacebook({ reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("groups");
  const [filter, setFilter] = useState("");
  const [editGroup, setEditGroup] = useState(null); // {} for new
  const [editPerson, setEditPerson] = useState(null);
  const [busy, setBusy] = useState(null);
  const [key, setKey] = useState(0);
  const [scripts, setScripts] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const refresh = () => {
    setKey((k) => k + 1);
    onChanged?.();
  };

  useEffect(() => {
    let off = false;
    api
      .get("/hq/facebook")
      .then((r) => !off && setData(r.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load Facebook")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);
  useEffect(() => {
    api
      .get("/hq/playbook")
      .then((r) => setScripts(r.data.plays.filter((p) => p.channel === "facebook").flatMap((p) => (p.scripts || []).map((s) => ({ ...s, play: p.title })))))
      .catch(() => {});
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const { labels, stats } = data;

  const log = async (type, item, action) => {
    setBusy(item._id);
    try {
      await api.post(`/hq/facebook/${type}/${item._id}/log`, { action });
      toast.success(`${type === "groups" ? labels.groupActions[action] : labels.personActions[action]}. Logged.`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't log"));
    } finally {
      setBusy(null);
    }
  };
  const remove = async (type, item) => {
    try {
      await api.delete(`/hq/facebook/${type}/${item._id}`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    }
  };

  const f = FILTERS.find((x) => x[0] === filter) || FILTERS[0];
  const groups = data.groups.filter(f[2]);
  const peopleBy = PEOPLE_ORDER.map((s) => [s, data.people.filter((p) => p.status === s)]).filter(([, l]) => l.length);
  const active = peopleBy.filter(([s]) => !["signed_up", "not_interested"].includes(s));
  const closed = peopleBy.filter(([s]) => ["signed_up", "not_interested"].includes(s));

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }, gap: 1, mb: 2.5 }}>
        <Stat label="Groups" value={n(stats.groups)} detail={`${stats.joined} joined`} />
        <Stat label="Reach" value={n(stats.reach)} detail="members in our groups" />
        <Stat label="Offers posted" value={n(stats.offers)} detail={`${stats.approved} groups allow it`} />
        <Stat label="To message" value={n(stats.toMessage)} detail={`${stats.people} people in all`} tone={stats.toMessage ? IOS.orange : undefined} />
        <Stat label="Replied" value={n(stats.replied)} detail={`${stats.calls} ${stats.calls === 1 ? "call" : "calls"} booked`} />
        <Stat label="Signups" value={n(stats.signups)} detail="from Facebook" tone={stats.signups ? IOS.green : undefined} />
      </Box>

      <SubTabs
        tabs={[
          ["groups", `Groups (${data.groups.length})`],
          ["people", `People to message (${stats.toMessage})`],
          ["scripts", "Scripts"],
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "groups" && (
        <Section
          title="Groups"
          note="Where schedulers and nurse leaders talk. Each group has one next step: join as the Page, message the admin, post the offer once they say yes, then keep answering questions. Those steps also show up in This week."
          right={
            <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setEditGroup({})} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap" }}>
              Add group
            </Button>
          }
        >
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
            {FILTERS.map(([k, label, test]) => (
              <ButtonBase key={k || "all"} onClick={() => setFilter(k)} sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: filter === k ? IOS.ink : tint("#000000", 0.05), color: filter === k ? "#fff" : IOS.ink }}>
                {label}
                <Box component="span" sx={{ ml: 0.75, opacity: 0.6 }}>{data.groups.filter(test).length}</Box>
              </ButtonBase>
            ))}
          </Box>
          {groups.length ? (
            groups.map((g) => <GroupRow key={g._id} g={g} labels={labels} busy={busy === g._id} onLog={(x, a) => log("groups", x, a)} onEdit={setEditGroup} onDelete={(x) => remove("groups", x)} reloadKey={key} onUndone={refresh} />)
          ) : (
            <Empty>{data.groups.length ? "No groups here." : "No groups yet. Search Facebook for \"staffing coordinator\", \"CNA scheduler\", \"director of nursing\" or \"assisted living owners\", and add the good ones."}</Empty>
          )}
        </Section>
      )}

      {tab === "people" && (
        <Section
          title="People to message"
          note="Everyone who comments, reacts or asks. Add them the same day; each one shows up in This week until they've been messaged, followed up and booked."
          right={
            <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setEditPerson({})} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap" }}>
              Add someone
            </Button>
          }
        >
          {!data.people.length && <Empty>Nobody yet. When someone comments WEEK or asks a question, add them here.</Empty>}
          {active.map(([s, list]) => (
            <Box key={s} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: STATUS_COLOR[s], textTransform: "uppercase", mb: 0.25 }}>
                {labels.personStatuses[s]} ({list.length})
              </Typography>
              {list.map((p) => (
                <PersonRow key={p._id} p={p} labels={labels} busy={busy === p._id} onLog={(x, a) => log("people", x, a)} onEdit={setEditPerson} onDelete={(x) => remove("people", x)} />
              ))}
            </Box>
          ))}
          {closed.length > 0 && (
            <>
              <Button size="small" startIcon={showDone ? <FiChevronDown /> : <FiChevronRight />} onClick={() => setShowDone(!showDone)} sx={{ color: IOS.secondary }}>
                Signed up or not interested ({closed.reduce((s, [, l]) => s + l.length, 0)})
              </Button>
              {showDone &&
                closed.map(([, list]) => list.map((p) => <PersonRow key={p._id} p={p} labels={labels} busy={busy === p._id} onLog={(x, a) => log("people", x, a)} onEdit={setEditPerson} onDelete={(x) => remove("people", x)} />))}
            </>
          )}
        </Section>
      )}

      {tab === "scripts" && (
        <Section title="Scripts" note="Copy, change the [name], send. Edit them on the Facebook plays (Full plan & scoreboard).">
          {scripts.length ? (
            scripts.map((s, i) => (
              <Box key={i} sx={{ bgcolor: IOS.canvas, borderRadius: "10px", p: 1.5, mb: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {s.label}
                    <Box component="span" sx={{ fontWeight: 400, color: IOS.secondary }}> · {s.play}</Box>
                  </Typography>
                  <IconButton size="small" aria-label="Copy" onClick={() => copyText(s.body)}>
                    <FiCopy size={14} />
                  </IconButton>
                </Box>
                <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap", mt: 0.5 }}>{s.body}</Typography>
              </Box>
            ))
          ) : (
            <Empty>No scripts on the Facebook plays yet.</Empty>
          )}
        </Section>
      )}

      {editGroup && (
        <GroupDialog
          group={editGroup._id ? editGroup : null}
          labels={labels}
          onClose={() => setEditGroup(null)}
          onSaved={() => {
            setEditGroup(null);
            refresh();
          }}
        />
      )}
      {editPerson && (
        <PersonDialog
          person={editPerson._id ? editPerson : null}
          groups={data.groups}
          labels={labels}
          onClose={() => setEditPerson(null)}
          onSaved={() => {
            setEditPerson(null);
            refresh();
          }}
        />
      )}
    </Box>
  );
}
