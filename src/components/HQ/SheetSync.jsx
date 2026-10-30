import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { FiCopy, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { NotConnected, Section } from "./HqBits";
import { ago, errorText, n } from "./hqFormat";

// What a tab holds; "facilities:2" = call-list tier 2.
const OPTIONS = [
  ["", "Skip"],
  ["facilities:1", "Facilities: tier 1"],
  ["facilities:2", "Facilities: tier 2"],
  ["facilities:3", "Facilities: tier 3"],
  ["facilities:4", "Facilities: tier 4"],
  ["contacts:", "People (Lead Bank)"],
  ["activities:", "History (Outreach)"],
  ["linkedin:", "LinkedIn posts"],
];
const toValue = (kind, tier) => (kind ? `${kind}:${kind === "facilities" ? tier || 1 : ""}` : "");
const fromValue = (v) => {
  const [kind, tier] = v.split(":");
  return { kind, tier: tier ? Number(tier) : null };
};
const label = (v) => OPTIONS.find(([k]) => k === v)?.[1] || v;

/** Pull the CRM and call list straight from Google Sheets (instead of uploading files). */
export default function SheetSync({ reloadKey, onChanged }) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState(null); // { spreadsheetId, title, tabs: [{ name, value }] }
  const [syncing, setSyncing] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/sheets")
      .then((res) => !off && setCfg(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load sheet settings")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);

  const look = async () => {
    setLooking(true);
    try {
      const res = await api.post("/hq/sheets/tabs", { url });
      const saved = new Map((cfg?.sources || []).filter((s) => s.spreadsheetId === res.data.spreadsheetId).map((s) => [s.tab, toValue(s.kind, s.tier)]));
      setFound({
        spreadsheetId: res.data.spreadsheetId,
        title: res.data.title,
        tabs: res.data.tabs.map((t) => ({ name: t.name, value: saved.get(t.name) ?? toValue(t.kind, t.tier) })),
      });
    } catch (err) {
      toast.error(errorText(err, "Couldn't open that sheet"));
    } finally {
      setLooking(false);
    }
  };

  const save = async (sources) => {
    try {
      const res = await api.put("/hq/sheets", { sources });
      setCfg((c) => ({ ...c, sources: res.data.sources }));
      return true;
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
      return false;
    }
  };

  const saveFound = async () => {
    const others = (cfg?.sources || []).filter((s) => s.spreadsheetId !== found.spreadsheetId);
    const mine = found.tabs.filter((t) => t.value).map((t) => ({ spreadsheetId: found.spreadsheetId, title: found.title, tab: t.name, ...fromValue(t.value) }));
    if (await save([...others, ...mine])) {
      toast.success(`Saved ${mine.length} tab${mine.length === 1 ? "" : "s"}. Bringing them in…`);
      setFound(null);
      setUrl("");
      sync();
    }
  };

  const remove = (s) => save(cfg.sources.filter((x) => !(x.spreadsheetId === s.spreadsheetId && x.tab === s.tab)));

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/hq/sheets/sync", {});
      const bad = res.data.results.filter((r) => r.error).length;
      if (bad) toast.warn(`${bad} tab${bad === 1 ? "" : "s"} didn't sync. See below.`);
      else toast.success("Brought in from Google Sheets");
      setKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cfg.serviceAccountEmail);
      toast.success("Copied");
    } catch {
      toast.info(cfg.serviceAccountEmail);
    }
  };

  return (
    <Section
      title="Bring in from Google Sheets"
      note="HQ is the main record: edit people, facilities and history in HQ. Use this when you've added rows to the sheet. Only new rows, and cells you changed in the sheet since last time, come in, so your HQ edits stay."
      right={
        cfg?.sources?.length > 0 && (
          <Button size="small" variant="outlined" startIcon={<FiRefreshCw />} disabled={syncing} onClick={sync} sx={{ borderRadius: IOS.radius.round, textTransform: "none", flexShrink: 0 }}>
            {syncing ? "Bringing in…" : "Bring in now"}
          </Button>
        )
      }
      sx={{ gridColumn: "1 / -1" }}
    >
      {error && <Alert severity="error">{error}</Alert>}
      {!cfg && !error && <CircularProgress size={22} />}
      {cfg && !cfg.configured && <NotConnected what="Google" env={["GOOGLE_SERVICE_ACCOUNT_JSON"]} />}
      {cfg?.configured && (
        <>
          <Box sx={{ p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Typography sx={{ fontSize: 13.5 }}>
              First, in Google Sheets click <b>Share</b> and add this address as a <b>Viewer</b>:
            </Typography>
            <Box component="code" sx={{ fontSize: 12.5, bgcolor: IOS.surface, px: 1, py: 0.25, borderRadius: "6px", wordBreak: "break-all" }}>{cfg.serviceAccountEmail}</Box>
            <IconButton size="small" onClick={copy} aria-label="Copy email">
              <FiCopy size={14} />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField size="small" placeholder="Paste the Google Sheet link" value={url} onChange={(e) => setUrl(e.target.value)} sx={{ flex: "1 1 360px", bgcolor: IOS.surface }} />
            <Button variant="contained" disableElevation disabled={!url.trim() || looking} onClick={look} sx={{ borderRadius: IOS.radius.round }}>
              {looking ? "Opening…" : "Show tabs"}
            </Button>
          </Box>

          {found && (
            <Box sx={{ mt: 2, p: 1.5, border: `1px solid ${IOS.separator}`, borderRadius: IOS.radius.cell }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1 }}>{found.title}: what's on each tab?</Typography>
              {found.tabs.map((t, i) => (
                <Box key={t.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
                  <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0 }} noWrap>{t.name}</Typography>
                  <TextField
                    select
                    size="small"
                    value={t.value}
                    SelectProps={{ displayEmpty: true }}
                    onChange={(e) => setFound({ ...found, tabs: found.tabs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                    sx={{ width: 220 }}
                  >
                    {OPTIONS.map(([v, l]) => (
                      <MenuItem key={v || "skip"} value={v}>{l}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              ))}
              <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                <Button variant="contained" disableElevation onClick={saveFound} disabled={!found.tabs.some((t) => t.value)} sx={{ borderRadius: IOS.radius.round }}>
                  Save and bring in
                </Button>
                <Button onClick={() => setFound(null)}>Cancel</Button>
              </Box>
            </Box>
          )}

          {cfg.sources.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>
                {cfg.sources.length} tab{cfg.sources.length === 1 ? "" : "s"} linked
                <Box component="span" sx={{ fontWeight: 400, color: IOS.secondary, fontSize: 13, ml: 1 }}>
                  {cfg.lastOkAt ? `last brought in ${ago(cfg.lastOkAt)}` : cfg.lastRunAt ? `last tried ${ago(cfg.lastRunAt)}` : "not brought in yet"}
                </Box>
              </Typography>
              {cfg.sources.map((s) => {
                const r = (cfg.lastResults || []).find((x) => x.label === `${s.title || "Sheet"} › ${s.tab}`);
                return (
                  <Box key={`${s.spreadsheetId}:${s.tab}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {s.title} › <b>{s.tab}</b>
                        <Box component="span" sx={{ color: IOS.secondary }}> · {label(toValue(s.kind, s.tier))}</Box>
                      </Typography>
                      {r && (
                        <Typography sx={{ fontSize: 12.5, color: r.error ? IOS.redText : IOS.secondary }}>
                          {r.error || `${n(r.usable)} rows · ${n(r.created || 0)} new · ${n(r.updated || 0)} changed · ${n(r.unchanged || 0)} same${r.skipped ? ` · ${n(r.skipped)} skipped` : ""}`}
                        </Typography>
                      )}
                    </Box>
                    <IconButton size="small" aria-label="Unlink this tab" onClick={() => remove(s)}>
                      <FiTrash2 size={15} />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}
    </Section>
  );
}
