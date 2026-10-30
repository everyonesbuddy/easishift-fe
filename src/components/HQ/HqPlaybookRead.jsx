import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, GlobalStyles, TextField, Typography } from "@mui/material";
import { FiArrowRight, FiEdit2, FiPrinter } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Tag } from "./HqBits";
import { errorText } from "./hqFormat";
import { AUDIENCES, CHANNEL_LABELS } from "./usePlaybookPlays";
import { targetSentence, targetText } from "./playFormat";

const PAGE_FOR = { scheduler: "schedulers", director: "leadership", operator: "leadership" };

const H = ({ children, sub }) => (
  <Box sx={{ mt: 5, mb: 1.5 }}>
    <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{children}</Typography>
    {sub && <Typography sx={{ color: IOS.secondary, fontSize: 14.5, mt: 0.25 }}>{sub}</Typography>}
  </Box>
);
const P = ({ children }) => <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: IOS.ink, maxWidth: 820 }}>{children}</Typography>;

function Flow() {
  const box = (label, sub, color) => (
    <Box sx={{ flex: "1 1 160px", p: 1.5, borderRadius: "12px", bgcolor: tint(color, 0.08), border: `1px solid ${tint(color, 0.25)}` }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.25 }}>{sub}</Typography>
    </Box>
  );
  const arrow = <Box sx={{ alignSelf: "center", color: IOS.tertiary, display: { xs: "none", md: "block" } }}><FiArrowRight /></Box>;
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: { xs: "wrap", md: "nowrap" }, my: 2 }}>
      {box("Channels", "Calls, email, LinkedIn, newsletter, YouTube, search, Facebook groups", IOS.blue)}
      {arrow}
      {box("A free offer", "Free setup · free labor snapshot · free calculators", "#5856D6")}
      {arrow}
      {box("Free account", "The scheduler builds and sends the week", IOS.orange)}
      {arrow}
      {box("Monday labor email", "Leadership sees hours per resident day, overtime, call-outs", "#AF52DE")}
      {arrow}
      {box("Paid", "Flat price per facility", IOS.green)}
    </Box>
  );
}

