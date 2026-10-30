import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { FiCheckCircle, FiCircle, FiDownload, FiUpload } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Section } from "./HqBits";
import { ago, errorText, n } from "./hqFormat";
import { guessSheet, readWorkbook, sheetToCsv } from "./xlsxToCsv";
import SheetSync from "./SheetSync";

const IMPORTS = {
  facilities: {
    label: "Facilities: call-list tier sheet",
    help: "One tier tab at a time (1 Close First, 2 Next Up, …). The tier is read from the tab name. Re-uploading updates rows by Call ID.",
  },
  contacts: {
    label: "People: CRM Lead Bank",
    help: "The Lead Bank tab. Import the call-list tiers first so people link to those buildings (by Old Lead ID). Titles become roles (DON, ED, regional…); entry-point buildings not on the call list are added.",
  },
  activities: {
    label: "History: CRM Outreach",
    help: "The Outreach tab. Calls, discovery meetings and email replies become history on each person (import the Lead Bank first).",
  },
  linkedin: {
    label: "LinkedIn post analytics",
    help: "LinkedIn → your profile → Analytics → Post impressions → Export, then save the posts tab as CSV.",
  },
};

/** Which outside sources are connected (keys are set on the server), and CSV imports. */
export default function HqConnections({ reloadKey, onChanged }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("facilities");
  const [tier, setTier] = useState("1");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [workbook, setWorkbook] = useState(null); // { wb, names }
  const [sheet, setSheet] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/connections")
      .then((res) => !off && setList(res.data.connections))
      .catch((err) => !off && setError(errorText(err, "Couldn't load connections")));
    return () => {
      off = true;
    };
  }, [reloadKey]);

  const download = async (kind) => {
    try {
      const res = await api.get(`/hq/export/${kind}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wisershifts-hq-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorText(err, "Couldn't download"));
    }
  };

  const pickFile = async (f) => {
    setFile(f);
    setPreview(null);
    setWorkbook(null);
    setSheet("");
    if (!f || !/\.xlsx$/i.test(f.name)) return;
    try {
      const wb = await readWorkbook(f);
      const names = wb.worksheets.map((w) => w.name);
      setWorkbook({ wb, names });
      const g = guessSheet(names, kind);
      setSheet(g);
      const t = g.match(/^\s*([1-4])\s/);
      if (t) setTier(t[1]);
    } catch {
      toast.error("Couldn't read that Excel file. Try saving the tab as CSV.");
    }
  };

  const send = async (dryRun) => {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    if (workbook) {
      const ws = workbook.wb.getWorksheet(sheet);
      form.append("file", new Blob([sheetToCsv(ws)], { type: "text/csv" }), `${sheet}.csv`);
    } else form.append("file", file);
    if (kind === "facilities") form.append("tier", tier);
    form.append("dryRun", dryRun ? "1" : "0");
    try {
      const res = await api.post(`/hq/import/${kind}`, form);
      if (dryRun) setPreview(res.data);
      else {
        const r = res.data;
        toast.success(`Imported: ${r.created} new, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ""}`);
        setPreview(null);
        if (!workbook) {
          setFile(null);
          if (input.current) input.current.value = "";
        }
        onChanged?.();
      }
    } catch (err) {
      toast.error(errorText(err, "Import failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, alignItems: "start" }}>
      <SheetSync reloadKey={reloadKey} onChanged={onChanged} />
      <Section title="Download a backup" note="Everything in HQ as spreadsheets you can open in Excel or Google Sheets." sx={{ gridColumn: "1 / -1" }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[
            ["facilities", "Facilities"],
            ["contacts", "People"],
            ["activities", "History"],
          ].map(([k, l]) => (
            <Button key={k} variant="outlined" startIcon={<FiDownload />} onClick={() => download(k)} sx={{ borderRadius: IOS.radius.round }}>
              {l}
            </Button>
          ))}
        </Box>
      </Section>
      <Section title="Connections" note="Keys live on the server (Heroku config vars), never in the browser. Add the ones listed and reload.">
        {error && <Alert severity="error">{error}</Alert>}
        {!list && !error && <CircularProgress size={22} />}
        {list?.map((c) => (
          <Box key={c.key} sx={{ display: "flex", gap: 1.5, py: 1.25, borderBottom: `1px solid ${IOS.hairline}` }}>
            <Box sx={{ pt: 0.25, color: c.configured ? IOS.green : IOS.tertiary }}>{c.configured ? <FiCheckCircle /> : <FiCircle />}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>
                {c.name}
                <Box component="span" sx={{ fontWeight: 500, fontSize: 13, color: c.configured ? IOS.greenText : IOS.secondary, ml: 1 }}>
                  {c.key === "linkedin" ? (c.posts ? `${n(c.posts)} post${c.posts === 1 ? "" : "s"} uploaded` : "No upload yet") : c.configured ? "Connected" : "Not connected"}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{c.what}</Typography>
              {!c.configured && c.env.length > 0 && (
                <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
                  Needs:{" "}
                  {c.env.map((e) => (
                    <Box key={e} component="code" sx={{ fontSize: 12, bgcolor: IOS.fill, px: 0.5, mr: 0.5, borderRadius: "4px" }}>{e}</Box>
                  ))}
                </Typography>
              )}
              {c.lastOkAt && <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>Last good sync {ago(c.lastOkAt)}</Typography>}
              {c.error && c.error !== "not_configured" && <Typography sx={{ fontSize: 12.5, color: IOS.redText }}>{c.error}</Typography>}
            </Box>
          </Box>
        ))}
      </Section>

      <Section title="Or upload a file" note="Upload an Excel workbook and pick the tab, or a CSV of one tab. You'll see a preview before anything is saved.">
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <TextField
            select
            size="small"
            label="What is this file?"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPreview(null);
              if (workbook) setSheet(guessSheet(workbook.names, e.target.value));
            }}
          >
            {Object.entries(IMPORTS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v.label}</MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{IMPORTS[kind].help}</Typography>
          {workbook && (
            <TextField
              select
              size="small"
              label="Sheet"
              value={sheet}
              onChange={(e) => {
                setSheet(e.target.value);
                setPreview(null);
                const t = e.target.value.match(/^\s*([1-4])\s/);
                if (t && kind === "facilities") setTier(t[1]);
              }}
              sx={{ maxWidth: 320 }}
            >
              {workbook.names.map((nm) => (
                <MenuItem key={nm} value={nm}>{nm}</MenuItem>
              ))}
            </TextField>
          )}
          {kind === "facilities" && (
            <TextField select size="small" label="Tier" value={tier} onChange={(e) => setTier(e.target.value)} sx={{ maxWidth: 220 }}>
              <MenuItem value="1">1 Close First</MenuItem>
              <MenuItem value="2">2 Next Up</MenuItem>
              <MenuItem value="3">3 Later</MenuItem>
              <MenuItem value="4">4 Long Shots</MenuItem>
            </TextField>
          )}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Button component="label" variant="outlined" startIcon={<FiUpload />} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
              {file ? file.name : "Choose CSV or Excel file"}
              <input
                ref={input}
                hidden
                type="file"
                accept=".csv,text/csv,.xlsx"
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Button variant="contained" disableElevation disabled={!file || busy} onClick={() => send(true)} sx={{ borderRadius: IOS.radius.round }}>
              {busy && !preview ? "Reading…" : "Preview"}
            </Button>
          </Box>
          {preview && (
            <Box sx={{ p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                {n(preview.usable)} of {n(preview.totalRows)} rows can be imported
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.25 }}>Columns recognized: {preview.matchedColumns.join(", ")}</Typography>
              <Box component="pre" sx={{ fontSize: 11.5, bgcolor: IOS.surface, p: 1, borderRadius: "8px", maxHeight: 220, overflow: "auto", mt: 1 }}>
                {JSON.stringify(preview.sample.slice(0, 3), null, 2)}
              </Box>
              <Button variant="contained" disableElevation disabled={busy || !preview.usable} onClick={() => send(false)} sx={{ mt: 1, borderRadius: IOS.radius.round }}>
                {busy ? "Importing…" : `Import ${n(preview.usable)} rows`}
              </Button>
            </Box>
          )}
        </Box>
      </Section>
    </Box>
  );
}
