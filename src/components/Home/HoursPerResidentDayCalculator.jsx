import { useMemo, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import CalculatorInput from "./CalculatorInput";
import CalculatorLayout, { MathLine } from "./CalculatorLayout";
import StaffingGrid from "./StaffingGrid";
import { formatMoney, formatNumber, usePageMetadata } from "./calculatorUtils";

const DEFAULT_ROWS = [
  { role: "CNAs", counts: [6, 5, 3] },
  { role: "Nurses", counts: [2, 2, 1] },
  { role: "Med techs", counts: [2, 1, 0] },
];
const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * Hours per resident day from the visitor's own staffing pattern. Pure
 * arithmetic, no industry averages: hours on the floor per day ÷ residents.
 */
export default function HoursPerResidentDayCalculator() {
  usePageMetadata(
    "Hours per Resident Day Calculator | WiserShifts",
    "Work out your hours per resident day from your own staffing pattern, compare it to your budget, and see what each 0.1 costs a year.",
  );
  const [residents, setResidents] = useState(50);
  const [shiftLength, setShiftLength] = useState(8);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [target, setTarget] = useState("");
  const [wage, setWage] = useState(20);

  const r = useMemo(() => {
    const byRole = rows.map((row) => {
      const people = row.counts.reduce((a, b) => a + b, 0);
      const hours = people * shiftLength;
      return { ...row, people, hours, ppd: residents ? hours / residents : 0 };
    });
    const dailyHours = byRole.reduce((a, b) => a + b.hours, 0);
    const ppd = residents ? dailyHours / residents : 0;
    const t = target === "" ? null : Number(target);
    const tenth = residents * 0.1;
    return {
      byRole,
      dailyHours,
      ppd,
      target: Number.isFinite(t) && t > 0 ? t : null,
      tenthHoursDay: tenth,
      tenthHoursYear: tenth * 365,
      tenthCost: tenth * 365 * wage,
    };
  }, [rows, shiftLength, residents, target, wage]);

  const gap = r.target !== null ? r.ppd - r.target : null;
  const gapHoursDay = gap !== null ? Math.abs(gap) * residents : 0;
  const tone = gap === null ? "#111827" : Math.abs(gap) < 0.05 ? "#15803D" : gap > 0 ? "#B91C1C" : "#B45309";

  return (
    <CalculatorLayout
      eyebrow="Hours per resident day calculator"
      title="What are your hours per resident day?"
      intro="Put in your residents and who's on each shift. See your hours per resident day, how it compares to your budget, and what every 0.1 costs a year. Your numbers only, no industry averages."
      inputs={
        <>
          <CalculatorInput label="Residents" value={residents} onChange={setResidents} min={1} max={500} step={1} helper="Your usual census." />
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>People on each shift</Typography>
            <StaffingGrid rows={rows} onChange={setRows} />
          </Box>
          <CalculatorInput label="Shift length" value={shiftLength} onChange={setShiftLength} min={4} max={12} step={0.5} endAdornment="hours" />
          <CalculatorInput label="Average hourly wage" value={wage} onChange={setWage} min={10} max={80} step={0.5} adornment="$" helper="For these roles, before benefits." />
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Your budget target (optional)</Typography>
            <TextField
              size="small"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 3.85"
              inputProps={{ min: 0, max: 24, step: 0.01, "aria-label": "Budget target, hours per resident day" }}
              helperText="Hours per resident day from your budget."
              sx={{ width: 200 }}
            />
          </Box>
        </>
      }
      result={
        <>
          <Typography sx={{ color: "#667085", fontWeight: 700, fontSize: 14 }}>Your hours per resident day</Typography>
          <Typography sx={{ fontSize: { xs: 48, md: 60 }, fontWeight: 900, letterSpacing: "-0.04em", color: tone, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {f2(r.ppd)}
          </Typography>
          {gap !== null ? (
            <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 0.5 }}>
              {Math.abs(gap) < 0.05
                ? `On your target of ${r.target}.`
                : `${f2(Math.abs(gap))} ${gap > 0 ? "over" : "under"} your target of ${r.target}: ${formatNumber(gapHoursDay)} hours a day${gap > 0 ? `, about ${formatMoney(gapHoursDay * 365 * wage)} a year in wages` : ""}.`}
            </Typography>
          ) : (
            <Typography sx={{ color: "#667085", mt: 0.5 }}>Add your budget target to compare.</Typography>
          )}
          <Box sx={{ mt: 2, p: 2, borderRadius: "14px", bgcolor: "#EFF6FF" }}>
            <Typography sx={{ fontWeight: 800, color: "#1E3A8A" }}>Every 0.1 is worth {formatMoney(r.tenthCost)} a year</Typography>
            <Typography sx={{ color: "#1E40AF", fontSize: 14, mt: 0.25 }}>
              At {residents} residents, 0.1 hours per resident day is {formatNumber(r.tenthHoursDay)} hours a day, or {formatNumber(r.tenthHoursYear)} hours a year.
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            {r.byRole.filter((x) => x.people).map((x) => (
              <Box key={x.role} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderTop: "1px solid #F2F4F7" }}>
                <Typography sx={{ fontSize: 14 }}>{x.role || "Other"}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{f2(x.ppd)}</Typography>
              </Box>
            ))}
          </Box>
        </>
      }
      math={
        <>
          {r.byRole.filter((x) => x.people).map((x) => (
            <MathLine key={x.role}>
              {x.role || "Other"}: {x.people} people × {shiftLength} h = {formatNumber(x.hours)} h a day
            </MathLine>
          ))}
          <MathLine strong>
            {formatNumber(r.dailyHours)} h a day ÷ {residents} residents = {f2(r.ppd)} hours per resident day
          </MathLine>
          {r.target !== null && (
            <MathLine>
              Target: {r.target} × {residents} residents = {formatNumber(r.target * residents)} h a day
            </MathLine>
          )}
          <MathLine>
            0.1 × {residents} residents × 365 days × {formatMoney(wage)} = {formatMoney(r.tenthCost)} a year
          </MathLine>
        </>
      }
      note="Wages only, before overtime, taxes and benefits. Count the roles your budget counts; add a row for others (activities, housekeeping) if yours includes them."
      pitch={{
        title: "Track it every week, not once a year.",
        text: "WiserShifts works out hours per resident day from your real schedule each week, against your budget, with overtime and open shifts alongside. Your administrator and regional VP get it by email every Monday.",
      }}
    />
  );
}
