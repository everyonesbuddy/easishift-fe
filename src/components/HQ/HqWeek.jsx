import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { FiCheck, FiChevronDown, FiChevronRight, FiCopy, FiExternalLink, FiMail, FiPhone, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, Section, Tag } from "./HqBits";
import { errorText, num } from "./hqFormat";
import { AUDIENCES } from "./usePlaybookPlays";
import { copyText } from "./playFormat";
import FacilityDrawer from "./FacilityDrawer";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// The week's sections, in the order you'd work them.
const GROUPS = [
  { key: "calls", label: "Calls", test: (p) => p.channel === "calls" },
  { key: "email", label: "Cold email", test: (p) => p.channel === "email" },
  { key: "linkedin-out", label: "LinkedIn outreach", test: (p) => p.channel === "linkedin" && p.list === "people" },
  { key: "facebook", label: "Facebook groups & people", test: (p) => p.list === "facebook" },
  { key: "content", label: "Content to publish", test: (p) => p.list === "content" },
];
const VERB = { calls: "Call", email: "Email", linkedin: "Message" };

const dayDate = (weekKey, i) => {
  const d = new Date(`${weekKey}T12:00:00`);
  d.setDate(d.getDate() + i);
  return d;
};
const md = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { weekday: "short" }) : "");
// A target as a whole number of to-dos ("1 every 2 weeks" is 1 when it's due).
const goal = (p) => (p.weeklyTarget >= 1 ? Math.ceil(p.weeklyTarget) : 1);

function Bar({ done, target, height = 8 }) {
  const pct = Math.min(100, Math.round((done / Math.max(target, 1)) * 100));
  return (
    <Box sx={{ flex: 1, height, borderRadius: height, bgcolor: IOS.fill, overflow: "hidden" }}>
      <Box sx={{ width: `${pct}%`, height: "100%", borderRadius: height, bgcolor: pct >= 100 ? IOS.green : IOS.blue, transition: "width .3s" }} />
    </Box>
  );
}

function Tick({ done, busy, onClick, label }) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      sx={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: done ? "none" : `2px solid ${IOS.tertiary}`, bgcolor: done ? IOS.green : "transparent", color: "#fff", "&:hover": { borderColor: IOS.green, bgcolor: done ? IOS.green : tint(IOS.green, 0.08) } }}
    >
      {busy ? <CircularProgress size={14} /> : done ? <FiCheck size={15} /> : null}
    </ButtonBase>
  );
}

