import { createPortal } from "react-dom";
import { Box, GlobalStyles } from "@mui/material";
import { certLabel, dayLabel, hours, money, periodLabel, roleLabel } from "./laborFormat";

const fmt = (n, digits = 1) => Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });

const ink = "#111";
const muted = "#555";
const rule = "1px solid #ccc";
const cell = { padding: "3px 6px", borderBottom: rule, textAlign: "left", fontSize: 11 };
const th = { ...cell, color: muted, fontWeight: 600, borderBottom: `1px solid ${ink}` };

function Table({ head, rows, empty, numeric = [] }) {
  const align = (i) => (numeric.includes(i) ? "right" : "left");
  if (!rows.length) return <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{empty}</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{head.map((h, i) => <th key={h} style={{ ...th, textAlign: align(i) }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            {r.cells.map((c, i) => <td key={i} style={{ ...cell, textAlign: align(i) }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const H = ({ children }) => (
  <h2 style={{ fontSize: 13, margin: "14px 0 4px", color: ink, letterSpacing: "0.01em" }}>{children}</h2>
);

/**
 * One-page labor summary for a monthly or weekly review meeting: the key
 * numbers, the budget math, overtime, call-outs, open shifts,
 * certifications and who to check in with. Hidden on screen.
 */
export default function LaborPrint({ d, facilityName }) {
  const isMonth = d.period === "month";
  const b = d.budget;
  const figures = [
    ["Hours staffed", hours(d.hours.scheduled), d.hours.needed ? `of ${hours(d.hours.needed)} needed` : ""],
    ...(d.canSeeCosts && d.costs && !d.costs.needsRates
      ? [["Labor cost", money(d.costs.scheduled), d.costs.overtimePremium ? `${money(d.costs.overtimePremium)} overtime pay` : "No overtime pay"]]
      : []),
    ["Hours per resident day", b ? String(b.scheduledPPD) : "–", b?.targetPPD !== null && b?.targetPPD !== undefined ? `target ${b.targetPPD}` : "no target set"],
    ["Overtime", hours(d.overtime.totalOvertimeHours), `${d.overtime.people.length} ${d.overtime.people.length === 1 ? "person" : "people"}`],
    ["Call-outs / no-shows", `${d.attendance.callOuts} / ${d.attendance.noShows}`, ""],
    ["Shifts covered", `${d.openShifts.filled} of ${d.openShifts.required}`, `${d.openShifts.unfilledPast} went unfilled`],
  ];
  const certs = [...d.credentials.expired, ...d.credentials.expiringSoon];

  return createPortal(
    <>
      <GlobalStyles
        styles={{
          "#labor-print": { display: "none" },
          "@media print": {
            "@page": { margin: "12mm" },
            // Only the summary prints (it's rendered straight into <body>).
            "body.printing-labor > *:not(#labor-print)": { display: "none !important" },
            "body.printing-labor #labor-print": { display: "block" },
          },
        }}
      />
      <Box id="labor-print" sx={{ fontFamily: "Helvetica, Arial, sans-serif", color: ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${ink}`, paddingBottom: 6 }}>
          <div>
            <div style={{ fontSize: 11, color: muted }}>{facilityName || "Labor summary"}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Labor summary, {isMonth ? periodLabel(d) : `week of ${periodLabel(d)}`}</div>
          </div>
          <div style={{ fontSize: 10, color: muted }}>Printed {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${figures.length}, 1fr)`, gap: 8, marginTop: 10 }}>
          {figures.map(([label, value, detail]) => (
            <div key={label} style={{ border: rule, borderRadius: 4, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, color: muted }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 10, color: muted }}>{detail}</div>
            </div>
          ))}
        </div>

        {b && b.targetPPD !== null && (
          <>
            <H>Budget: hours per resident day</H>
            <div style={{ fontSize: 11, lineHeight: 1.6 }}>
              {fmt(d.hours.scheduled)} h staffed ÷ {fmt(b.residentDays, 0)} resident days ({fmt(b.residentsPerDay)} residents × {b.countedDays} days) = <b>{b.scheduledPPD}</b>
              <br />
              Budget: {b.targetPPD} × {fmt(b.residentDays, 0)} = {fmt(b.budgetHours)} h. {b.varianceHours > 0 ? "Over" : "Under"} by <b>{fmt(Math.abs(b.varianceHours))} h</b>
              {d.hours.open && b.varianceHours < 0 ? `; ${fmt(Math.min(d.hours.open, Math.abs(b.varianceHours)))} h of that is open shifts nobody is assigned to.` : "."}
              {b.neededPPD !== null && b.neededPPD > b.scheduledPPD && <><br />With every open shift filled: {b.neededPPD}</>}
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <H>Overtime{isMonth ? " (counted per payroll week)" : ""}</H>
            <Table
              head={["Person", isMonth ? "Weeks over" : "Hours", "Overtime"]}
              numeric={[1, 2]}
              rows={d.overtime.people.slice(0, 10).map((o) => ({
                key: o.staffId,
                cells: [`${o.name} (${roleLabel(o.role)})`, isMonth ? o.weeksOver : fmt(o.projectedHours), `${fmt(o.overtimeHours)} h`],
              }))}
              empty={`No one over ${d.overtime.thresholdHours} hours.`}
            />
            <H>Call-outs and no-shows by shift</H>
            <Table
              head={["Shift", "Call-outs", "No-shows"]}
              numeric={[1, 2]}
              rows={d.attendance.byShift.slice(0, 6).map((s) => ({ key: s.key, cells: [s.label, s.callOuts, s.noShows] }))}
              empty="None."
            />
            <H>Hours by role</H>
            <Table
              head={["Role", "Hours staffed"]}
              numeric={[1]}
              rows={d.hours.byRole.slice(0, 8).map((r) => ({ key: r.role, cells: [roleLabel(r.role), fmt(r.scheduled)] }))}
              empty="No shifts."
            />
          </div>
          <div>
            <H>Certifications expired or expiring in 30 days</H>
            <Table
              head={["Person", "Certification", "Expires"]}
              numeric={[2]}
              rows={certs.slice(0, 10).map((c) => ({
                key: `${c.staffId}:${c.tag}`,
                cells: [c.name, certLabel(c.tag), c.daysLeft <= 0 ? "Expired" : dayLabel(c.expiresAt.slice(0, 10), { month: "short", day: "numeric" })],
              }))}
              empty="Nothing expired or expiring."
            />
            <H>Check in with</H>
            <Table
              head={["Person", "Why"]}
              rows={d.turnoverWatch.slice(0, 8).map((w) => ({ key: w.staffId, cells: [w.name, w.reasons.join(", ")] }))}
              empty="No one stands out."
            />
          </div>
        </div>
        <p style={{ fontSize: 9, color: muted, marginTop: 14 }}>
          Hours staffed are shifts with someone assigned (published or draft). Overtime is counted per payroll week over {d.overtime.thresholdHours} hours. From WiserShifts.
        </p>
      </Box>
    </>,
    document.body,
  );
}
