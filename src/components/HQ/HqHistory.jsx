// HQ history: look back at last week, last month or any dates. Per campaign:
// how many got done against its target, what happened on the calls and
// emails, and the log of everything that was done.
import { useCallback, useEffect, useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import { FiChevronDown, FiChevronRight, FiExternalLink } from "react-icons/fi";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Stat, Tag, Empty } from "./HqBits";
import { num } from "./hqFormat";

const PICK = [
  ["last_week", "Last week"],
  ["last_4_weeks", "Last 4 weeks"],
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["custom", "Pick dates"],
];
const OUTCOME_COLOR = (label) =>
  /Booked|replied|Talked/i.test(label) ? IOS.greenText : /Call back/i.test(label) ? IOS.blue : /voicemail|No answer|no reply/i.test(label) ? IOS.secondary : /Not interested|Wrong number|No longer/i.test(label) ? IOS.orangeText : IOS.secondary;
const stamp = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Bar({ done, target }) {
  const pct = target ? Math.min(100, Math.round((done / target) * 100)) : done ? 100 : 0;
  return (
    <Box sx={{ flex: 1, height: 8, borderRadius: 8, bgcolor: IOS.fill, overflow: "hidden", minWidth: 80 }}>
      <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: target && done >= target ? IOS.green : IOS.blue }} />
    </Box>
  );
}

function PlayHistory({ p }) {
  const [open, setOpen] = useState(false);
  const met = p.target && p.done >= p.target;
  return (
    <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.cell, p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15.5, flex: "1 1 auto" }}>{p.title}</Typography>
        {!p.active && <Tag>Paused</Tag>}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1, maxWidth: 520 }}>
        <Bar done={p.done} target={p.target} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: met ? IOS.greenText : IOS.ink, ...num }}>
          {p.target ? `${p.done} of ${p.target}` : p.done} {p.unit}
        </Typography>
      </Box>
      {p.outcomes.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
          {p.outcomes.map(([label, n]) => (
            <Box key={label} sx={{ px: 1, py: 0.25, borderRadius: IOS.radius.pill, bgcolor: IOS.canvas, fontSize: 12.5, fontFamily: IOS.font }}>
              <Box component="span" sx={{ fontWeight: 700, color: OUTCOME_COLOR(label), ...num }}>{n}</Box> {label.toLowerCase()}
            </Box>
          ))}
        </Box>
      )}
      {p.entries.length > 0 && (
        <ButtonBase onClick={() => setOpen((v) => !v)} sx={{ mt: 1, fontSize: 13, fontWeight: 600, color: IOS.blue, gap: 0.5 }}>
          {open ? <FiChevronDown /> : <FiChevronRight />}
          {open ? "Hide the log" : `See the log (${p.entries.length + p.more})`}
        </ButtonBase>
      )}
      {open && (
        <Box sx={{ mt: 0.75, borderTop: `1px solid ${IOS.hairline}` }}>
          {p.entries.map((e, i) => (
            <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "110px 1fr" }, gap: { xs: 0, sm: 1.5 }, py: 0.9, borderBottom: `1px solid ${IOS.hairline}` }}>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>{stamp(e.at)}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5 }}>
                  <Box component="span" sx={{ color: IOS.secondary }}>{e.kind}{e.who ? " · " : ""}</Box>
                  {e.who}
                  {e.url && (
                    <Box component="a" href={e.url} target="_blank" rel="noreferrer" sx={{ ml: 0.75, color: IOS.blue, verticalAlign: "-1px" }} aria-label="Open">
                      <FiExternalLink size={12} />
                    </Box>
                  )}
                </Typography>
                {(e.outcome || e.notes) && (
                  <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                    {e.outcome && <Box component="span" sx={{ fontWeight: 600, color: OUTCOME_COLOR(e.outcome) }}>{e.outcome}</Box>}
                    {e.outcome && e.notes ? ": " : ""}
                    {e.notes}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
          {p.more > 0 && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, pt: 1 }}>And {p.more} more. Pick a shorter period to see them.</Typography>}
        </Box>
      )}
    </Box>
  );
}

export default function HqHistory() {
  const [range, setRange] = useState("last_week");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 13 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/hq/week/history", { params: { range, ...(range === "custom" ? { from, to } : {}) } });
      setData(d);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't load the history.");
    } finally {
      setLoading(false);
    }
  }, [range, from, to]);
  useEffect(() => {
    load();
  }, [load]);

  const t = data?.totals;
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderRadius: IOS.radius.card, p: { xs: 2, md: 2.5 } }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>{data ? data.range.span : " "}</Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", mt: 0.25 }}>{data ? `What got done: ${data.range.label.toLowerCase()}` : "What got done"}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5, alignItems: "center" }}>
          {PICK.map(([k, label]) => (
            <ButtonBase
              key={k}
              onClick={() => setRange(k)}
              sx={{ px: 1.5, py: 0.6, borderRadius: IOS.radius.round, fontSize: 13.5, fontWeight: 600, bgcolor: range === k ? IOS.ink : IOS.fill, color: range === k ? IOS.surface : IOS.ink }}
            >
              {label}
            </ButtonBase>
          ))}
          {range === "custom" && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", ml: { sm: 1 } }}>
              <TextField type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>
          )}
          {loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
        </Box>
        {t && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))", lg: "repeat(7, minmax(0, 1fr))" }, gap: 1, mt: 2 }}>
            <Stat label="Calls" value={t.calls} />
            <Stat label="Emails" value={t.emails} />
            <Stat label="Facebook" value={t.facebook} detail="group and people touches" />
            <Stat label="Published" value={t.published} detail="posts, videos, emails" />
            <Stat label="Setups booked" value={t.booked} tone={t.booked ? IOS.greenText : undefined} />
            <Stat label="Replies" value={t.replies} tone={t.replies ? IOS.greenText : undefined} />
            <Stat label="New signups" value={t.signups} tone={t.signups ? IOS.greenText : undefined} />
          </Box>
        )}
      </Box>

      {err && (
        <Box sx={{ color: IOS.redText, fontSize: 14 }}>
          {err} <Button size="small" onClick={load}>Try again</Button>
        </Box>
      )}
      {data && !data.plays.length && <Empty>Nothing was logged in this period.</Empty>}
      {data && data.plays.length > 0 && (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
            Each campaign against its target for this period{data.range.days === 7 ? "." : ` (its weekly target × ${Math.round((data.range.days / 7) * 10) / 10} weeks).`}
          </Typography>
          {data.plays.map((p) => (
            <PlayHistory key={p._id} p={p} />
          ))}
        </Box>
      )}
    </Box>
  );
}