/** One to-do: tick, what it is, how to reach them, take it off the list. */
function TodoRow({ t, channel, busy, onTick, onRemove, onOpenFacility, more = false }) {
  const verb = VERB[channel];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9, px: 1, minWidth: 0, borderRadius: "10px", "&:hover": { bgcolor: IOS.canvas }, "&:hover .rm": { opacity: 1 } }}>
      <Tick done={t.done} busy={busy} onClick={() => onTick(t, !t.done)} label={t.done ? "Untick" : "Tick"} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
          {t.facilityId ? (
            <ButtonBase onClick={() => onOpenFacility(t.facilityId)} sx={{ fontSize: 14.5, fontWeight: 600, textAlign: "left", color: t.done ? IOS.secondary : IOS.ink, textDecoration: t.done ? "line-through" : "none", "&:hover": { color: IOS.blue } }}>
              {verb && !t.done ? `${verb} ` : ""}
              {t.title}
            </ButtonBase>
          ) : (
            <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: t.done ? IOS.secondary : IOS.ink, textDecoration: t.done ? "line-through" : "none" }}>
              {verb && !t.done && t.kind !== "content" ? `${verb} ` : ""}
              {t.title}
            </Typography>
          )}
          {t.kind === "content" && !t.done && t.status && <Tag color={t.status === "ready" || t.status === "scheduled" ? IOS.green : IOS.secondary}>{t.status[0].toUpperCase() + t.status.slice(1)}</Tag>}
          {t.done && t.doneAt && <Typography sx={{ fontSize: 12.5, color: IOS.greenText, fontWeight: 600 }}>{t.kind === "content" ? "Published" : "Done"} {when(t.doneAt)}</Typography>}
        </Box>
        {t.detail && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.detail}</Typography>}
      </Box>
      {t.phone && !t.done && (
        <Button size="small" href={`tel:${t.phone}`} startIcon={<FiPhone size={13} />} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap", flexShrink: 0, display: { xs: "none", sm: "inline-flex" } }}>
          {t.phone}
        </Button>
      )}
      {t.phone && !t.done && (
        <IconButton size="small" href={`tel:${t.phone}`} aria-label={`Call ${t.phone}`} sx={{ display: { xs: "inline-flex", sm: "none" }, color: IOS.blue }}>
          <FiPhone size={15} />
        </IconButton>
      )}
      {t.url && (
        <IconButton size="small" href={t.url} target="_blank" rel="noreferrer" aria-label="Open on Facebook" sx={{ color: IOS.blue }}>
          <FiExternalLink size={15} />
        </IconButton>
      )}
      {t.email && !t.done && (
        <IconButton size="small" href={`mailto:${t.email}`} aria-label={`Email ${t.email}`} title={t.email}>
          <FiMail size={15} />
        </IconButton>
      )}
      {!more && onRemove && (
        <Tooltip title="Take it off this week's list">
          <IconButton className="rm" size="small" onClick={() => onRemove(t)} sx={{ opacity: { xs: 1, md: 0 }, color: IOS.tertiary }}>
            <FiX size={15} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function DayHead({ label, done, total, open, onClick, today }) {
  return (
    <ButtonBase onClick={onClick} sx={{ width: "100%", justifyContent: "flex-start", gap: 0.75, py: 0.6, px: 0.5, mt: 0.5 }}>
      {open ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: today ? IOS.blue : IOS.ink }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, color: done === total ? IOS.greenText : IOS.secondary, ...num }}>
        {done} of {total}
      </Typography>
    </ButtonBase>
  );
}

