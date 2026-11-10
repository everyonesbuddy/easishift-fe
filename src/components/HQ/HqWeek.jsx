import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Menu, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { FiCheck, FiChevronDown, FiChevronRight, FiCopy, FiEye, FiExternalLink, FiFileText, FiMail, FiPhone, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import HqHistory from "./HqHistory";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, Section, Tag } from "./HqBits";
import { errorText, localToday, n, num } from "./hqFormat";
import { AUDIENCES } from "./usePlaybookPlays";
import { copyText } from "./playFormat";
import FacilityDrawer from "./FacilityDrawer";
import { ItemDialog } from "./HqContentPlan";

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

// Content: what kind of piece it is and where it goes.
const KIND = (t) =>
  ({
    video: t.channel === "linkedin" ? "LinkedIn video" : t.channel === "facebook" ? "Facebook video" : "YouTube video",
    short_video: "YouTube Short",
    linkedin_post: "LinkedIn post",
    blog_post: "Blog post",
    newsletter: "Klaviyo email",
    email: "Email",
    template: "Template",
    facebook_post: "Facebook Page post",
  })[t.format] || { youtube: "YouTube", linkedin: "LinkedIn post", blog: "Blog post", newsletter: "Klaviyo email", facebook: "Facebook Page post", website: "Website" }[t.channel] || "Content";
const PUBLISH = (t) =>
  ({
    video: t.channel === "linkedin" ? "upload it to LinkedIn" : t.channel === "facebook" ? "post it on the Facebook Page" : "film it and upload it to YouTube",
    short_video: "post it as a YouTube Short (and a Facebook Reel)",
    linkedin_post: "post it on LinkedIn from your profile",
    blog_post: "publish it on the blog at wisershifts.com",
    newsletter: "send it in Klaviyo",
    email: "send it",
    template: "put it on the website's free templates",
    facebook_post: "post it on the WiserShifts Facebook Page",
  })[t.format] || "publish it";
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
/** The one thing to do next with a piece, by where it is. */
function contentStep(t) {
  const go = PUBLISH(t);
  if (t.status === "idea") return t.format === "video" || t.format === "short_video" ? `Not started. Script it, then ${go}.` : `Not started. Write it, then ${go}.`;
  if (t.status === "drafting") return `In progress. Finish it, then ${go}.`;
  if (t.status === "ready") return `Ready. ${cap(go)}.`;
  if (t.status === "scheduled") return "Scheduled. Tick it once it's out.";
  return "";
}
// A new piece for a play: the format and channel it usually is.
const NEW_PIECE = {
  youtube: ["video", "youtube"],
  linkedin: ["linkedin_post", "linkedin"],
  blog: ["blog_post", "blog"],
  search: ["blog_post", "blog"],
  newsletter: ["newsletter", "newsletter"],
  facebook: ["facebook_post", "facebook"],
};
/** A mailto: link with the play's email script filled in. */
// Links the email scripts can drop in with {calculator link}, {template link}, {directors page}.
const LINKS = {
  "calculator link": "https://wisershifts.com/calculators/hours-per-resident-day-calculator",
  "hprd calculator": "https://wisershifts.com/calculators/hours-per-resident-day-calculator",
  "call-out calculator": "https://wisershifts.com/calculators/call-out-cost-calculator",
  "template link": "https://wisershifts.com/templates/weekly-cna-schedule-template.pdf",
  "directors page": "https://wisershifts.com/for/directors",
  "signup link": "https://wisershifts.com/signup",
  "operators link": "https://wisershifts.com/for/operators",
};
/** Fill a script's placeholders, written as {First name} or [first name]. */
function fillScript(text, { firstName, facility, sender, role }) {
  const tag = (words) => new RegExp(`[\\[{]\\s*(?:${words})\\s*[\\]}]`, "gi");
  let out = String(text || "");
  // No name yet (they left and you're calling for whoever has the job): ask for the role instead.
  if (!firstName && role) out = out.replace(new RegExp(`(reach|speak (?:to|with)|for|calling) ${tag("first ?name|firstname|name").source}`, "gi"), `$1 your ${role}`);
  out = out
    .replace(tag("first ?name|firstname|name"), firstName || "there")
    .replace(tag("building|facility|community|building name|facility name|community name"), facility || "your building")
    .replace(tag("your name|my name|sender"), sender || "");
  for (const [k, url] of Object.entries(LINKS)) out = out.replace(tag(k.replace(/[-]/g, "\\-")), url);
  return out;
}
/** For someone with no name on file, their job title, so the script asks for the role. */
const roleOf = (t) => (t.kind === "contact" && !t.firstName ? t.title || "" : "");

