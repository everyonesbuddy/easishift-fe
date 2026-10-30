import { useState } from "react";
import { Box, Button, ButtonBase, IconButton, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { FiChevronDown, FiChevronUp, FiCopy, FiEdit2, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Tag } from "./HqBits";
import { errorText, num } from "./hqFormat";
import { DeleteButton } from "./FacilityParts";
import { AUDIENCES, CHANNEL_LABELS, invalidatePlays } from "./usePlaybookPlays";
import { COUNTS, copyText } from "./playFormat";

export function AudiencePills({ list }) {
  return list.map((a) => (AUDIENCES[a] ? <Tag key={a} color={AUDIENCES[a].color}>{AUDIENCES[a].short}</Tag> : null));
}


/** Edit (or add) a play. */
export function PlayForm({ play, onSaved, onCancel, onDeleted }) {
  const [p, setP] = useState({
    title: play?.title || "",
    channel: play?.channel || "calls",
    audience: play?.audience || [],
    who: play?.who || "",
    goal: play?.goal || "",
    when: play?.when || "",
    steps: (play?.steps || []).join("\n"),
    scripts: play?.scripts?.length ? play.scripts : [],
    volume: play?.volume || "",
    weeklyTarget: play?.weeklyTarget ?? "",
    targetUnit: play?.targetUnit || "",
    countsFrom: play?.countsFrom || "activities",
    measure: play?.measure || "",
    active: play?.active !== false,
  });
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const f = { size: "small", fullWidth: true, sx: { bgcolor: IOS.surface } };
  const save = async () => {
    const body = { ...p, steps: p.steps.split("\n").map((x) => x.trim()).filter(Boolean), weeklyTarget: p.weeklyTarget === "" ? null : Number(p.weeklyTarget) };
    try {
      if (play?._id) await api.patch(`/hq/playbook/plays/${play._id}`, body);
      else await api.post("/hq/playbook/plays", body);
      invalidatePlays();
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save"));
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/hq/playbook/plays/${play._id}`);
      invalidatePlays();
      onDeleted();
    } catch (err) {
      toast.error(errorText(err, "Couldn't remove"));
    }
  };
  const setScript = (i, k, v) => setP({ ...p, scripts: p.scripts.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25, mt: 1 }}>
      <TextField {...f} label="Name of the play" value={p.title} onChange={set("title")} sx={{ ...f.sx, gridColumn: "1 / -1" }} />
      <TextField {...f} select label="Channel" value={p.channel} onChange={set("channel")}>
        {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
          <MenuItem key={k} value={k}>{v}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 13, color: IOS.secondary, mr: 0.5 }}>For:</Typography>
        {Object.entries(AUDIENCES).map(([k, v]) => {
          const on = p.audience.includes(k);
          return (
            <ButtonBase
              key={k}
              onClick={() => setP({ ...p, audience: on ? p.audience.filter((x) => x !== k) : [...p.audience, k] })}
              sx={{ px: 1.25, py: 0.5, borderRadius: IOS.radius.round, fontSize: 13, fontWeight: 600, bgcolor: on ? v.color : tint(v.color, 0.1), color: on ? "#fff" : v.color }}
            >
              {v.short}
            </ButtonBase>
          );
        })}
      </Box>
      <TextField {...f} label="Who" value={p.who} onChange={set("who")} />
      <TextField {...f} label="Goal" value={p.goal} onChange={set("goal")} />
      <TextField {...f} label="When" value={p.when} onChange={set("when")} sx={{ ...f.sx, gridColumn: "1 / -1" }} />
      <TextField {...f} multiline minRows={3} label="Steps (one per line)" value={p.steps} onChange={set("steps")} sx={{ ...f.sx, gridColumn: "1 / -1" }} />
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>Scripts and emails</Typography>
        {p.scripts.map((s, i) => (
          <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px 1fr auto" }, gap: 1, mb: 1, alignItems: "start" }}>
            <Box sx={{ display: "grid", gap: 1 }}>
              <TextField {...f} label="Label" value={s.label} onChange={(e) => setScript(i, "label", e.target.value)} />
              <TextField {...f} label="Subject (emails)" value={s.subject || ""} onChange={(e) => setScript(i, "subject", e.target.value)} />
            </Box>
            <TextField {...f} multiline minRows={3} label="Text" value={s.body} onChange={(e) => setScript(i, "body", e.target.value)} />
            <DeleteButton onConfirm={() => setP({ ...p, scripts: p.scripts.filter((_, j) => j !== i) })} label="Remove" size={14} />
          </Box>
        ))}
        <Button size="small" startIcon={<FiPlus />} onClick={() => setP({ ...p, scripts: [...p.scripts, { label: "", subject: "", body: "" }] })}>
          Add a script
        </Button>
      </Box>
      <TextField {...f} label="Volume (in words)" value={p.volume} onChange={set("volume")} />
      <TextField {...f} label="What to measure" value={p.measure} onChange={set("measure")} />
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField {...f} type="number" label="Weekly target" value={p.weeklyTarget} onChange={set("weeklyTarget")} inputProps={{ step: 0.5, min: 0 }} />
        <TextField {...f} label="of what" placeholder="calls" value={p.targetUnit} onChange={set("targetUnit")} />
      </Box>
      <TextField {...f} select label="Scoreboard counts" value={p.countsFrom} onChange={set("countsFrom")}>
        {Object.entries(COUNTS).map(([k, v]) => (
          <MenuItem key={k} value={k}>{v}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="contained" disableElevation onClick={save} disabled={!p.title.trim()}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
          <Switch size="small" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />
          <Typography sx={{ fontSize: 13 }}>Running</Typography>
        </Box>
        {play?._id && (
          <Box sx={{ ml: "auto" }}>
            <DeleteButton onConfirm={remove} label="Remove play" />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function PlayCard({ play, open, onToggle, editing, onEdit, onDone }) {
  const thisWeek = play.done[play.done.length - 1];
  return (
    <Box id={`play-${play._id}`} sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.cell, p: 2, opacity: play.active ? 1 : 0.6, scrollMarginTop: 80 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <ButtonBase onClick={onToggle} sx={{ flex: 1, minWidth: 0, display: "block", textAlign: "left" }}>
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap", mb: 0.25 }}>
            <Tag color={IOS.blue}>{CHANNEL_LABELS[play.channel] || play.channel}</Tag>
            <AudiencePills list={play.audience} />
            {!play.active && <Tag>Paused</Tag>}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{play.title}</Typography>
          {play.goal && <Typography sx={{ fontSize: 13.5, color: IOS.secondary }}>Goal: {play.goal}</Typography>}
        </ButtonBase>
        {play.weeklyTarget ? (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: thisWeek >= play.weeklyTarget ? IOS.greenText : IOS.ink, ...num }}>
              {thisWeek}
              <Box component="span" sx={{ color: IOS.tertiary, fontSize: 14 }}> / {play.weeklyTarget < 1 ? "½" : play.weeklyTarget}</Box>
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: IOS.secondary }}>{play.targetUnit} this week</Typography>
          </Box>
        ) : null}
        <IconButton size="small" onClick={onToggle} aria-label={open ? "Close" : "Open"}>
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </IconButton>
      </Box>

      {open && !editing && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${IOS.hairline}` }}>
          {[
            ["Who", play.who],
            ["When", play.when],
            ["Volume", play.volume],
            ["Measure", play.measure],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <Typography key={k} sx={{ fontSize: 14, mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>{k}: </Box>
                {v}
              </Typography>
            ))}
          {play.steps.length > 0 && (
            <Box component="ol" sx={{ pl: 2.5, my: 1, "& li": { fontSize: 14, mb: 0.5 } }}>
              {play.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </Box>
          )}
          {play.scripts.map((s, i) => (
            <Box key={i} sx={{ bgcolor: IOS.canvas, borderRadius: "10px", p: 1.5, mb: 1 }}>
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
          <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 1 }}>Scoreboard counts: {COUNTS[play.countsFrom]}.</Typography>
          <Button size="small" startIcon={<FiEdit2 />} onClick={onEdit} sx={{ mt: 1 }}>
            Edit this play
          </Button>
        </Box>
      )}
      {open && editing && <PlayForm play={play} onSaved={onDone} onCancel={onDone} onDeleted={onDone} />}
    </Box>
  );
}