/** One play's week: progress, the list (by day for calls and emails), scripts, and more you can tick. */
function PlayWeek({ p, data, view, busyId, onTick, onRemove, onOpenFacility }) {
  const target = goal(p);
  const ticked = p.todos.filter((t) => t.done).length;
  const byDay = p.list === "people";
  const [openDays, setOpenDays] = useState(() => new Set([data.today]));
  const [showMore, setShowMore] = useState(false);
  const [showScripts, setShowScripts] = useState(false);
  const navigate = useNavigate();
  const toggleDay = (d) =>
    setOpenDays((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  const unit = p.weeklyTarget < 1 ? (p.targetUnit || "").replace(/s$/, "") : p.targetUnit;
  const rows = (list) => list.map((t) => <TodoRow key={t._id} t={t} channel={p.channel} busy={busyId === t._id} onTick={onTick} onRemove={onRemove} onOpenFacility={onOpenFacility} />);

  // Today view: today's, plus anything left from earlier days; whole week: every day.
  const days = byDay ? [0, 1, 2, 3, 4, 5, 6].map((d) => [d, p.todos.filter((t) => (t.day ?? data.today) === d)]).filter(([, l]) => l.length) : [];
  const earlier = byDay ? p.todos.filter((t) => (t.day ?? data.today) < data.today && !t.done) : [];
  const todayList = byDay ? p.todos.filter((t) => (t.day ?? data.today) === data.today) : [];
  const allDone = p.count >= target;

  return (
    <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.cell, p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, flex: "1 1 auto" }}>{p.title}</Typography>
        {(p.audience || []).map((a) => (AUDIENCES[a] ? <Tag key={a} color={AUDIENCES[a].color}>{AUDIENCES[a].short}</Tag> : null))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1, maxWidth: 520 }}>
        <Bar done={p.count} target={target} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: allDone ? IOS.greenText : IOS.ink, ...num }}>
          {allDone && <FiCheck size={13} style={{ marginRight: 4, verticalAlign: -1 }} />}
          {p.count} of {target} {unit}
          {p.weeklyTarget < 1 ? " (due this week)" : ""}
        </Typography>
      </Box>
      {p.count > ticked && <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>{p.count - ticked} logged another way (a batch or the history) count too.</Typography>}

      <Box sx={{ mt: 1 }}>
        {!p.todos.length && (
          <Typography sx={{ fontSize: 13.5, color: IOS.secondary, py: 1 }}>
            {p.list === "content" ? "Nothing planned for this play. Add pieces on the content board." : p.list === "facebook" ? "No groups yet. Add the groups you find on the Facebook page." : "Nobody left to reach for this play. Add facilities or people, then top up the list."}
          </Typography>
        )}
        {!byDay && rows(p.todos)}
        {byDay && view === "today" && (
          <>
            {earlier.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: IOS.orangeText, mt: 0.5, px: 0.5 }}>Left from earlier this week ({earlier.length})</Typography>
                {rows(earlier)}
              </>
            )}
            {todayList.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: IOS.blue, mt: 0.5, px: 0.5 }}>
                  {DAYS[data.today]} ({todayList.filter((t) => t.done).length} of {todayList.length})
                </Typography>
                {rows(todayList)}
              </>
            )}
            {!earlier.length && !todayList.length && p.todos.length > 0 && <Typography sx={{ fontSize: 13.5, color: IOS.secondary, py: 1 }}>Nothing for today. Switch to the whole week to get ahead.</Typography>}
          </>
        )}
        {byDay &&
          view === "week" &&
          days.map(([d, list]) => (
            <Box key={d}>
              <DayHead label={`${DAYS[d]} ${md(dayDate(data.weekKey, d))}`} done={list.filter((t) => t.done).length} total={list.length} open={openDays.has(d)} onClick={() => toggleDay(d)} today={d === data.today} />
              {openDays.has(d) && rows(list)}
            </Box>
          ))}
      </Box>

      <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
        {p.more.length > 0 && (
          <Button size="small" startIcon={showMore ? <FiChevronDown /> : <FiChevronRight />} onClick={() => setShowMore(!showMore)} sx={{ color: IOS.secondary }}>
            {p.list === "content" ? `Coming up later (${p.more.length})` : p.list === "facebook" ? `Other groups (${p.more.length})` : `More to ${(VERB[p.channel] || "reach").toLowerCase()} (${p.more.length})`}
          </Button>
        )}
        {p.list === "facebook" && (
          <Button size="small" startIcon={<FiExternalLink />} onClick={() => navigate("/hq/facebook")} sx={{ color: IOS.secondary }}>
            Groups and people
          </Button>
        )}
        {p.scripts.length > 0 && (
          <Button size="small" startIcon={showScripts ? <FiChevronDown /> : <FiChevronRight />} onClick={() => setShowScripts(!showScripts)} sx={{ color: IOS.secondary }}>
            Scripts ({p.scripts.length})
          </Button>
        )}
      </Box>
      {showMore && (
        <Box sx={{ mt: 0.5, p: 1, bgcolor: IOS.canvas, borderRadius: "10px" }}>
          <Typography sx={{ fontSize: 12.5, color: IOS.secondary, px: 1, mb: 0.5 }}>
            {p.list === "content" ? "Published one early? Tick it and it counts the day you do it." : p.list === "facebook" ? "Did something in another group? Tick it and it counts." : "Did one that isn't on the list, or getting ahead? Tick it and it joins this week."}
          </Typography>
          {p.more.map((m) => (
            <TodoRow key={`${m.refId}:${m.action || ""}`} t={{ ...m, _id: `more-${m.refId}`, done: false }} channel={p.channel} more busy={busyId === `more-${m.refId}`} onTick={() => onTick({ ...m, _id: `more-${m.refId}`, isMore: true }, true)} onOpenFacility={onOpenFacility} />
          ))}
        </Box>
      )}
      {showScripts &&
        p.scripts.map((s, i) => (
          <Box key={i} sx={{ bgcolor: IOS.canvas, borderRadius: "10px", p: 1.5, mt: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {s.label}
                {s.subject && <Box component="span" sx={{ fontWeight: 400, color: IOS.secondary }}> · Subject: {s.subject}</Box>}
              </Typography>
              <IconButton size="small" aria-label="Copy" onClick={() => copyText(s.subject ? `Subject: ${s.subject}\n\n${s.body}` : s.body)}>
                <FiCopy size={14} />
              </IconButton>
            </Box>
            <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap", mt: 0.5 }}>{s.body}</Typography>
          </Box>
        ))}
    </Box>
  );
}

