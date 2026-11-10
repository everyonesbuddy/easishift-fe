// HQ government contracts: federal listings from SAM.gov (pulled every day),
// state, county and city ones added by hand, and where we stand on each:
// new → reviewing → bidding (with a checklist) → submitted → won or lost.
// Deadlines coming up also show at the top of This week.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { FiExternalLink, FiPlus, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Section, Tag } from "./HqBits";
import { errorText } from "./hqFormat";

const TABS = [
  ["new", "New", (l) => l.status === "new"],
  ["active", "Going after", (l) => l.status === "reviewing" || l.status === "bidding"],
  ["submitted", "Submitted", (l) => l.status === "submitted"],
  ["done", "Won & lost", (l) => l.status === "won" || l.status === "lost"],
  ["passed", "Not for us", (l) => l.status === "passed"],
];
const LEVELS = [
  ["federal", "Federal"],
  ["state", "State"],
  ["county", "County"],
  ["city", "City"],
  ["other", "Other"],
];
const STATUS_COLOR = { new: IOS.blue, reviewing: IOS.orangeText, bidding: IOS.orangeText, submitted: IOS.blue, won: IOS.greenText, lost: IOS.secondary, passed: IOS.secondary };
// The buttons on each listing: the next steps from where it is.
const NEXT = {
  new: [["reviewing", "Track it"], ["passed", "Not for us"]],
  reviewing: [["bidding", "We'll bid"], ["passed", "Not for us"]],
  bidding: [["submitted", "Submitted"], ["passed", "Not bidding after all"]],
  submitted: [["won", "Won"], ["lost", "Lost"]],
  won: [],
  lost: [],
  passed: [["reviewing", "Track it after all"]],
};

const DAY = 86400000;
const when = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: new Date(d).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
const daysLeft = (d) => Math.ceil((new Date(d) - Date.now()) / DAY);
// A date input's value ("2026-11-20") for a stored date, and back (5 p.m. local, since most are due end of day).
const toInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const fromInput = (v) => (v ? new Date(`${v}T17:00:00`).toISOString() : null);

function DueTag({ dueAt, status }) {
  if (!dueAt) return <Tag>No due date</Tag>;
  const left = daysLeft(dueAt);
  const done = !["new", "reviewing", "bidding"].includes(status);
  const color = done ? IOS.secondary : left < 0 ? IOS.secondary : left <= 7 ? IOS.redText : left <= 14 ? IOS.orangeText : IOS.secondary;
  return <Tag color={color}>{done || left < 0 ? `Was due ${when(dueAt)}` : `Due ${when(dueAt)} · ${left === 0 ? "today" : left === 1 ? "tomorrow" : `${left} days`}`}</Tag>;
}

