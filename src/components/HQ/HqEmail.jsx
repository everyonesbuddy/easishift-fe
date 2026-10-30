import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, Checkbox, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, NotConnected, RolePill, Section, Stat, Tag } from "./HqBits";
import { ago, errorText, n, num } from "./hqFormat";

const VIEWS = [
  ["real", "Really clicked"],
  ["scannerOnly", "Only scanner clicks"],
  ["noClicks", "No clicks"],
  ["klaviyoOnly", "In Klaviyo, not in CRM"],
  ["crmOnly", "In CRM, never emailed"],
  ["unsubscribed", "Unsubscribed"],
  ["suppressed", "Stopped by us"],
  ["all", "Everyone in Klaviyo"],
];
const VIEW_NOTES = {
  real: "Real people who clicked. Follow up personally (from your own inbox or by phone).",
  scannerOnly: "Every click came from an email security scanner, so we can't tell if a person read it. The address may still be real.",
  noClicks: "Delivered, never clicked.",
  klaviyoOnly: "Klaviyo is emailing these addresses, but they aren't people in the CRM. Add the ones worth working.",
  crmOnly: "People in the CRM with an email Klaviyo has never sent to. Reach them with cold outreach from your own inbox.",
  unsubscribed: "They unsubscribed in Klaviyo. Klaviyo won't email them.",
  suppressed: "We stopped emailing these in Klaviyo. You can start again.",
  all: "",
};