/** Your own to-dos for the week. */
function Tasks({ tasks, today, busyId, onTick, onRemove, onAdd }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const add = async () => {
    if (!title.trim()) return;
    if (await onAdd(title.trim(), day === "" ? null : Number(day))) {
      setTitle("");
      setDay("");
    }
  };
  return (
    <Section title="Your own to-dos" note="Anything else this week: a follow-up, a favor to ask, a post to fix.">
      {tasks.map((t) => (
        <TodoRow key={t._id} t={{ ...t, detail: t.day !== null && t.day !== undefined ? (t.day === today ? "Today" : DAYS[t.day]) : "" }} busy={busyId === t._id} onTick={onTick} onRemove={onRemove} onOpenFacility={() => {}} />
      ))}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); add(); }} sx={{ display: "flex", gap: 1, mt: tasks.length ? 1 : 0, flexWrap: "wrap" }}>
        <TextField size="small" placeholder="Add a to-do" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: "1 1 260px", bgcolor: IOS.surface }} />
        <TextField size="small" select value={day} onChange={(e) => setDay(e.target.value)} sx={{ width: 150, bgcolor: IOS.surface }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value="">Any day</MenuItem>
          {DAYS.map((d, i) => (
            <MenuItem key={d} value={String(i)}>{i === today ? `${d} (today)` : d}</MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="outlined" startIcon={<FiPlus />} disabled={!title.trim()} sx={{ borderRadius: IOS.radius.round }}>Add</Button>
      </Box>
    </Section>
  );
}

/**
 * This week: every running play's weekly target as a specific checklist
 * (the facilities to call, the people to email, the pieces to publish).
 * Ticking logs it or marks it published; the bars only move forward as you
 * go. `audiences` limits it to one buyer's plays.
 */
export default function HqWeek({ reloadKey, onChanged, audiences = null }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("today");
  const [busyId, setBusyId] = useState(null);
  const [openFacility, setOpenFacility] = useState(null);
  const [refilling, setRefilling] = useState(false);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/week")
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load this week")));
    return () => {
      off = true;
    };
  }, [reloadKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  const plays = audiences ? data.plays.filter((p) => (p.audience || []).some((a) => audiences.includes(a))) : data.plays;
  const totalTarget = plays.reduce((s, p) => s + goal(p), 0);
  const totalDone = plays.reduce((s, p) => s + Math.min(p.count, goal(p)), 0);

  const tick = async (t, done) => {
    setBusyId(t._id);
    try {
      const res = t.isMore
        ? await api.post(`/hq/week/items/new/check`, { done: true, playId: t.playId, kind: t.kind, refId: t.refId, action: t.action })
        : await api.post(`/hq/week/items/${t._id}/check`, { done });
      setData(res.data);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    } finally {
      setBusyId(null);
    }
  };
  const remove = async (t) => {
    setBusyId(t._id);
    try {
      const res = await api.delete(`/hq/week/items/${t._id}`);
      setData(res.data);
      toast.info(t.kind === "task" ? "Removed." : "Taken off this week's list.");
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    } finally {
      setBusyId(null);
    }
  };
  const addTask = async (title, day) => {
    try {
      const res = await api.post("/hq/week/tasks", { title, day });
      setData(res.data);
      return true;
    } catch (err) {
      toast.error(errorText(err, "Couldn't add"));
      return false;
    }
  };
  const refill = async () => {
    setRefilling(true);
    try {
      const res = await api.post("/hq/week/refill");
      setData(res.data);
      toast.success(res.data.added ? `Added ${res.data.added} to the list.` : "Every list is already full.");
    } catch (err) {
      toast.error(errorText(err, "Couldn't top up"));
    } finally {
      setRefilling(false);
    }
  };

  const rowProps = { data, view, busyId, onTick: tick, onRemove: remove, onOpenFacility: setOpenFacility };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {/* The week at a glance */}
      <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.card, p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 280px" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>
              Week of {md(dayDate(data.weekKey, 0))} to {md(dayDate(data.weekKey, 6))} · today is {DAYS[data.today]}
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", mt: 0.25, ...num }}>
              {totalDone} of {totalTarget} done
            </Typography>
            <Box sx={{ display: "flex", mt: 1, maxWidth: 520 }}>
              <Bar done={totalDone} target={totalTarget} height={10} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", bgcolor: IOS.fill, borderRadius: IOS.radius.round, p: 0.4 }}>
              {[
                ["today", "Today"],
                ["week", "Whole week"],
              ].map(([k, label]) => (
                <ButtonBase key={k} onClick={() => setView(k)} sx={{ px: 1.75, py: 0.6, borderRadius: IOS.radius.round, fontSize: 13.5, fontWeight: 600, bgcolor: view === k ? IOS.surface : "transparent", boxShadow: view === k ? IOS.shadow : "none" }}>
                  {label}
                </ButtonBase>
              ))}
            </Box>
            <Tooltip title="Adds new facilities, people or content until every list reaches its target. Nothing is taken away.">
              <span>
                <Button size="small" startIcon={refilling ? <CircularProgress size={13} /> : <FiRefreshCw />} disabled={refilling} onClick={refill} sx={{ borderRadius: IOS.radius.round }}>
                  Top up the lists
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${Math.max(1, Math.min(plays.length, 6))}, 1fr)` }, gap: 1, mt: 2 }}>
          {plays.map((p) => (
            <ButtonBase key={p._id} onClick={() => document.getElementById(`week-${p._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ display: "block", minWidth: 0, textAlign: "left", p: 1, borderRadius: "10px", bgcolor: IOS.canvas }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: IOS.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: p.count >= goal(p) ? IOS.greenText : IOS.ink, ...num }}>
                {p.count}/{goal(p)}
              </Typography>
              <Box sx={{ display: "flex", mt: 0.5 }}>
                <Bar done={p.count} target={goal(p)} height={4} />
              </Box>
            </ButtonBase>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 1.5 }}>
          Tick a call or email and it's logged with its play; tick a piece and it's marked published. Untick to undo. The list stays the same all week.
        </Typography>
      </Box>

      {GROUPS.map((g) => [g, plays.filter(g.test)])
        .filter(([, list]) => list.length)
        .map(([g, list]) => (
          <Box key={g.key}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: IOS.secondary, textTransform: "uppercase", mb: 0.75 }}>{g.label}</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {list.map((p) => (
                <Box key={p._id} id={`week-${p._id}`} sx={{ scrollMarginTop: 80 }}>
                  <PlayWeek p={p} {...rowProps} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}

      {!plays.length && <Empty>No running plays with a weekly target for this buyer.</Empty>}

      {!audiences && <Tasks tasks={data.tasks} today={data.today} busyId={busyId} onTick={tick} onRemove={remove} onAdd={addTask} />}

      <FacilityDrawer id={openFacility} onClose={() => setOpenFacility(null)} onChanged={onChanged} />
    </Box>
  );
}
