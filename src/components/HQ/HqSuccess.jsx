// HQ customer success: every customer we look after, worst first. Health
// (green, yellow, red, and why) is worked out from the workspace's data;
// each customer has an owner, a stage with its checklist, the next check-in
// and a log. Mildly aggressive: weekly check-ins for 90 days, warning signs
// flagged early, and red customers get a call within one business day.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Section, Stat, Tag } from "./HqBits";
import { errorText } from "./hqFormat";

const LEVEL = {
  red: ["Red", IOS.redText, "rgba(255,59,48,0.10)"],
  yellow: ["Yellow", IOS.orangeText, "rgba(255,149,0,0.12)"],
  green: ["Green", IOS.greenText, "rgba(52,199,89,0.12)"],
  unknown: ["Unknown", IOS.secondary, IOS.fill],
};
const KINDS = [
  ["call", "Call"],
  ["visit", "Visit"],
  ["meeting", "Meeting / screen share"],
  ["email", "Email"],
  ["text", "Text"],
  ["note", "Note"],
];
const DAY = 86400000;
// Whole days from now until d (negative if past), and whole days since d.
const daysUntil = (d) => Math.ceil((new Date(d) - Date.now()) / DAY);
const daysAgo = (d) => Math.floor((Date.now() - new Date(d)) / DAY);
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "–");
const toInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const fromInput = (v) => (v ? new Date(`${v}T10:00:00`).toISOString() : null);

// Dots use bright traffic-light colors, so yellow never reads as red.
const DOT = { red: "#FF3B30", yellow: "#FFCC00", green: "#34C759", unknown: "#C7C7CC" };
function Dot({ level }) {
  const color = DOT[level] || DOT.unknown;
  return <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />;
}

function CheckIn({ at }) {
  if (!at) return <Typography sx={{ fontSize: 12.5, color: IOS.tertiary }}>No check-in set</Typography>;
  const left = daysUntil(at);
  const color = left < 0 ? IOS.redText : left <= 1 ? IOS.orangeText : IOS.secondary;
  return (
    <Typography sx={{ fontSize: 12.5, color, fontWeight: left <= 1 ? 600 : 400 }}>
      {left < 0 ? `Check-in overdue (${when(at)})` : left === 0 ? "Check in today" : left === 1 ? "Check in tomorrow" : `Next check-in ${when(at)}`}
    </Typography>
  );
}