/** The Klaviyo list and the CRM, side by side: they don't match one-to-one. */
function Coverage({ c, onPick }) {
  const total = Math.max(c.klaviyoOnly + c.both + c.crmOnly, 1);
  const seg = (value, color, label, view) => (
    <ButtonBase
      onClick={() => view && onPick(view)}
      title={label}
      sx={{ width: `${(value / total) * 100}%`, minWidth: value ? 4 : 0, height: "100%", bgcolor: color, display: "block" }}
    />
  );
  return (
    <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, mb: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Klaviyo and the CRM don't match one-to-one</Typography>
      <Box sx={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", my: 1.25 }}>
        {seg(c.klaviyoOnly, IOS.orange, "Only in Klaviyo", "klaviyoOnly")}
        {seg(c.both, IOS.green, "In both")}
        {seg(c.crmOnly, IOS.blue, "Only in the CRM", "crmOnly")}
      </Box>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", fontSize: 13.5 }}>
        <ButtonBase onClick={() => onPick("klaviyoOnly")} sx={{ fontSize: 13.5, gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: IOS.orange }} />
          <b>{n(c.klaviyoOnly)}</b>&nbsp;emailed by Klaviyo, not in the CRM
        </ButtonBase>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: IOS.green }} />
          <b>{n(c.both)}</b> in both
        </Box>
        <ButtonBase onClick={() => onPick("crmOnly")} sx={{ fontSize: 13.5, gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: IOS.blue }} />
          <b>{n(c.crmOnly)}</b>&nbsp;in the CRM, never emailed by Klaviyo
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * Klaviyo (our content email: the weekly email and sequences). Who really clicks,
 * how the list lines up with the CRM, and who to stop emailing.
 */
export default function HqEmail({ reloadKey, onChanged }) {
  const [view, setView] = useState("real");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [key, setKey] = useState(0);
  const [picked, setPicked] = useState(() => new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/email", { params: { view, page, limit: 100, ...(query ? { q: query } : {}) } })
      .then((res) => {
        if (off) return;
        setError("");
        setData((prev) => (page > 1 && prev ? { ...res.data, rows: [...prev.rows, ...res.data.rows] } : res.data));
      })
      .catch((err) => !off && setError(errorText(err, "Couldn't load email")));
    return () => {
      off = true;
    };
  }, [reloadKey, key, view, page, query]);

  const pick = (v) => {
    setView(v);
    setPage(1);
    setPicked(new Set());
    setReason("");
  };
  const refresh = () => {
    setPage(1);
    setPicked(new Set());
    setKey((k) => k + 1);
    onChanged?.();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/hq/sync/klaviyo");
      const c = res.data.counts || {};
      toast.success(`Synced: ${c.received || 0} people sent to, ${c.clicked || 0} with clicks`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const act = async (path, body, done) => {
    setBusy(true);
    try {
      const res = await api.post(path, body);
      toast.success(done(res.data));
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Didn't work"));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const t = data.totals;
  const botShare = t.human + t.bot ? Math.round((t.bot / (t.human + t.bot)) * 100) : 0;
  const emails = [...picked];
  const allPicked = data.rows.length > 0 && data.rows.every((r) => picked.has(r.email));
  const toggle = (e) =>
    setPicked((s) => {
      const nx = new Set(s);
      if (nx.has(e)) nx.delete(e);
      else nx.add(e);
      return nx;
    });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Section
        title="Klaviyo"
        note={`Klaviyo is our content email (the weekly email and sequences). Emails from your own inbox are cold outreach and are logged on each facility. ${data.sync?.lastOkAt ? `Synced ${ago(data.sync.lastOkAt)}, every hour.` : "Not synced yet."}`}
        right={
          data.configured && (
            <Button size="small" variant="outlined" startIcon={<FiRefreshCw />} disabled={syncing} onClick={sync} sx={{ borderRadius: IOS.radius.round, flexShrink: 0 }}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          )
        }
      >
        {!data.configured && <NotConnected what="Klaviyo" env={["KLAVIYO_PRIVATE_KEY", "KLAVIYO_LIST_ID"]} />}
        {data.sync?.error && <Alert severity="warning" sx={{ mb: 2 }}>Last sync: {data.sync.error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1, mb: 2 }}>
          <Stat label="People emailed" value={n(t.people)} />
          <Stat label="Emails delivered" value={n(t.delivered)} />
          <Stat label="Real clicks" value={n(t.human)} tone={IOS.blue} />
          <Stat label="Scanner clicks (ignored)" value={n(t.bot)} detail={t.bot ? `${botShare}% of all clicks` : ""} />
        </Box>
        <Coverage c={data.coverage} onPick={pick} />
      </Section>

      <Section>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
          {VIEWS.map(([k, label]) => (
            <ButtonBase
              key={k}
              onClick={() => pick(k)}
              sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: view === k ? IOS.ink : tint("#000000", 0.05), color: view === k ? "#fff" : IOS.ink }}
            >
              {label}
              <Box component="span" sx={{ ml: 0.75, opacity: 0.6, ...num }}>{n(data.counts[k])}</Box>
            </ButtonBase>
          ))}
        </Box>
        {VIEW_NOTES[view] && <Typography sx={{ fontSize: 13.5, color: IOS.secondary, mb: 1.5 }}>{VIEW_NOTES[view]}</Typography>}

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1, minHeight: 40 }}>
          <TextField size="small" placeholder="Search email, name or group…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: "1 1 240px", maxWidth: 360, bgcolor: IOS.surface }} />
          {emails.length > 0 && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", ml: "auto" }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{emails.length} picked</Typography>
              {view === "suppressed" ? (
                <Button size="small" variant="contained" disableElevation disabled={busy} onClick={() => act("/hq/email/unsuppress", { emails }, (r) => `Klaviyo will email ${r.count} again`)}>
                  Start emailing again
                </Button>
              ) : view === "crmOnly" ? null : (
                <>
                  <TextField size="small" select value={reason} onChange={(e) => setReason(e.target.value)} SelectProps={{ displayEmpty: true }} sx={{ minWidth: 220, bgcolor: IOS.surface }}>
                    <MenuItem value="" disabled>
                      Why stop emailing them?
                    </MenuItem>
                    {Object.entries(data.reasons).map(([k, l]) => (
                      <MenuItem key={k} value={k}>{l}</MenuItem>
                    ))}
                  </TextField>
                  <Button size="small" variant="contained" color="error" disableElevation disabled={busy || !reason} onClick={() => act("/hq/email/suppress", { emails, reason }, (r) => `Klaviyo won't email ${r.count} anymore`)}>
                    Stop emailing in Klaviyo
                  </Button>
                </>
              )}
              {data.rows.some((r) => picked.has(r.email) && !r.inCrm) && (
                <Button size="small" variant="outlined" disabled={busy} onClick={() => act("/hq/email/add-to-crm", { emails: data.rows.filter((r) => picked.has(r.email) && !r.inCrm).map((r) => r.email) }, (r) => `Added ${r.added} to People`)}>
                  Add to the CRM
                </Button>
              )}
            </Box>
          )}
        </Box>

        {!data.rows.length && <Empty>No one here.</Empty>}
        {data.rows.length > 0 && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 760 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "40px minmax(240px, 2fr) 90px 90px 90px minmax(160px, 1.2fr)", gap: 1, alignItems: "center", px: 0.5, pb: 0.5, borderBottom: `1px solid ${IOS.separator}`, fontSize: 12, fontWeight: 700, color: IOS.secondary }}>
                {view === "crmOnly" ? <span /> : <Checkbox size="small" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(data.rows.map((r) => r.email)))} />}
                <span>Person</span>
                <span style={{ textAlign: "right" }}>Sent</span>
                <span style={{ textAlign: "right" }}>Real clicks</span>
                <span style={{ textAlign: "right" }}>Scanner</span>
                <span>Status</span>
              </Box>
              {data.rows.map((r) => {
                const c = r.contact;
                return (
                  <Box key={r.email} sx={{ display: "grid", gridTemplateColumns: "40px minmax(240px, 2fr) 90px 90px 90px minmax(160px, 1.2fr)", gap: 1, alignItems: "center", px: 0.5, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
                    {view === "crmOnly" ? <span /> : <Checkbox size="small" checked={picked.has(r.email)} onChange={() => toggle(r.email)} />}
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>{c?.name || r.email}</Typography>
                        {c && <RolePill role={c.role} />}
                        {!r.inCrm && <Tag color={IOS.orange}>Not in CRM</Tag>}
                      </Box>
                      <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>
                        {c ? [c.title, c.facilityName || c.group, r.email].filter(Boolean).join(" · ") : "Only an email address so far"}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13.5, textAlign: "right", ...num }}>{r.inKlaviyo ? n(r.delivered) : "–"}</Typography>
                    <Typography sx={{ fontSize: 13.5, textAlign: "right", fontWeight: r.humanClicks ? 700 : 400, color: r.humanClicks ? IOS.blue : IOS.tertiary, ...num }}>{r.inKlaviyo ? n(r.humanClicks) : "–"}</Typography>
                    <Typography sx={{ fontSize: 13.5, textAlign: "right", color: IOS.secondary, ...num }}>{r.inKlaviyo ? n(r.botClicks) : "–"}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: r.suppressed || r.unsubscribed ? IOS.redText : IOS.secondary }}>
                      {r.suppressed
                        ? `Stopped: ${data.reasons[r.suppressReason] || r.suppressReason}${r.suppressedAt ? `, ${ago(r.suppressedAt)}` : ""}`
                        : r.unsubscribed
                          ? "Unsubscribed"
                          : !r.inKlaviyo
                            ? "Never emailed by Klaviyo"
                            : r.lastHumanClickAt
                              ? `Last real click ${ago(r.lastHumanClickAt)}`
                              : "Getting emails"}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {data.rows.length < data.total && (
              <Button onClick={() => setPage((p) => p + 1)} sx={{ mt: 1.5 }}>
                Show more ({n(data.total - data.rows.length)} left)
              </Button>
            )}
          </Box>
        )}
      </Section>
    </Box>
  );
}