function Listing({ l, busy, onStatus, onOpen }) {
  const done = (l.checklist || []).filter((c) => c.done).length;
  return (
    <Box sx={{ py: 1.5, borderBottom: `1px solid ${IOS.hairline}`, display: "grid", gap: 0.5 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
        <ButtonBase onClick={() => onOpen(l)} sx={{ textAlign: "left", flex: "1 1 320px", minWidth: 0, justifyContent: "flex-start" }}>
          <Typography sx={{ fontWeight: 650, fontSize: 15, color: IOS.ink }}>{l.title}</Typography>
        </ButtonBase>
        <DueTag dueAt={l.dueAt} status={l.status} />
      </Box>
      <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
        {[l.agency, LEVELS.find(([k]) => k === l.level)?.[1], l.state, l.noticeType, l.setAside].filter(Boolean).join(" · ")}
      </Typography>
      {l.status === "new" && l.matched && <Typography sx={{ fontSize: 12.5, color: IOS.tertiary }}>Found by: {l.matched}</Typography>}
      {l.status === "bidding" && l.checklist?.length > 0 && (
        <Typography sx={{ fontSize: 12.5, color: done === l.checklist.length ? IOS.greenText : IOS.secondary }}>
          Checklist: {done} of {l.checklist.length} done
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center", mt: 0.25 }}>
        {(NEXT[l.status] || []).map(([s, label], i) => (
          <Button key={s} size="small" variant={i === 0 ? "contained" : "text"} disableElevation disabled={busy} onClick={() => onStatus(l, s)} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
            {label}
          </Button>
        ))}
        <Button size="small" onClick={() => onOpen(l)} sx={{ textTransform: "none" }}>
          Details
        </Button>
        {l.url && (
          <Button size="small" component="a" href={l.url} target="_blank" rel="noreferrer" endIcon={<FiExternalLink size={12} />} sx={{ textTransform: "none" }}>
            {l.source === "sam" ? "On SAM.gov" : "Open listing"}
          </Button>
        )}
      </Box>
    </Box>
  );
}

const BLANK = { title: "", url: "", agency: "", level: "state", state: "", solicitationNumber: "", dueAt: "", questionsDueAt: "", value: "", notes: "" };

/** Add a listing by hand, or edit any listing's details, dates, notes and checklist. */
function ListingDialog({ open, listing, statuses, onClose, onSaved, onRemoved }) {
  const isNew = !listing;
  const [f, setF] = useState(BLANK);
  const [checklist, setChecklist] = useState([]);
  const [newStep, setNewStep] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(listing ? { ...BLANK, ...listing, dueAt: toInput(listing.dueAt), questionsDueAt: toInput(listing.questionsDueAt) } : BLANK);
    setChecklist(listing?.checklist || []);
    setNewStep("");
  }, [open, listing]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const fromFeed = listing?.source === "sam";

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...(fromFeed ? {} : { title: f.title, url: f.url, agency: f.agency, level: f.level, state: f.state, solicitationNumber: f.solicitationNumber }),
        dueAt: fromInput(f.dueAt),
        questionsDueAt: fromInput(f.questionsDueAt),
        value: f.value,
        notes: f.notes,
        checklist,
        ...(listing ? { status: f.status } : {}),
      };
      const { data } = isNew ? await api.post("/hq/gov", body) : await api.patch(`/hq/gov/${listing._id}`, body);
      onSaved(data);
    } catch (e) {
      toast.error(errorText(e, "Couldn't save it."));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/hq/gov/${listing._id}`);
      onRemoved(listing._id);
    } catch (e) {
      toast.error(errorText(e, "Couldn't remove it."));
    } finally {
      setSaving(false);
    }
  };
  const fieldSx = { size: "small", fullWidth: true };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>{isNew ? "Add a listing" : listing.title}</DialogTitle>
      <DialogContent>
        {isNew && <Typography sx={{ fontSize: 13.5, color: IOS.secondary, mb: 1.5 }}>For state, county and city listings (or a federal one the feed missed). Paste the link so you can get back to it.</Typography>}
        {fromFeed && <Typography sx={{ fontSize: 13.5, color: IOS.secondary, mb: 1.5 }}>{[listing.agency, listing.solicitationNumber, listing.naics && `NAICS ${listing.naics}`].filter(Boolean).join(" · ")}</Typography>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: 0.5 }}>
          {!fromFeed && (
            <>
              <TextField {...fieldSx} label="Title" value={f.title} onChange={set("title")} sx={{ gridColumn: "1 / -1" }} autoFocus={isNew} />
              <TextField {...fieldSx} label="Link to the listing" value={f.url} onChange={set("url")} sx={{ gridColumn: "1 / -1" }} />
              <TextField {...fieldSx} label="Agency or buyer" value={f.agency} onChange={set("agency")} />
              <TextField {...fieldSx} select label="Level" value={f.level} onChange={set("level")}>
                {LEVELS.map(([k, label]) => (
                  <MenuItem key={k} value={k}>{label}</MenuItem>
                ))}
              </TextField>
              <TextField {...fieldSx} label="State" placeholder="GA" value={f.state} onChange={set("state")} />
              <TextField {...fieldSx} label="Solicitation number" value={f.solicitationNumber} onChange={set("solicitationNumber")} />
            </>
          )}
          <TextField {...fieldSx} type="date" label="Response due" value={f.dueAt} onChange={set("dueAt")} InputLabelProps={{ shrink: true }} />
          <TextField {...fieldSx} type="date" label="Questions due" value={f.questionsDueAt} onChange={set("questionsDueAt")} InputLabelProps={{ shrink: true }} />
          <TextField {...fieldSx} label="Value (if they say)" placeholder="$25,000 a year" value={f.value} onChange={set("value")} />
          {!isNew && (
            <TextField {...fieldSx} select label="Where we stand" value={f.status || "new"} onChange={set("status")}>
              {Object.entries(statuses || {}).map(([k, label]) => (
                <MenuItem key={k} value={k}>{label}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField {...fieldSx} multiline minRows={3} label="Notes" placeholder="What they want, who to contact, what we'd propose" value={f.notes} onChange={set("notes")} sx={{ gridColumn: "1 / -1" }} />
        </Box>
        {!isNew && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>Checklist{checklist.length ? ` · ${checklist.filter((c) => c.done).length} of ${checklist.length}` : ""}</Typography>
            {!checklist.length && <Typography sx={{ fontSize: 13, color: IOS.secondary }}>Gets the standard bid checklist when you mark it "We'll bid". You can add your own steps any time.</Typography>}
            {checklist.map((c, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
                <Checkbox size="small" checked={c.done} onChange={(e) => setChecklist((xs) => xs.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
                <Typography sx={{ fontSize: 14, flex: 1, color: c.done ? IOS.secondary : IOS.ink, textDecoration: c.done ? "line-through" : "none" }}>{c.text}</Typography>
                <Button size="small" onClick={() => setChecklist((xs) => xs.filter((_, j) => j !== i))} sx={{ minWidth: 0, color: IOS.secondary, textTransform: "none" }}>
                  Remove
                </Button>
              </Box>
            ))}
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <TextField size="small" placeholder="Add a step" value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === "Enter" && newStep.trim() && (setChecklist((xs) => [...xs, { text: newStep.trim(), done: false }]), setNewStep(""))} sx={{ flex: 1 }} />
              <Button sx={{ textTransform: "none" }} disabled={!newStep.trim()} onClick={() => (setChecklist((xs) => [...xs, { text: newStep.trim(), done: false }]), setNewStep(""))}>
                Add
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!isNew && !fromFeed && (
          <Button color="error" onClick={remove} disabled={saving} sx={{ mr: "auto", textTransform: "none" }}>
            Delete
          </Button>
        )}
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={save} disabled={saving || (!fromFeed && !f.title.trim())} sx={{ textTransform: "none" }}>
          {saving ? <CircularProgress size={18} /> : isNew ? "Add it" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HqGovernment({ reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("new");
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState(null); // { listing } or { listing: null } to add

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get("/hq/gov");
      setData(d);
      setError("");
      return d;
    } catch (e) {
      setError(errorText(e, "Couldn't load the listings."));
      return null;
    }
  }, []);
  useEffect(() => {
    load().then((d) => {
      // Open on the tab with something in it, and open a listing linked from This week.
      if (!d) return;
      const id = new URLSearchParams(window.location.search).get("listing");
      const linked = id && d.listings.find((l) => l._id === id);
      if (linked) {
        setTab(TABS.find(([, , f]) => f(linked))?.[0] || "new");
        setDialog({ listing: linked });
      } else if (!d.listings.some((l) => l.status === "new") && d.listings.some(TABS[1][2])) setTab("active");
    });
  }, [load, reloadKey]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(([k, , f]) => [k, (data?.listings || []).filter(f).length])), [data]);
  const shown = useMemo(() => (data?.listings || []).filter(TABS.find(([k]) => k === tab)[2]), [data, tab]);

  const replace = (l) => setData((d) => ({ ...d, listings: d.listings.some((x) => x._id === l._id) ? d.listings.map((x) => (x._id === l._id ? l : x)) : [l, ...d.listings] }));
  const setStatus = async (l, status) => {
    setBusy(l._id);
    try {
      const { data: saved } = await api.patch(`/hq/gov/${l._id}`, { status });
      replace(saved);
      toast.success(status === "bidding" ? "Bidding. The bid checklist is on it." : status === "passed" ? "Moved to Not for us." : `Moved to ${saved.statusLabel}.`);
      onChanged?.();
    } catch (e) {
      toast.error(errorText(e, "Couldn't update it."));
    } finally {
      setBusy("");
    }
  };
  // The check runs in the background on the server (SAM.gov can take minutes); look back every 8 seconds until it's done.
  const [checking, setChecking] = useState(false);
  const waitForCheck = useCallback(
    async (before) => {
      setChecking(true);
      try {
        for (let i = 0; i < 60; i += 1) {
          await new Promise((r) => setTimeout(r, 8000));
          const d = await load();
          const f = d?.feed;
          if (f && !f.running && f.lastTriedAt && f.lastTriedAt !== before) {
            if (f.lastError) toast.warn(f.lastError);
            else toast.success(f.lastAdded ? `${f.lastAdded} new listing${f.lastAdded === 1 ? "" : "s"}` : "Checked. Nothing new.");
            return;
          }
        }
      } finally {
        setChecking(false);
      }
    },
    [load],
  );
  const refresh = async () => {
    setBusy("refresh");
    const before = data?.feed?.lastTriedAt || null;
    try {
      await api.post("/hq/gov/refresh");
      setBusy("");
      await waitForCheck(before);
    } catch (e) {
      toast.error(errorText(e, "Couldn't start the check."));
    } finally {
      setBusy("");
    }
  };
  // Opened while a check is running (the morning job, or Check now from before): follow it.
  const runningOnLoad = data?.feed?.running;
  useEffect(() => {
    if (runningOnLoad && !checking) waitForCheck(data?.feed?.lastTriedAt || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningOnLoad]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const feed = data.feed || {};

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {data.deadlines?.length > 0 && (
        <Section title="Deadlines coming up">
          {data.deadlines.map((t) => (
            <Box key={`${t.refId}:${t.kind}`} sx={{ display: "flex", gap: 1, alignItems: "baseline", py: 0.5, flexWrap: "wrap" }}>
              <Tag color={t.kind === "overdue" ? IOS.secondary : t.kind === "questions" || t.kind === "decide" ? IOS.orangeText : IOS.redText}>{t.title}</Tag>
              <ButtonBase onClick={() => setDialog({ listing: data.listings.find((l) => l._id === t.refId) })} sx={{ fontSize: 14, fontWeight: 600, textAlign: "left" }}>
                {t.listing}
              </ButtonBase>
              <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{t.detail}</Typography>
            </Box>
          ))}
        </Section>
      )}

      <Section
        title="Federal listings from SAM.gov"
        note={
          feed.on
            ? `Checked every morning for listings about scheduling, staffing, workforce management and timekeeping, plus software publishers' listings that mention them.${checking ? " Checking SAM.gov now. It can take a few minutes; you can leave this page." : feed.lastTriedAt ? ` Last checked ${new Date(feed.lastTriedAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${feed.lastAdded != null && !feed.lastError ? `, ${feed.lastAdded} new` : ""}.` : " Not checked yet."}`
            : "Turn this on with your SAM.gov Public API Key (SAM.gov → Account Details), saved on the server as SAM_GOV_API_KEY. State, county and city listings you add by hand either way."
        }
        right={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {feed.on && (
              <Button size="small" startIcon={busy === "refresh" || checking ? <CircularProgress size={13} /> : <FiRefreshCw />} disabled={busy === "refresh" || checking} onClick={refresh} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
                {checking ? "Checking…" : "Check now"}
              </Button>
            )}
            <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setDialog({ listing: null })} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
              Add a listing
            </Button>
          </Box>
        }
      >
        {feed.lastError && !checking && <Alert severity="warning" sx={{ mb: 1.5 }}>{feed.lastError}</Alert>}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
          {TABS.map(([k, label]) => (
            <ButtonBase
              key={k}
              onClick={() => setTab(k)}
              sx={{ px: 1.5, py: 0.6, borderRadius: IOS.radius.round, fontSize: 13.5, fontWeight: 600, bgcolor: tab === k ? IOS.ink : IOS.fill, color: tab === k ? IOS.surface : IOS.ink }}
            >
              {label}
              {counts[k] ? ` (${counts[k]})` : ""}
            </ButtonBase>
          ))}
        </Box>
        {!shown.length && (
          <Empty>
            {tab === "new"
              ? feed.on
                ? "No new listings. New matches show up here every morning."
                : "Nothing new yet. Turn on the SAM.gov feed, or add a listing you found."
              : tab === "active"
                ? "Nothing you're going after yet. Track a new listing, or add one."
                : "Nothing here yet."}
          </Empty>
        )}
        {shown.map((l) => (
          <Listing key={l._id} l={l} busy={busy === l._id} onStatus={setStatus} onOpen={(x) => setDialog({ listing: x })} />
        ))}
      </Section>

      <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
        To bid on federal work, WiserShifts needs an active entity registration on SAM.gov (free; it can take a few weeks). State and county bids use that state's own vendor registration instead.
      </Typography>

      <ListingDialog
        open={Boolean(dialog)}
        listing={dialog?.listing || null}
        statuses={data.statuses}
        onClose={() => setDialog(null)}
        onSaved={(l) => {
          replace(l);
          setDialog(null);
          toast.success("Saved.");
          load();
          onChanged?.();
        }}
        onRemoved={(id) => {
          setData((d) => ({ ...d, listings: d.listings.filter((x) => x._id !== id) }));
          setDialog(null);
          load();
        }}
      />
    </Box>
  );
}