/** The numbers health is worked out from, in plain words. */
function Signals({ s }) {
  if (!s) return null;
  const seen = s.lastManagerSeenAt ? daysAgo(s.lastManagerSeenAt) : null;
  const rows = [
    ["This week", s.thisWeekPublished ? "Published" : "Not published", s.thisWeekPublished],
    ["Next week", s.nextWeekPublished ? "Published" : "Not published yet", s.nextWeekPublished],
    ["Staff", `${s.staff} · ${s.staffWithPhone} with a phone`, s.staff > 0 && s.staffWithPhone / Math.max(1, s.staff) >= 0.8],
    ["Said yes to texts", s.smsPlan ? `${s.optedIn} staff · ${s.managersOptedIn} of ${s.managers} managers` : "Plan has no texting", !s.smsPlan || s.optedIn / Math.max(1, s.staffWithPhone) >= 0.5],
    ["Managers last logged in", seen === null ? "Never" : seen === 0 ? "Today" : `${seen} day${seen === 1 ? "" : "s"} ago`, seen !== null && seen < 5],
    ["Staff opened their schedule", `${s.staffOpened14} in the last 2 weeks`, s.staffOpened14 > 0],
    ["Call-outs by text (30 days)", `${s.calloutsFilled30} filled of ${s.callouts30} sent`, s.callouts30 === 0 || s.calloutsFilled30 > 0],
    ["Payment", s.subscriptionStatus === "active" ? "Paid up" : s.subscriptionStatus === "past_due" ? "Payment failed" : s.subscriptionStatus || "–", !["past_due", "unpaid"].includes(s.subscriptionStatus)],
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2 }}>
      {rows.map(([label, value, ok]) => (
        <Box key={label} sx={{ display: "flex", gap: 1, py: 0.6, borderBottom: `1px solid ${IOS.hairline}` }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: 1 }}>{label}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: ok ? IOS.ink : IOS.orangeText, textAlign: "right" }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CustomerDialog({ c, stages, onClose, onSaved }) {
  const [saving, setSaving] = useState("");
  const [kind, setKind] = useState("call");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState(c.notes || "");
  useEffect(() => setNotes(c.notes || ""), [c._id, c.notes]);

  const patch = async (body, what = "save") => {
    setSaving(what);
    try {
      const { data } = await api.patch(`/hq/success/${c._id}`, body);
      onSaved(data);
    } catch (e) {
      toast.error(errorText(e, "Couldn't save it."));
    } finally {
      setSaving("");
    }
  };
  const addLog = async () => {
    setSaving("log");
    try {
      const { data } = await api.post(`/hq/success/${c._id}/log`, { kind, text });
      onSaved(data);
      setText("");
      toast.success(["call", "visit", "meeting"].includes(kind) ? `Logged. Next check-in ${when(data.nextCheckInAt)}.` : "Logged.");
    } catch (e) {
      toast.error(errorText(e, "Couldn't log it."));
    } finally {
      setSaving("");
    }
  };
  const removeLog = async (id) => {
    try {
      const { data } = await api.delete(`/hq/success/${c._id}/log/${id}`);
      onSaved(data);
    } catch (e) {
      toast.error(errorText(e, "Couldn't remove it."));
    }
  };
  const [label, color, bg] = LEVEL[c.health.level] || LEVEL.unknown;
  const done = c.checklist.filter((i) => i.done).length;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Dot level={c.health.level} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 19, fontWeight: 750 }}>{c.name}</Typography>
          <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
            {c.stageLabel} · day {c.day}
            {c.owner ? ` · ${c.owner}` : " · no owner yet"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2.5 }}>
        <Box sx={{ bgcolor: bg, borderRadius: IOS.radius.cell, p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color, fontSize: 14 }}>{label}{c.health.reasons.length ? ": what to work on" : ": all good"}</Typography>
          {c.health.reasons.map((r) => (
            <Typography key={r} sx={{ fontSize: 13.5 }}>· {r}</Typography>
          ))}
          {c.health.level === "red" && c.stage !== "at_risk" && (
            <Button size="small" variant="contained" color="error" disableElevation onClick={() => patch({ stage: "at_risk" }, "stage")} sx={{ mt: 1, textTransform: "none" }}>
              Move to At risk (check-in next business day)
            </Button>
          )}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(4, 1fr)" }, gap: 1.5 }}>
          <TextField size="small" label="Owner" placeholder="Niah" defaultValue={c.owner} onBlur={(e) => e.target.value !== c.owner && patch({ owner: e.target.value }, "owner")} />
          <TextField size="small" select label="Stage" value={c.stage} onChange={(e) => patch({ stage: e.target.value }, "stage")}>
            {Object.entries(stages).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="date" label="Next check-in" InputLabelProps={{ shrink: true }} value={toInput(c.nextCheckInAt)} onChange={(e) => patch({ nextCheckInAt: fromInput(e.target.value) }, "next")} />
          <TextField size="small" type="date" label="Renews" InputLabelProps={{ shrink: true }} value={toInput(c.renewsAt)} onChange={(e) => patch({ renewsAt: fromInput(e.target.value) }, "renews")} />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary, mb: 0.5 }}>How they're doing</Typography>
          <Signals s={c.signals} />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>
            {c.stageLabel} checklist · {done} of {c.checklist.length}
          </Typography>
          {c.checklist.map((i) => (
            <Box key={i.key} sx={{ display: "flex", alignItems: "center" }}>
              <Checkbox size="small" checked={i.done} disabled={i.auto && i.done} onChange={(e) => patch({ tick: { key: i.key, done: e.target.checked } }, i.key)} />
              <Typography sx={{ fontSize: 14, flex: 1, color: i.done ? IOS.secondary : IOS.ink, textDecoration: i.done ? "line-through" : "none" }}>{i.text}</Typography>
              {i.auto && <Tag color={IOS.tertiary}>{i.done ? "done (from their data)" : "ticks itself"}</Tag>}
              {i.monthly && <Tag color={IOS.tertiary}>this month</Tag>}
            </Box>
          ))}
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary, mb: 0.75 }}>Log</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField size="small" select value={kind} onChange={(e) => setKind(e.target.value)} sx={{ width: 190 }}>
              {KINDS.map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" multiline maxRows={4} placeholder="What happened, and what's next" value={text} onChange={(e) => setText(e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
            <Button variant="contained" disableElevation disabled={saving === "log" || (kind === "note" && !text.trim())} onClick={addLog} sx={{ textTransform: "none" }}>
              {saving === "log" ? <CircularProgress size={18} /> : "Log it"}
            </Button>
          </Box>
          <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>A call, visit or meeting counts as the check-in and sets the next one.</Typography>
          <Box sx={{ mt: 1 }}>
            {!c.log.length && <Typography sx={{ fontSize: 13, color: IOS.tertiary }}>Nothing logged yet.</Typography>}
            {c.log.map((e) => (
              <Box key={e._id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "130px 1fr auto" }, gap: { sm: 1.5 }, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  {when(e.at)} · {KINDS.find(([k]) => k === e.kind)?.[1] || e.kind}
                </Typography>
                <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>
                  {e.text || "–"}
                  {e.by && <Box component="span" sx={{ color: IOS.tertiary }}> · {e.by}</Box>}
                </Typography>
                <ButtonBase onClick={() => removeLog(e._id)} sx={{ fontSize: 12, color: IOS.tertiary, alignSelf: "start" }}>
                  Remove
                </ButtonBase>
              </Box>
            ))}
          </Box>
        </Box>

        <TextField
          label="Notes (who's who, what they care about)"
          multiline
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (c.notes || "") && patch({ notes }, "notes")}
          placeholder="Melanie (owner) decides. William builds the schedule. They care about overtime and call-outs."
        />
      </DialogContent>
    </Dialog>
  );
}