/** Editing the written parts: plain text boxes, saved together. */
function EditText({ meta, onSaved, onCancel }) {
  const [m, setM] = useState(meta);
  const f = { size: "small", fullWidth: true, multiline: true, sx: { bgcolor: IOS.surface } };
  const save = async () => {
    try {
      await api.put("/hq/playbook/meta", m);
      toast.success("Playbook saved");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const setBuyer = (i, k, v) => setM({ ...m, buyers: m.buyers.map((b, j) => (j === i ? { ...b, [k]: v } : b)) });
  const setChannel = (i, v) => setM({ ...m, channels: m.channels.map((c, j) => (j === i ? { ...c, why: v } : c)) });
  return (
    <Box sx={{ display: "grid", gap: 2, maxWidth: 900 }}>
      <TextField {...f} label="The number that matters most" value={m.northStar || ""} onChange={(e) => setM({ ...m, northStar: e.target.value })} />
      <TextField {...f} minRows={4} label="How we sell" value={m.overview || ""} onChange={(e) => setM({ ...m, overview: e.target.value })} />
      <TextField {...f} minRows={3} label="How the channels connect" value={m.connect || ""} onChange={(e) => setM({ ...m, connect: e.target.value })} />
      {(m.buyers || []).map((b, i) => (
        <Box key={b.key || i} sx={{ display: "grid", gap: 1, p: 1.5, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell }}>
          <TextField {...f} multiline={false} label="Buyer" value={b.name} onChange={(e) => setBuyer(i, "name", e.target.value)} />
          {[
            ["who", "Who they are"],
            ["cares", "What they care about"],
            ["where", "Where to find them"],
            ["offer", "The offer"],
            ["how", "How we reach them"],
          ].map(([k, l]) => (
            <TextField key={k} {...f} label={l} value={b[k] || ""} onChange={(e) => setBuyer(i, k, e.target.value)} />
          ))}
        </Box>
      ))}
      {(m.channels || []).map((c, i) => (
        <TextField key={c.key || i} {...f} label={`${c.name}: why this channel`} value={c.why} onChange={(e) => setChannel(i, e.target.value)} />
      ))}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" disableElevation onClick={save}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
}

/** The marketing playbook, written out for anyone on the team to read (and print). */
export default function HqPlaybookRead({ reloadKey }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/playbook")
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load the playbook")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const { meta } = data;
  const plays = data.plays.filter((p) => p.active);

  if (edit) {
    return (
      <EditText
        meta={meta}
        onSaved={() => {
          setEdit(false);
          setKey((k) => k + 1);
        }}
        onCancel={() => setEdit(false)}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <GlobalStyles styles={{ "@media print": { "[data-hq-chrome]": { display: "none !important" }, body: { background: "#fff" } } }} />
      <Box data-hq-chrome sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button size="small" variant="outlined" startIcon={<FiEdit2 />} onClick={() => setEdit(true)} sx={{ borderRadius: IOS.radius.round }}>
          Edit the text
        </Button>
        <Button size="small" variant="outlined" startIcon={<FiPrinter />} onClick={() => window.print()} sx={{ borderRadius: IOS.radius.round }}>
          Print or save as PDF
        </Button>
      </Box>

      {meta.northStar && (
        <Box sx={{ p: 2.25, borderRadius: IOS.radius.card, bgcolor: "#0F172A", color: "#fff" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#94A3B8" }}>THE NUMBER THAT MATTERS MOST</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 600, mt: 0.5 }}>{meta.northStar}</Typography>
        </Box>
      )}

      <H>How we sell</H>
      <P>{meta.overview}</P>
      <Flow />
      <P>{meta.connect}</P>

      <H sub="Three buyers. Each has its own page under Plays with what to do today, their plays and their content.">Who we sell to</H>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
        {(meta.buyers || []).map((b) => {
          const color = AUDIENCES[b.key]?.color || IOS.blue;
          return (
            <Box key={b.key} sx={{ p: 2, borderRadius: IOS.radius.card, bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderTop: `4px solid ${color}`, breakInside: "avoid" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 17, color }}>{b.name}</Typography>
              {[
                ["Who", b.who],
                ["They care about", b.cares],
                ["Where they are", b.where],
                ["The offer", b.offer],
                ["How we reach them", b.how],
              ].map(([k, v]) => (
                <Box key={k} sx={{ mt: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</Typography>
                  <Typography sx={{ fontSize: 14.5, lineHeight: 1.55 }}>{v}</Typography>
                </Box>
              ))}
              {PAGE_FOR[b.key] && (
                <Button data-hq-chrome size="small" endIcon={<FiArrowRight />} onClick={() => navigate(`/hq/${PAGE_FOR[b.key]}`)} sx={{ mt: 1.5, px: 0 }}>
                  Their plays
                </Button>
              )}
            </Box>
          );
        })}
      </Box>

      <H sub="What each channel is for, and the plays we run on it.">The channels</H>
      {(meta.channels || []).map((c) => {
        const list = plays.filter((p) => p.channel === c.key || (c.key === "blog" && p.channel === "search"));
        return (
          <Box key={c.key} sx={{ py: 2, borderBottom: `1px solid ${IOS.separator}`, breakInside: "avoid" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{c.name || CHANNEL_LABELS[c.key]}</Typography>
            <Typography sx={{ fontSize: 15, color: IOS.secondary, mt: 0.25, maxWidth: 820 }}>{c.why}</Typography>
            {list.map((p) => (
              <Box key={p._id} sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap", mt: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{p.title}</Typography>
                {p.audience.map((a) => (AUDIENCES[a] ? <Tag key={a} color={AUDIENCES[a].color}>{AUDIENCES[a].short}</Tag> : null))}
                <Typography sx={{ fontSize: 14, color: IOS.secondary, flexBasis: "100%" }}>
                  {p.goal}
                  {p.weeklyTarget ? ` Target: ${targetSentence(p)}.` : ""}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      })}

      <H sub={meta.note}>The week</H>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td, & th": { borderBottom: `1px solid ${IOS.hairline}`, p: 1, textAlign: "left", verticalAlign: "top", fontSize: 14.5 }, "& th": { fontSize: 12.5, color: IOS.secondary } }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}>Day</th>
            <th>{meta.founders?.[0] || "Founder A"}</th>
            <th>{meta.founders?.[1] || "Founder B"}</th>
          </tr>
        </thead>
        <tbody>
          {(meta.week || []).map((r) => (
            <tr key={r.day}>
              <td style={{ fontWeight: 700 }}>{r.day}</td>
              <td>{r.a}</td>
              <td>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </Box>

      <H>Which buildings get which plays</H>
      {(meta.tierRules || []).map((r) => (
        <Box key={r.tier} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px 1fr" }, gap: 1, py: 1, borderBottom: `1px solid ${IOS.hairline}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{r.tier}</Typography>
          <Typography sx={{ fontSize: 14.5 }}>{r.plays}</Typography>
        </Box>
      ))}

      <H sub="Each play's weekly target. The live scoreboard is under Plays → The overall plan.">How we keep score</H>
      {plays
        .filter((p) => p.weeklyTarget)
        .map((p) => (
          <Box key={p._id} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
            <Typography sx={{ fontSize: 14.5 }}>{p.title}</Typography>
            <Typography sx={{ fontSize: 14.5, color: IOS.secondary, whiteSpace: "nowrap" }}>{targetText(p)}</Typography>
          </Box>
        ))}
    </Box>
  );
}
