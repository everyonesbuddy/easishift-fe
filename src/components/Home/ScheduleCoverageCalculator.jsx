import { useMemo, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import CalculatorInput from "./CalculatorInput";
import CalculatorLayout, { MathLine } from "./CalculatorLayout";
import StaffingGrid from "./StaffingGrid";
import { formatNumber, usePageMetadata } from "./calculatorUtils";

const DEFAULT_ROWS = [
  { role: "CNAs", counts: [6, 5, 3], have: "" },
  { role: "Nurses", counts: [2, 2, 1], have: "" },
  { role: "Med techs", counts: [2, 1, 0], have: "" },
];
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

/**
 * How many full-time positions a schedule needs, from the visitor's own
 * pattern: weekly hours ÷ the hours one full-timer actually works (after
 * time off). Compared with what they have, if they enter it.
 */
export default function ScheduleCoverageCalculator() {
  usePageMetadata(
    "Schedule Coverage Calculator: Full-Time Positions Your Schedule Needs | WiserShifts",
    "Work out how many full-time positions your schedule needs by role, allowing for time off and call-outs, and compare it with what you have.",
  );
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [shiftLength, setShiftLength] = useState(8);
  const [fullTime, setFullTime] = useState(40);
  const [away, setAway] = useState(10);

  const workedPerFte = fullTime * (1 - away / 100);
  const r = useMemo(() => {
    const byRole = rows.map((row) => {
      const perDay = row.counts.reduce((a, b) => a + b, 0);
      const weekly = perDay * shiftLength * 7;
      const needed = workedPerFte > 0 ? weekly / workedPerFte : 0;
      const have = row.have === "" || row.have === undefined ? null : Number(row.have);
      return { ...row, perDay, weekly, needed, have: Number.isFinite(have) ? have : null };
    });
    const total = byRole.reduce((a, b) => a + b.needed, 0);
    const haveAll = byRole.every((x) => x.have !== null);
    const haveTotal = byRole.reduce((a, b) => a + (b.have || 0), 0);
    return { byRole, total, haveAll, haveTotal, weekly: byRole.reduce((a, b) => a + b.weekly, 0) };
  }, [rows, shiftLength, workedPerFte]);

  const setHave = (i, v) => setRows(rows.map((row, j) => (i === j ? { ...row, have: v } : row)));

  return (
    <CalculatorLayout
      eyebrow="Schedule coverage calculator"
      title="How many full-time positions does your schedule need?"
      intro="Put in who you need on each shift. See the full-time positions it takes by role once time off and call-outs are allowed for, and how that compares with your team today."
      inputs={
        <>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>People needed on each shift</Typography>
            <StaffingGrid rows={rows} onChange={setRows} />
          </Box>
          <CalculatorInput label="Shift length" value={shiftLength} onChange={setShiftLength} min={4} max={12} step={0.5} endAdornment="hours" />
          <CalculatorInput label="Hours in a full-time week" value={fullTime} onChange={setFullTime} min={24} max={60} step={1} endAdornment="hours" />
          <CalculatorInput
            label="Time away"
            value={away}
            onChange={setAway}
            min={0}
            max={30}
            step={1}
            endAdornment="%"
            helper="The share of paid hours that go to time off, sick days, call-outs and training. Use your own number."
          />
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Full-time positions you have now (optional)</Typography>
            <Typography sx={{ color: "#667085", fontSize: 13.5, mb: 1 }}>Count part-timers as fractions: someone on 20 hours is 0.5.</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {rows.map((row, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography sx={{ flex: 1, fontSize: 14 }} noWrap>{row.role || "Other"}</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={row.have ?? ""}
                    onChange={(e) => setHave(i, e.target.value)}
                    inputProps={{ min: 0, max: 500, step: 0.5, "aria-label": `${row.role || "Role"} positions now`, style: { textAlign: "center" } }}
                    sx={{ width: 110 }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </>
      }
      result={
        <>
          <Typography sx={{ color: "#667085", fontWeight: 700, fontSize: 14 }}>Your schedule needs</Typography>
          <Typography sx={{ fontSize: { xs: 46, md: 58 }, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {f1(r.total)}
            <Box component="span" sx={{ fontSize: 18, fontWeight: 700, color: "#667085", ml: 1, letterSpacing: 0 }}>full-time positions</Box>
          </Typography>
          {r.haveAll && (
            <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 0.5, color: r.total - r.haveTotal > 0.25 ? "#B91C1C" : "#15803D" }}>
              {r.total - r.haveTotal > 0.25
                ? `You have ${formatNumber(r.haveTotal)}: ${f1(r.total - r.haveTotal)} short. Those hours end up as overtime or open shifts.`
                : `You have ${formatNumber(r.haveTotal)}: enough to cover the schedule.`}
            </Typography>
          )}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 1, py: 0.75, color: "#667085", fontSize: 12.5, fontWeight: 700 }}>
              <span>Role</span>
              <span style={{ textAlign: "right" }}>Hours a week</span>
              <span style={{ textAlign: "right" }}>Needed</span>
              <span style={{ textAlign: "right" }}>Short</span>
            </Box>
            {r.byRole.filter((x) => x.perDay).map((x) => {
              const short = x.have !== null ? x.needed - x.have : null;
              return (
                <Box key={x.role} sx={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 1, py: 0.75, borderTop: "1px solid #F2F4F7", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                  <span>{x.role || "Other"}</span>
                  <span style={{ textAlign: "right" }}>{formatNumber(x.weekly)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{f1(x.needed)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: short === null ? "#98A2B3" : short > 0.25 ? "#B91C1C" : "#15803D" }}>
                    {short === null ? "–" : short > 0.25 ? f1(short) : "0"}
                  </span>
                </Box>
              );
            })}
          </Box>
        </>
      }
      math={
        <>
          <MathLine>
            One full-timer works {fullTime} h × {100 - away}% = {formatNumber(workedPerFte)} h a week on the schedule
          </MathLine>
          {r.byRole.filter((x) => x.perDay).map((x) => (
            <MathLine key={x.role}>
              {x.role || "Other"}: {x.perDay} a day × {shiftLength} h × 7 days = {formatNumber(x.weekly)} h ÷ {formatNumber(workedPerFte)} = {f1(x.needed)}
            </MathLine>
          ))}
          <MathLine strong>Total: {f1(r.total)} full-time positions</MathLine>
        </>
      }
      note="Planning math only: it doesn't know about shift preferences, availability or certifications. Positions short usually show up as overtime or open shifts."
      pitch={{
        title: "See the gap every week, not once a year.",
        text: "WiserShifts shows hours needed against hours staffed on your real schedule, who's heading into overtime before payroll, and which spots are still open, so you can plan hiring from what's happening.",
      }}
    />
  );
}