export default function HqSuccess() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [find, setFind] = useState("");

  const load = useCallback(async (refresh) => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/hq/success", { params: refresh ? { refresh: 1 } : {} });
      setData(d);
      setError("");
      return d;
    } catch (e) {
      setError(errorText(e, "Couldn't load customers."));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load().then((d) => {
      const id = new URLSearchParams(window.location.search).get("customer");
      if (d && id && d.customers.some((c) => c._id === id)) setOpenId(id);
    });
  }, [load]);

  const replace = (c) => setData((d) => ({ ...d, customers: d.customers.some((x) => x._id === c._id) ? d.customers.map((x) => (x._id === c._id ? c : x)) : [c, ...d.customers] }));
  const open = useMemo(() => data?.customers.find((c) => c._id === openId) || null, [data, openId]);
  const counts = useMemo(() => {
    const live = (data?.customers || []).filter((c) => c.stage !== "churned");
    return { all: live.length, red: live.filter((c) => c.health.level === "red").length, yellow: live.filter((c) => c.health.level === "yellow").length, due: (data?.todos || []).filter((t) => t.kind !== "red").length };
  }, [data]);

  const add = async () => {
    try {
      const { data: c } = await api.post("/hq/success", find.includes("@") ? { email: find } : { q: find });
      replace(c);
      setFind("");
      setAdding(false);
      setOpenId(c._id);
    } catch (e) {
      toast.error(errorText(e, "Couldn't add it."));
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
        <Stat label="Customers" value={counts.all} detail="we're looking after" />
        <Stat label="Red" value={counts.red} tone={counts.red ? IOS.redText : undefined} detail="call within a business day" />
        <Stat label="Yellow" value={counts.yellow} tone={counts.yellow ? IOS.orangeText : undefined} detail="warning signs" />
        <Stat label="Check-ins due" value={counts.due} tone={counts.due ? IOS.orangeText : undefined} detail="today, tomorrow or overdue" />
      </Box>

      {data.todos.length > 0 && (
        <Section title="To do now">
          {data.todos.map((t) => (
            <ButtonBase key={`${t.refId}:${t.kind}`} onClick={() => setOpenId(t.refId)} sx={{ display: "flex", gap: 1, alignItems: "baseline", justifyContent: "flex-start", textAlign: "left", width: "100%", py: 0.6, flexWrap: "wrap" }}>
              <Box component="span" sx={{ fontSize: 14, fontWeight: 650, color: t.kind === "red" || t.kind === "late" ? IOS.redText : IOS.ink }}>{t.title}</Box>
              {t.detail && <Box component="span" sx={{ fontSize: 13, color: IOS.secondary }}>{t.detail}</Box>}
              {t.owner && <Tag>{t.owner}</Tag>}
            </ButtonBase>
          ))}
        </Section>
      )}

      <Section
        title="Customers"
        note="Every paying workspace shows up here by itself. Health comes from their data and updates every few minutes. Weekly check-ins for the first 90 days, then every two weeks; red means call within one business day."
        right={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" startIcon={loading ? <CircularProgress size={13} /> : <FiRefreshCw />} disabled={loading} onClick={() => load(true)} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
              Refresh
            </Button>
            <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setAdding((v) => !v)} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
              Add a customer
            </Button>
          </Box>
        }
      >
        {adding && (
          <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
            <TextField size="small" autoFocus label="Anyone's email, or the workspace name" helperText="For trials and pilots. Paying workspaces are added by themselves." value={find} onChange={(e) => setFind(e.target.value)} onKeyDown={(e) => e.key === "Enter" && find.trim() && add()} sx={{ flex: 1, minWidth: 260 }} />
            <Button variant="outlined" disabled={!find.trim()} onClick={add} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
              Add
            </Button>
          </Box>
        )}
        {!data.customers.length && <Empty>No customers yet. Paying workspaces show up here by themselves.</Empty>}
        {data.customers.map((c) => (
          <ButtonBase
            key={c._id}
            onClick={() => setOpenId(c._id)}
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1.1fr) 2fr auto" }, gap: { xs: 0.5, md: 2 }, alignItems: "center", textAlign: "left", width: "100%", py: 1.5, borderBottom: `1px solid ${IOS.hairline}`, opacity: c.stage === "churned" ? 0.55 : 1 }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0 }}>
              <Dot level={c.health.level} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{c.name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  {c.stageLabel} · day {c.day} · {c.owner || "no owner yet"}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 13, color: c.health.reasons.length ? IOS.ink : IOS.greenText }}>
              {c.health.reasons.length ? c.health.reasons.slice(0, 2).join(" · ") + (c.health.reasons.length > 2 ? ` · +${c.health.reasons.length - 2} more` : "") : "All good"}
            </Typography>
            <CheckIn at={c.nextCheckInAt} />
          </ButtonBase>
        ))}
      </Section>

      {open && <CustomerDialog c={open} stages={data.stages} onClose={() => setOpenId(null)} onSaved={(c) => replace(c)} />}
    </Box>
  );
}