/**
 * Fill what HQ knows into the "you spoke with their scheduler" script: the
 * scheduler's name, when, and the booked setup. Only when that call is on file.
 */
function fillKnown(text, k) {
  if (!text || !k?.spokeWithScheduler) return text;
  let out = text.replace(/^\[Only use this if HQ shows[^\]]*\]\s*/m, "");
  if (k.schedulerName) out = out.replace(/\[scheduler's name\]/g, k.schedulerName);
  if (k.spokeOn) out = out.replace(/\[when\]/g, `on ${k.spokeOn}`);
  out = out.replace(/\[, and we're setting up next week together\]/g, k.setupBooked ? ", and we're setting up next week together" : "");
  return out;
}

/**
 * Which script fits this person, from what HQ knows: the right email in a
 * sequence, the assisted living version for an assisted living building,
 * the voicemail for another try, and "you spoke with their scheduler" only
 * when that call is on file.
 */
function pickVersion(versions, t) {
  const al = (x) => /assisted living/i.test(x.label || "");
  const spoke = (x) => /spoken with their scheduler/i.test(x.label || "");
  const fits = (x) => (t.known?.assisted ? true : !al(x)) && (t.known?.spokeWithScheduler || !spoke(x));
  const first = (test) => {
    const pref = versions.findIndex((x) => test(x) && (t.known?.assisted ? al(x) : true) && fits(x));
    return pref >= 0 ? pref : versions.findIndex((x) => test(x) && fits(x));
  };
  if (t.step) return first((x) => new RegExp(`Email ${t.step}\\b`).test(x.label || ""));
  if (/^Try again/.test(t.reason || "")) return first((x) => /voicemail/i.test(x.label || ""));
  if (t.known?.spokeWithScheduler) {
    const k = versions.findIndex(spoke);
    if (k >= 0) return k;
  }
  if (!t.email) return Math.max(0, versions.findIndex(fits));
  return first((x) => /^Email 1\b/.test(x.label || "") || /· Email 1 ·/.test(x.label || ""));
}

function mailto(t, script, sender) {
  if (!script) return `mailto:${t.email}`;
  const facility = (t.detail || "").split(" · ")[0];
  const fill = (x) => fillScript(x, { firstName: t.firstName, facility, sender, role: roleOf(t) });
  return `mailto:${t.email}?subject=${encodeURIComponent(fill(script.subject))}&body=${encodeURIComponent(fill(script.body))}`;
}

/**
 * The email for one person, filled in: pick a version of the play's script,
 * copy the subject and body, or open it in your email.
 */
function EmailPreview({ t, scripts, sender, onClose }) {
  const versions = scripts.filter((x) => x.body);
  const isCall = !t.email;
  // Start on the version that fits: the right email in a sequence, the voicemail for another try.
  const [i, setI] = useState(() => Math.max(0, pickVersion(versions, t)));
  const facility = (t.detail || "").split(" · ")[0];
  const v = versions[i] || { label: "", subject: "", body: "" };
  const subject = fillScript(v.subject, { firstName: t.firstName, facility, sender, role: roleOf(t) });
  const body = fillKnown(fillScript(v.body, { firstName: t.firstName, facility, sender, role: roleOf(t) }), t.known);
  const box = { bgcolor: IOS.canvas, borderRadius: "10px", p: 1.5, position: "relative" };
  const copyBtn = (text, label) => (
    <Button size="small" startIcon={<FiCopy size={13} />} onClick={() => copyText(text)} sx={{ position: { sm: "absolute" }, top: 6, right: 6 }}>
      {label}
    </Button>
  );
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0.5 }}>
        {isCall ? "Call" : "Email to"} {t.title}
        <Typography sx={{ fontSize: 13.5, color: IOS.secondary }}>
          {t.detail}
          {t.reason ? ` · ${t.reason}` : ""}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "12px !important" }}>
        {versions.length > 1 && (
          <TextField select size="small" label="Version" value={i} onChange={(e) => setI(Number(e.target.value))}>
            {versions.map((x, k) => (
              <MenuItem key={k} value={k}>
                {x.label || `Version ${k + 1}`}
              </MenuItem>
            ))}
          </TextField>
        )}
        {isCall ? (
          t.phone && (
            <Box sx={box}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone</Typography>
              <Typography sx={{ fontSize: 14.5, pr: { sm: 14 } }}>{t.phone}</Typography>
              {copyBtn(t.phone, "Copy number")}
            </Box>
          )
        ) : (
          <Box sx={box}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>To</Typography>
            <Typography sx={{ fontSize: 14.5, pr: { sm: 14 } }}>{t.email}</Typography>
            {copyBtn(t.email, "Copy address")}
          </Box>
        )}
        {t.known && (t.known.facts.length > 0 || t.known.history.length > 0) && (
          <Box sx={{ ...box, bgcolor: "rgba(0,122,255,0.06)" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>What HQ knows</Typography>
            {t.known.facts.map((f) => (
              <Typography key={f} sx={{ fontSize: 13.5, mt: 0.25 }}>{f}</Typography>
            ))}
            {t.known.history.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.75 }}>Last touches</Typography>
                {t.known.history.map((h) => (
                  <Typography key={h} sx={{ fontSize: 13.5 }}>{h}</Typography>
                ))}
              </>
            )}
            {t.known.spokeWithScheduler && <Typography sx={{ fontSize: 12.5, color: IOS.greenText, mt: 0.5, fontWeight: 600 }}>You've talked with the scheduler at this building, so the script below says so.</Typography>}
          </Box>
        )}
        {subject && (
          <Box sx={box}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</Typography>
            <Typography sx={{ fontSize: 14.5, fontWeight: 600, pr: { sm: 14 } }}>{subject}</Typography>
            {copyBtn(subject, "Copy subject")}
          </Box>
        )}
        <Box sx={box}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{isCall && !v.subject ? "What to say" : "Email"}</Typography>
          <Typography sx={{ fontSize: 14.5, whiteSpace: "pre-wrap", lineHeight: 1.55, mt: 0.5, pr: { sm: 14 } }}>{body}</Typography>
          {copyBtn(body, isCall && !v.subject ? "Copy" : "Copy email")}
        </Box>
        {!isCall && !t.firstName && <Typography sx={{ fontSize: 12.5, color: IOS.orangeText }}>No first name on file, so it says "Hi there". Change it if you know their name.</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {isCall ? (
          t.phone && (
            <Button variant="contained" disableElevation startIcon={<FiPhone />} href={`tel:${t.phone}`} sx={{ borderRadius: IOS.radius.round }}>
              Call {t.phone}
            </Button>
          )
        ) : (
          <Button variant="contained" disableElevation startIcon={<FiMail />} href={mailto(t, v, sender)} sx={{ borderRadius: IOS.radius.round }}>
            Open in email
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// What happened on a call. "Call back" asks for the day; the rest are one tap.
const CALL_OUTCOMES = [
  ["booked", "Booked the setup", "Off the cold list; it's a setup now."],
  ["callback", "Reached: call back…", "Pick the day; it shows up then."],
  ["reached", "Talked, no next step", ""],
  ["voicemail", "Left a voicemail", "Tried again in 2 days, up to 3 times."],
  ["no_answer", "No answer", "Tried again in 2 days, up to 3 times."],
  ["not_interested", "Not interested", "Off the list."],
  ["wrong_number", "Wrong number", "Off the list. Fix the number on Facilities."],
  ["left", "No longer works there", "Off your lists for good. Add who replaced them, if you know."],
];
/** Two working days from today, as "2026-11-06". */
function inTwoWorkdays() {
  const d = new Date();
  let left = 2;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Call back": the day, and what they said. */
function CallbackDialog({ t, onClose, onSave }) {
  const [date, setDate] = useState(inTwoWorkdays);
  const [notes, setNotes] = useState("");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Call {t.title} back</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <TextField id={`cb-date-${t._id}`} type="date" size="small" label="When" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: localToday() }} />
        <TextField id={`cb-notes-${t._id}`} size="small" label="What they said (optional)" placeholder="Ask for Kim after 2 p.m." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!date} onClick={() => onSave({ outcome: "callback", nextDate: date, notes })} sx={{ borderRadius: IOS.radius.round }}>
          Save call-back
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * "No longer works there": who replaced them, if they told you. For a person,
 * that's a new contact at the same building; for the front desk call, the
 * building's new scheduler. Everything is optional.
 */
function LeftDialog({ t, onClose, onSave }) {
  const building = (t.detail || "").split(" · ")[0];
  const isBuilding = t.kind === "facility";
  // The number you called usually still works (front desk), so it carries over.
  const [r, setR] = useState({ name: "", title: "", phone: t.phone || "", email: "" });
  const [keepCalling, setKeepCalling] = useState(true);
  const role = (t.title || "").split(",").slice(1).join(",").trim() || (t.firstName ? "" : t.title) || "";
  const [notes, setNotes] = useState("");
  const set = (k) => (e) => setR((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 0.5 }}>{isBuilding ? `The scheduler at ${t.title} left` : `${t.title.split(",")[0]} no longer works there`}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <Typography sx={{ fontSize: 13.5, color: IOS.secondary }}>
          {isBuilding
            ? "The scheduler you had saved is cleared, and the building stays on your list. If they told you who does the schedule now, add them:"
            : `They come off every list, and their follow-up emails stop. ${building || "The building"} stays on your lists. If they told you who replaced them, add them and they'll show up as a new contact:`}
        </Typography>
        <TextField size="small" label={isBuilding ? "New scheduler's name" : "Who replaced them"} placeholder="Dana Lee" value={r.name} onChange={set("name")} autoFocus />
        {r.name.trim() ? (
          <>
            <TextField size="small" label="Their title" placeholder={role || (isBuilding ? "Staffing coordinator" : "Director of Nursing")} value={r.title} onChange={set("title")} helperText={!isBuilding && role && !r.title ? `Left empty, it stays ${role}.` : " "} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField size="small" label="Phone" value={r.phone} onChange={set("phone")} helperText={t.phone && r.phone === t.phone ? "The number you called" : " "} />
              <TextField size="small" label="Email" value={r.email} onChange={set("email")} />
            </Box>
          </>
        ) : (
          !isBuilding && (
            <FormControlLabel
              sx={{ alignItems: "flex-start", ml: -0.5 }}
              control={<Checkbox size="small" checked={keepCalling} onChange={(e) => setKeepCalling(e.target.checked)} sx={{ pt: 0.25 }} />}
              label={
                <Typography sx={{ fontSize: 13.5 }}>
                  Don't know their name? Keep calling {t.phone || "this number"} for whoever is {role ? `the ${role}` : "in this job"} now.
                  <Box component="span" sx={{ display: "block", color: IOS.secondary, fontSize: 12.5 }}>They're added without a name; the script asks the front desk for {role ? `your ${role}` : "them by role"}.</Box>
                </Typography>
              }
            />
          )
        )}
        <TextField size="small" label="What they said (optional)" placeholder="She left in September; ask for Dana" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={() => onSave({ outcome: "left", notes, ...(r.name.trim() ? { replacement: r } : isBuilding ? { keepCalling: false } : { keepCalling, replacement: { title: role, phone: r.phone } }) })} sx={{ borderRadius: IOS.radius.round }}>
          {r.name.trim() ? `Save and add ${r.name.trim().split(" ")[0]}` : !isBuilding && keepCalling ? "Save and keep calling" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const REASON_COLOR = (r) => (/^Call back/.test(r) ? IOS.blue : /^Try again/.test(r) ? IOS.orange : "#5856D6");
const shortDay = (d) => (d ? new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "");

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
function TodoRow({ t, channel, busy, onTick, onRemove, onOpenFacility, onOpenItem, onOutcome, script, scripts = [], sender = "", more = false }) {
  // The email that fits this person (their step, their building's type), else the campaign's first.
  const withSubject = scripts.filter((x) => x.body && x.subject);
  const rowScript = t.email && withSubject.length ? withSubject[Math.max(0, pickVersion(withSubject, t))] : script;
  const verb = VERB[channel];
  const [preview, setPreview] = useState(false);
  const [menuAt, setMenuAt] = useState(null);
  const [callback, setCallback] = useState(false);
  const [left, setLeft] = useState(false);
  const isCall = channel === "calls" && (t.kind === "facility" || t.kind === "contact");
  // A call asks what happened; everything else ticks straight away.
  const clickTick = (e) => (isCall && !t.done && !more ? setMenuAt(e.currentTarget) : onTick(t, !t.done));
  const doneText = t.kind === "content" ? "Published" : channel === "email" ? "Sent" : t.outcome === "callback" && t.nextDate ? `Call back ${shortDay(t.nextDate)}` : t.outcomeLabel || "Done";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9, px: 1, minWidth: 0, borderRadius: "10px", "&:hover": { bgcolor: IOS.canvas }, "&:hover .rm": { opacity: 1 } }}>
      <Tick done={t.done} busy={busy} onClick={clickTick} label={t.done ? "Untick" : isCall ? "What happened?" : "Tick"} />
      {menuAt && (
        <Menu anchorEl={menuAt} open onClose={() => setMenuAt(null)}>
          <MenuItem disabled sx={{ fontSize: 12, opacity: "1 !important", color: IOS.secondary }}>What happened?</MenuItem>
          {CALL_OUTCOMES.map(([k, label, hint]) => (
            <MenuItem
              key={k}
              onClick={() => {
                setMenuAt(null);
                if (k === "callback") setCallback(true);
                else if (k === "left") setLeft(true);
                else onTick(t, true, { outcome: k });
              }}
              sx={{ display: "block", py: 0.75 }}
            >
              <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>{label}</Typography>
              {hint && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{hint}</Typography>}
            </MenuItem>
          ))}
        </Menu>
      )}
      {left && (
        <LeftDialog
          t={t}
          onClose={() => setLeft(false)}
          onSave={(extra) => {
            setLeft(false);
            // A call logs it with the tick; after an email, it's the email's outcome.
            if (channel === "email") onOutcome(t, "left", extra);
            else onTick(t, true, extra);
          }}
        />
      )}
      {callback && (
        <CallbackDialog
          t={t}
          onClose={() => setCallback(false)}
          onSave={(extra) => {
            setCallback(false);
            onTick(t, true, extra);
          }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
          {t.facilityId ? (
            <ButtonBase onClick={() => onOpenFacility(t.facilityId)} sx={{ fontSize: 14.5, fontWeight: 600, textAlign: "left", color: t.done ? IOS.secondary : IOS.ink, textDecoration: t.done ? "line-through" : "none", "&:hover": { color: IOS.blue } }}>
              {verb && !t.done ? `${verb} ` : ""}
              {t.title}
            </ButtonBase>
          ) : t.kind === "content" && onOpenItem ? (
            <ButtonBase onClick={() => onOpenItem(t)} sx={{ fontSize: 14.5, fontWeight: 600, textAlign: "left", color: t.done ? IOS.secondary : IOS.ink, textDecoration: t.done ? "line-through" : "none", "&:hover": { color: IOS.blue } }}>
              {t.title}
            </ButtonBase>
          ) : (
            <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: t.done ? IOS.secondary : IOS.ink, textDecoration: t.done ? "line-through" : "none" }}>
              {verb && !t.done && t.kind !== "content" ? `${verb} ` : ""}
              {t.title}
            </Typography>
          )}
          {t.kind === "content" && <Tag color={IOS.blue}>{KIND(t)}</Tag>}
          {t.kind === "content" && !t.done && t.status && <Tag color={t.status === "ready" || t.status === "scheduled" ? IOS.green : IOS.secondary}>{cap(t.status)}</Tag>}
          {t.reason && !t.done && <Tag color={REASON_COLOR(t.reason)}>{t.reason.split(":")[0]}</Tag>}
          {t.done && t.doneAt && (
            <Typography sx={{ fontSize: 12.5, color: ["not_interested", "wrong_number", "left"].includes(t.outcome) ? IOS.secondary : IOS.greenText, fontWeight: 600 }}>
              {doneText}
              {t.outcome === "callback" ? "" : ` ${when(t.doneAt)}`}
            </Typography>
          )}
          {channel === "email" && t.done && t.canUndo && onOutcome && (
            t.outcome ? (
              <Typography component="span" sx={{ fontSize: 12.5, color: IOS.secondary }}>
                · {t.outcomeLabel}{" "}
                <ButtonBase onClick={() => onOutcome(t, "")} sx={{ fontSize: 12.5, color: IOS.blue, verticalAlign: "baseline" }}>
                  undo
                </ButtonBase>
              </Typography>
            ) : (
              <Box component="span" sx={{ display: "inline-flex", gap: 1 }}>
                <ButtonBase onClick={() => onOutcome(t, "replied")} sx={{ fontSize: 12.5, color: IOS.blue, fontWeight: 600 }}>
                  They replied
                </ButtonBase>
                <ButtonBase onClick={() => onOutcome(t, "not_interested")} sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  Not interested
                </ButtonBase>
                <ButtonBase onClick={() => setLeft(true)} sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  No longer there
                </ButtonBase>
              </Box>
            )
          )}
        </Box>
        {t.kind === "content" && !t.done && (
          <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
            {contentStep(t)}
            {t.owner ? ` · ${t.owner}` : ""}
          </Typography>
        )}
        {t.detail && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.detail}</Typography>}
        {t.reason && t.reason.includes(":") && !t.done && <Typography sx={{ fontSize: 12.5, color: IOS.blue }}>They said: {t.reason.split(": ").slice(1).join(": ")}</Typography>}
        {channel === "email" && t.outcome === "replied" && <Typography sx={{ fontSize: 12.5, color: IOS.greenText }}>Answer from your inbox today. Their follow-ups are stopped.</Typography>}
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
        <IconButton size="small" href={/^https?:\/\//i.test(t.url) ? t.url : `https://${t.url}`} target="_blank" rel="noreferrer" aria-label={t.kind === "content" ? "Open it" : "Open on Facebook"} title={t.kind === "content" ? "Open it" : "Open on Facebook"} sx={{ color: IOS.blue }}>
          <FiExternalLink size={15} />
        </IconButton>
      )}
      {(t.email || isCall) && !t.done && scripts.some((x) => x.body) && (
        <Button size="small" startIcon={t.email ? <FiEye size={13} /> : <FiFileText size={13} />} onClick={() => setPreview(true)} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap", flexShrink: 0 }}>
          {t.email ? "See the email" : "See the script"}
        </Button>
      )}
      {preview && <EmailPreview t={t} scripts={scripts} sender={sender} onClose={() => setPreview(false)} />}
      {t.email && !t.done && (
        <Button size="small" href={mailto(t, rowScript, sender)} startIcon={<FiMail size={13} />} title={rowScript ? `Opens your email with "${rowScript.label}" filled in` : t.email} sx={{ borderRadius: IOS.radius.round, whiteSpace: "nowrap", flexShrink: 0 }}>
          {rowScript ? "Open in email" : "Email"}
        </Button>
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
function PlayWeek({ p, data, view, busyId, onTick, onRemove, onOpenFacility, onOpenItem, onAddPiece, onOutcome, sender }) {
  const target = goal(p);
  const ticked = p.todos.filter((t) => t.done).length;
  const byDay = p.list === "people" || p.list === "content";
  // The email script with a subject line: "Write it" opens your email with it filled in.
  const script = p.channel === "email" ? p.scripts.find((s) => s.subject) || null : null;
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
  const rows = (list) => list.map((t) => <TodoRow key={t._id} t={t} channel={p.channel} busy={busyId === t._id} onTick={onTick} onRemove={onRemove} onOpenFacility={onOpenFacility} onOpenItem={onOpenItem} script={script} scripts={p.channel === "email" || p.channel === "calls" ? p.scripts : []} sender={sender} onOutcome={onOutcome} />);

  // Today view: today's, plus anything left from earlier days; whole week: every day.
  const days = byDay ? [0, 1, 2, 3, 4, 5, 6].map((d) => [d, p.todos.filter((t) => (t.day ?? data.today) === d)]).filter(([, l]) => l.length) : [];
  const earlier = byDay ? p.todos.filter((t) => (t.day ?? data.today) < data.today && !t.done) : [];
  const todayList = byDay ? p.todos.filter((t) => (t.day ?? data.today) === data.today) : [];
  const allDone = p.count >= target;
  const nextUp = byDay ? p.todos.filter((t) => !t.done && (t.day ?? 0) > data.today).sort((a, b) => a.day - b.day)[0] : null;

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
          {p.span > 1 ? ` every ${p.span} weeks` : ""}
        </Typography>
      </Box>
      {p.span > 1 && <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>Counts the last {p.span} weeks, so one done last week covers this week too.</Typography>}
      {p.count - ticked - (p.published || []).length > 0 && <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>{p.count - ticked - (p.published || []).length} logged another way (a batch or the history) count too.</Typography>}

      <Box sx={{ mt: 1 }}>
        {p.short && (
          <Box sx={{ bgcolor: tint(IOS.orange, 0.08), border: `1px solid ${tint(IOS.orange, 0.25)}`, borderRadius: "10px", p: 1.25, my: 0.5 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: IOS.orangeText }}>
              {p.short.onList ? `Only ${p.short.onList} of ${p.short.target} on this week's list.` : `Nobody to ${(VERB[p.channel] || "reach").toLowerCase()} this week (target ${p.short.target}).`}
            </Typography>
            <Typography sx={{ fontSize: 13, mt: 0.25 }}>
              {n(p.short.total)} {p.short.of} on file
              {p.short.reasons.length ? `: ${p.short.reasons.map(([k, why]) => `${n(k)} ${why}`).join(", ")}.` : "."} {p.short.fix}
            </Typography>
            <Button size="small" onClick={() => navigate(`/hq/${p.short.page}`)} sx={{ mt: 0.5, px: 0, minWidth: 0 }}>
              {p.short.page === "facilities" ? "Go to Facilities" : "Go to Leaders & contacts"}
            </Button>
          </Box>
        )}
        {(p.published || []).map((x) => (
          <Box key={x.url || x.title} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9, px: 1 }}>
            <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: IOS.green, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <FiCheck size={15} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: IOS.secondary }}>{x.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.greenText, fontWeight: 600 }}>
                {x.where || "On the blog"} {md(new Date(x.date))}
                {x.url && (
                  <Box component="a" href={x.url} target="_blank" rel="noreferrer" sx={{ ml: 1, color: IOS.blue, fontWeight: 500, textDecoration: "none" }}>
                    Open <FiExternalLink size={11} />
                  </Box>
                )}
              </Typography>
            </Box>
          </Box>
        ))}
        {!p.todos.length && !p.short && !(p.published || []).length && (
          <Typography sx={{ fontSize: 13.5, color: IOS.secondary, py: 1 }}>
            {p.list === "content" ? (p.span > 1 ? `Nothing scheduled yet, and one is due every ${p.span} weeks. Pick one below, or pause the campaign in Strategy.` : "Nothing planned for this campaign this week. Add a piece below.") : p.list === "facebook" ? "No groups yet. Add the groups you find on the Facebook page." : "Nobody left to reach for this play. Add facilities or people, then top up the list."}
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
            {!earlier.length && !todayList.length && p.todos.length > 0 && (
              <Typography sx={{ fontSize: 13.5, color: IOS.secondary, py: 1 }}>
                Nothing for today.
                {nextUp ? ` Next up ${DAYS[nextUp.day]}: ${p.list === "content" ? `${nextUp.title} (${KIND(nextUp)})` : nextUp.title}.` : " All done for the week."}
              </Typography>
            )}
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
        {p.list === "content" && (
          <Button size="small" startIcon={<FiPlus />} onClick={() => onAddPiece(p)} sx={{ color: IOS.secondary }}>
            Add a piece
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
  const [gov, setGov] = useState([]); // government deadlines (only the week load sends them)
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [view, setView] = useState("today");
  const [busyId, setBusyId] = useState(null);
  const [openFacility, setOpenFacility] = useState(null);
  const [refilling, setRefilling] = useState(false);
  const [editItem, setEditItem] = useState(null); // a content piece to open, or a new one
  const [key, setKey] = useState(0);
  const [sender, setSender] = useState("");
  // Your name, to sign the cold emails.
  useEffect(() => {
    api
      .get("/hq/auth/me")
      .then((res) => setSender(res.data?.user?.name || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/week")
      .then((res) => {
        if (off) return;
        setData(res.data);
        setGov(res.data.gov || []);
      })
      .catch((err) => !off && setError(errorText(err, "Couldn't load this week")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  const plays = audiences ? data.plays.filter((p) => (p.audience || []).some((a) => audiences.includes(a))) : data.plays;
  // Today: what's due today plus anything left from earlier; the week: everything on the list.
  const all = [...plays.flatMap((p) => p.todos), ...(audiences ? [] : data.tasks)];
  const dated = all.filter((t) => t.day !== null && t.day !== undefined);
  const todayDue = dated.filter((t) => t.day === data.today || (t.day < data.today && !t.done));
  const todayDone = todayDue.filter((t) => t.done).length;
  const weekDone = all.filter((t) => t.done).length;
  const anyDay = all.filter((t) => t.day === null || t.day === undefined).filter((t) => !t.done).length;
  const shortPlays = plays.filter((p) => p.short);

  const tick = async (t, done, extra = {}) => {
    setBusyId(t._id);
    try {
      const res = t.isMore
        ? await api.post(`/hq/week/items/new/check`, { done: true, playId: t.playId, kind: t.kind, refId: t.refId, action: t.action, ...extra })
        : await api.post(`/hq/week/items/${t._id}/check`, { done, ...extra });
      setData(res.data);
      if (extra.outcome === "left") toast.success(extra.replacement && !extra.replacement.name ? `Saved. You'll call the same number for the ${extra.replacement.title || "person in that job"} next.` : extra.replacement ? `Saved. ${extra.replacement.name} is added ${t.kind === "facility" ? "as the building's scheduler" : "as a contact at the same building"}.` : "Saved. They're off your lists.");
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    } finally {
      setBusyId(null);
    }
  };
  // After an email: they replied or said no (ends their follow-ups); "" undoes it.
  const outcome = async (t, value, extra = {}) => {
    setBusyId(t._id);
    try {
      const res = await api.post(`/hq/week/items/${t._id}/outcome`, { outcome: value, ...extra });
      setData(res.data);
      if (value === "replied") toast.success("Marked as replied. Their follow-ups are stopped.");
      if (value === "left") toast.success(extra.replacement && !extra.replacement.name ? `Saved. They're off your lists; whoever is the ${extra.replacement.title || "person in that job"} now is added to call.` : extra.replacement ? `Saved. ${extra.replacement.name} is added as a contact at the same building.` : "Saved. They're off your lists and their follow-ups are stopped.");
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

  const openItem = (t) =>
    setEditItem({ _id: t.refId, title: t.title, format: t.format, channel: t.channel, audience: t.audience, status: t.status, dueDate: t.dueDate, url: t.url, owner: t.owner, playId: t.itemPlayId || t.playId, notes: t.notes });
  const addPiece = (p) => {
    const [format, channel] = NEW_PIECE[p.channel] || ["other", "other"];
    setEditItem({ title: "", format, channel, audience: p.audience || [], status: "idea", playId: p._id });
  };
  const pieceSaved = async () => {
    const isNew = !editItem?._id;
    setEditItem(null);
    if (isNew) {
      // A new piece joins this week's list if its play is short.
      try {
        const res = await api.post("/hq/week/refill");
        setData(res.data);
      } catch {
        setKey((k) => k + 1);
      }
    } else setKey((k) => k + 1);
    onChanged?.();
  };
  const rowProps = { sender, data, view, busyId, onTick: tick, onRemove: remove, onOpenFacility: setOpenFacility, onOpenItem: openItem, onAddPiece: addPiece, onOutcome: outcome };

  // Today, the whole week, or a look back at any period.
  const toggle = (
    <Box sx={{ display: "flex", bgcolor: IOS.fill, borderRadius: IOS.radius.round, p: 0.4 }}>
      {[
        ["today", "Today"],
        ["week", "Whole week"],
        ["history", "History"],
      ].map(([k, label]) => (
        <ButtonBase key={k} onClick={() => setView(k)} sx={{ px: 1.75, py: 0.6, borderRadius: IOS.radius.round, fontSize: 13.5, fontWeight: 600, bgcolor: view === k ? IOS.surface : "transparent", boxShadow: view === k ? IOS.shadow : "none" }}>
          {label}
        </ButtonBase>
      ))}
    </Box>
  );
  if (view === "history") {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>{toggle}</Box>
        <HqHistory />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {/* Government contract deadlines: questions and responses due soon */}
      {!audiences && gov.length > 0 && (
        <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.card, p: { xs: 2, md: 2.5 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15.5, mb: 0.75 }}>Government contract deadlines</Typography>
          {gov.map((t) => (
            <ButtonBase
              key={`${t.refId}:${t.kind}`}
              onClick={() => navigate(`/hq/government?listing=${t.refId}`)}
              sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap", justifyContent: "flex-start", textAlign: "left", py: 0.5, width: "100%" }}
            >
              <Box component="span" sx={{ fontSize: 12.5, fontWeight: 700, color: t.kind === "overdue" ? IOS.secondary : t.kind === "due" ? IOS.redText : IOS.orangeText, whiteSpace: "nowrap" }}>{t.title}</Box>
              <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>{t.listing}</Box>
              <Box component="span" sx={{ fontSize: 13, color: IOS.secondary }}>{t.detail}</Box>
            </ButtonBase>
          ))}
        </Box>
      )}
      {/* The week at a glance */}
      <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.card, p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 280px" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>
              Week of {md(dayDate(data.weekKey, 0))} to {md(dayDate(data.weekKey, 6))} · today is {DAYS[data.today]}
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", mt: 0.25, ...num }}>
              Today: {todayDone} of {todayDue.length} done
            </Typography>
            <Box sx={{ display: "flex", mt: 1, maxWidth: 520 }}>
              <Bar done={todayDone} target={todayDue.length} height={10} />
            </Box>
            <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.75, ...num }}>
              This week: {weekDone} of {all.length} on the list
              {anyDay ? ` · ${anyDay} for any day (Facebook, your own to-dos)` : ""}
              {shortPlays.length ? ` · ${shortPlays.length} ${shortPlays.length === 1 ? "list is" : "lists are"} short of target (see why below)` : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {toggle}
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
          Tick a call and say what happened (call-backs and retries come back on the right day); tick an email and its follow-ups come up on day 4 and 9 unless you mark that they replied. Tick a piece and it's marked published. Untick to undo. Click a piece to open it (notes, script, due date). The list stays the same all week.
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

      {!plays.length && <Empty>No running campaigns with a weekly target for this buyer.</Empty>}

      {!audiences && <Tasks tasks={data.tasks} today={data.today} busyId={busyId} onTick={tick} onRemove={remove} onAdd={addTask} />}

      <FacilityDrawer id={openFacility} onClose={() => setOpenFacility(null)} onChanged={onChanged} />
      {editItem && <ItemDialog item={editItem} plays={data.plays} onClose={() => setEditItem(null)} onSaved={pieceSaved} />}
    </Box>
  );
}
