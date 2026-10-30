import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Section } from "./HqBits";
import { errorText, num } from "./hqFormat";
import { AUDIENCES, CHANNEL_LABELS } from "./usePlaybookPlays";
import { PlayCard, PlayForm } from "./PlayCards";
import { targetText, weekLabel } from "./playFormat";

/** The week plan and tier rules, editable as a small table. */
function WeekPlan({ meta, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [m, setM] = useState(meta);
  const f = { size: "small", fullWidth: true, multiline: true, sx: { bgcolor: IOS.surface } };
  const save = async () => {
    try {
      await api.put("/hq/playbook/meta", m);
      setEdit(false);
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const [a, b] = m.founders?.length ? m.founders : ["Founder A", "Founder B"];
  return (
    <Section
      title="The week"
      note={m.note}
      right={
        !edit ? (
          <Button
            size="small"
            startIcon={<FiEdit2 />}
            onClick={() => {
              setM(meta);
              setEdit(true);
            }}
          >
            Edit
          </Button>
        ) : null
      }
    >
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 560, "& td, & th": { borderBottom: `1px solid ${IOS.hairline}`, p: 1, textAlign: "left", verticalAlign: "top", fontSize: 14 }, "& th": { fontSize: 12.5, color: IOS.secondary } }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Day</th>
              <th>{edit ? <TextField size="small" value={a} onChange={(e) => setM({ ...m, founders: [e.target.value, b] })} /> : a}</th>
              <th>{edit ? <TextField size="small" value={b} onChange={(e) => setM({ ...m, founders: [a, e.target.value] })} /> : b}</th>
            </tr>
          </thead>
          <tbody>
            {(edit ? m.week : meta.week).map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700 }}>{r.day}</td>
                {["a", "b"].map((k) => (
                  <td key={k}>
                    {edit ? <TextField {...f} value={r[k]} onChange={(e) => setM({ ...m, week: m.week.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} /> : r[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, mt: 2.5, mb: 0.75 }}>Which buildings get which plays</Typography>
      {(edit ? m.tierRules : meta.tierRules).map((r, i) => (
        <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px 1fr" }, gap: 1, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
          {edit ? (
            <>
              <TextField size="small" value={r.tier} onChange={(e) => setM({ ...m, tierRules: m.tierRules.map((x, j) => (j === i ? { ...x, tier: e.target.value } : x)) })} />
              <TextField {...f} value={r.plays} onChange={(e) => setM({ ...m, tierRules: m.tierRules.map((x, j) => (j === i ? { ...x, plays: e.target.value } : x)) })} />
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.tier}</Typography>
              <Typography sx={{ fontSize: 14 }}>{r.plays}</Typography>
            </>
          )}
        </Box>
      ))}
      {edit && (
        <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
          <TextField {...f} label="The number that matters most" value={m.northStar} onChange={(e) => setM({ ...m, northStar: e.target.value })} />
          <TextField {...f} label="Note" value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" disableElevation onClick={save}>Save</Button>
            <Button onClick={() => setEdit(false)}>Cancel</Button>
          </Box>
        </Box>
      )}
    </Section>
  );
}

/** The playbook: scoreboard, plays by buyer, and the week. */
export default function HqPlaybook({ reloadKey, audiences = null }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // play id, or "new"
  const [key, setKey] = useState(0);
  const refresh = () => setKey((k) => k + 1);

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

  const toggle = (id) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const forPage = audiences ? data.plays.filter((p) => p.audience.some((a) => audiences.includes(a))) : data.plays;
  const plays = forPage.filter((p) => !audience || p.audience.includes(audience));
  const scored = forPage.filter((p) => p.active && p.weeklyTarget);
  const thisWeek = data.weeks.length - 1;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {!audiences && data.meta.northStar && (
        <Box sx={{ p: 2, borderRadius: IOS.radius.card, bgcolor: "#0F172A", color: "#fff" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#94A3B8" }}>THE NUMBER THAT MATTERS MOST</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 600, mt: 0.5 }}>{data.meta.northStar}</Typography>
        </Box>
      )}

      <Section title="Scoreboard" note="This week against each play's target, and the three weeks before. Counted from what's logged in HQ: pick the marketing play when you log a call or email, and link content to its play.">
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 640, "& td, & th": { borderBottom: `1px solid ${IOS.hairline}`, py: 0.9, px: 1, fontSize: 14, textAlign: "right", ...num }, "& th": { fontSize: 12, color: IOS.secondary, fontWeight: 700 }, "& td:first-of-type, & th:first-of-type": { textAlign: "left" } }}>
            <thead>
              <tr>
                <th>Marketing play</th>
                <th>Target / week</th>
                {data.weeks.map((w, i) => (
                  <th key={w}>{i === thisWeek ? "This week" : weekLabel(w)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scored.map((p) => {
                const t = p.weeklyTarget;
                return (
                  <tr key={p._id}>
                    <td>
                      <ButtonBase
                        onClick={() => {
                          setOpen((s) => new Set(s).add(p._id));
                          setTimeout(() => document.getElementById(`play-${p._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                        }}
                        sx={{ fontSize: 14, fontWeight: 600, textAlign: "left" }}
                      >
                        {p.title}
                      </ButtonBase>
                    </td>
                    <td style={{ color: IOS.secondary }}>{targetText(p)}</td>
                    {p.done.map((d, i) => (
                      <td key={i} style={{ fontWeight: i === thisWeek ? 700 : 400, color: d >= t ? IOS.greenText : i === thisWeek ? IOS.ink : IOS.secondary }}>
                        {d}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Box>
        </Box>
      </Section>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        {(audiences ? [] : [["", "Every buyer"], ...Object.entries(AUDIENCES).map(([k, v]) => [k, v.label])]).map(([k, label]) => (
          <ButtonBase
            key={k || "all"}
            onClick={() => setAudience(k)}
            sx={{ px: 1.5, py: 0.6, borderRadius: IOS.radius.round, fontSize: 13.5, fontWeight: 600, bgcolor: audience === k ? IOS.ink : tint("#000000", 0.05), color: audience === k ? "#fff" : IOS.ink }}
          >
            {label}
          </ButtonBase>
        ))}
        <Button size="small" variant="outlined" startIcon={<FiPlus />} onClick={() => setEditing("new")} sx={{ ml: "auto", borderRadius: IOS.radius.round }}>
          Add marketing play
        </Button>
      </Box>

      {editing === "new" && (
        <Section title="New marketing play">
          <PlayForm
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
            onDeleted={() => setEditing(null)}
          />
        </Section>
      )}

      {Object.entries(CHANNEL_LABELS)
        .map(([ch, label]) => [ch, label, plays.filter((p) => p.channel === ch)])
        .filter(([, , list]) => list.length)
        .map(([ch, label, list]) => (
          <Box key={ch}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: IOS.secondary, textTransform: "uppercase", mb: 0.75 }}>{label}</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {list.map((p) => (
                <PlayCard
                  key={p._id}
                  play={p}
                  open={open.has(p._id)}
                  onToggle={() => toggle(p._id)}
                  editing={editing === p._id}
                  onEdit={() => setEditing(p._id)}
                  onDone={() => {
                    setEditing(null);
                    refresh();
                  }}
                />
              ))}
            </Box>
          </Box>
        ))}

      {!audiences && <WeekPlan key={JSON.stringify(data.meta)} meta={data.meta} onSaved={refresh} />}
    </Box>
  );
}
