import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "../../../config/api";
import { IOS } from "../../../theme/ios";
import { dayLabel, money } from "./laborFormat";

const num = { fontVariantNumeric: "tabular-nums" };
const fmt = (n, digits = 1) => Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });

/**
 * A small line over the weeks. Finished weeks are solid; the current week
 * (still filling in) is a hollow dot on a dashed segment. Optional target
 * line (hours per resident day).
 */
function Spark({ points, target = null, color }) {
  const W = 260;
  const H = 64;
  const P = 6;
  const values = points.map((p) => p.value).filter((v) => v !== null);
  if (!values.length) return <Box sx={{ height: H }} />;
  const max = Math.max(...values, target ?? 0) * 1.1 || 1;
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const done = points.filter((p) => !p.inProgress && p.value !== null);
  const path = (list) => list.map((p, i) => `${i ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const lastDone = done[done.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden style={{ display: "block", overflow: "visible" }}>
      {target !== null && (
        <line x1={P} x2={W - P} y1={y(target)} y2={y(target)} stroke={IOS.ink} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.55" vectorEffect="non-scaling-stroke" />
      )}
      <path d={path(done)} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last?.inProgress && last.value !== null && lastDone && (
        <path d={`M${x(lastDone.i)},${y(lastDone.value)} L${x(last.i)},${y(last.value)}`} fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      )}
      {done.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r="2.4" fill={color} />
      ))}
      {last?.inProgress && last.value !== null && <circle cx={x(last.i)} cy={y(last.value)} r="3" fill={IOS.surface} stroke={color} strokeWidth="1.75" />}
    </svg>
  );
}

/**
 * Change between the average of the last 4 finished weeks and the 4 before,
 * in words ("Down 18% vs the 4 weeks before").
 */
function change(points, { lowerIsBetter }) {
  const done = points.filter((p) => !p.inProgress && p.value !== null).map((p) => p.value);
  if (done.length < 8) return null;
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const recent = avg(done.slice(-4));
  const before = avg(done.slice(-8, -4));
  if (!before && !recent) return { text: "None in 8 weeks", tone: "good" };
  if (!before) return { text: "Up from none", tone: lowerIsBetter ? "bad" : "good" };
  const pct = Math.round(((recent - before) / before) * 100);
  if (Math.abs(pct) < 5) return { text: "Steady vs the 4 weeks before", tone: "none" };
  const up = pct > 0;
  return {
    text: `${up ? "Up" : "Down"} ${Math.abs(pct)}% vs the 4 weeks before`,
    tone: up === lowerIsBetter ? "bad" : "good",
  };
}

const TONE = { good: IOS.greenText, bad: IOS.redText, none: IOS.secondary };

function TrendCard({ title, value, unit, points, target, color, lowerIsBetter = true, note }) {
  const c = change(points, { lowerIsBetter });
  return (
    <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, minWidth: 0 }}>
      <Typography sx={{ color: IOS.secondary, fontSize: 13, fontWeight: 600 }}>{title}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", ...num }}>
        {value}
        {unit && <Box component="span" sx={{ fontSize: 13, color: IOS.secondary, fontWeight: 600, ml: 0.5 }}>{unit}</Box>}
      </Typography>
      <Box sx={{ mt: 1, mb: 0.75 }}>
        <Spark points={points} target={target} color={color} />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: TONE[c?.tone || "none"] }}>{c?.text || note || " "}</Typography>
    </Box>
  );
}

/**
 * Last 12 weeks, so leadership can see whether things are getting better:
 * hours per resident day against the target, overtime hours, call-outs and
 * no-shows, and labor cost for owners/admins.
 */
export default function LaborTrends({ endWeek, canSeeCosts, reloadKey }) {
  const [weeks, setWeeks] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/labor/trends", { params: { weeks: 12, ...(endWeek ? { endWeek } : {}) } })
      .then((res) => !cancelled && setWeeks(res.data?.weeks || []))
      .catch(() => !cancelled && setWeeks([]));
    return () => {
      cancelled = true;
    };
  }, [endWeek, reloadKey]);

  if (!weeks) return <Typography sx={{ color: IOS.secondary, fontSize: 14 }}>Loading…</Typography>;
  if (!weeks.length) return <Typography sx={{ color: IOS.secondary, fontSize: 14 }}>Couldn't load trends.</Typography>;

  const series = (key) => weeks.map((w, i) => ({ i, value: w[key] ?? null, inProgress: w.inProgress }));
  const lastDone = [...weeks].reverse().find((w) => !w.inProgress) || weeks[weeks.length - 1];
  const target = [...weeks].reverse().find((w) => w.targetPPD !== null)?.targetPPD ?? null;
  const hasPPD = weeks.some((w) => w.ppd !== null);
  const attendance = weeks.map((w, i) => ({ i, value: w.callOuts + w.noShows, inProgress: w.inProgress }));
  const showCost = canSeeCosts && weeks.some((w) => w.cost !== null);
  const range = `${dayLabel(weeks[0].weekStart, { month: "short", day: "numeric" })} – ${dayLabel(weeks[weeks.length - 1].weekStart, { month: "short", day: "numeric" })}`;

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `repeat(${showCost ? 4 : 3}, 1fr)` }, gap: 1 }}>
        <TrendCard
          title="Hours per resident day"
          value={hasPPD ? lastDone.ppd ?? "–" : "–"}
          unit={target !== null && hasPPD ? `target ${target}` : ""}
          points={series("ppd")}
          target={target}
          color={IOS.blue}
          lowerIsBetter={false}
          note={hasPPD ? "" : "Set residents in Settings"}
        />
        <TrendCard title="Overtime" value={fmt(lastDone.overtimeHours)} unit="h last week" points={series("overtimeHours")} color={IOS.red} />
        <TrendCard title="Call-outs and no-shows" value={lastDone.callOuts + lastDone.noShows} unit="last week" points={attendance} color={IOS.orange} />
        {showCost && (
          <TrendCard title="Labor cost" value={money(lastDone.cost)} unit="last week" points={series("cost")} color={IOS.purple} />
        )}
      </Box>
      <Typography sx={{ color: IOS.secondary, fontSize: 12.5, mt: 1 }}>
        Weeks starting {range}. The hollow dot is this week, still in progress. Dashed line: your target.
      </Typography>
    </>
  );
}
