import { Box, Typography } from "@mui/material";
import { FiAlertTriangle, FiMail, FiSend } from "react-icons/fi";

/*
 * Small drawings of real WiserShifts screens for the marketing pages, made
 * in code so they stay sharp and match the product. Example data only.
 */

const card = {
  bgcolor: "#fff",
  borderRadius: "16px",
  border: "1px solid #E4E7EC",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
  p: { xs: 2, sm: 2.5 },
  fontFamily: "inherit",
  // Placed on dark backgrounds too: don't inherit white text.
  color: "#111827",
  textAlign: "left",
};
const label = { fontSize: 12, fontWeight: 700, color: "#667085" };
const num = { fontVariantNumeric: "tabular-nums" };

const ROLE = { cna: "#2563EB", nurse: "#16A34A", med: "#9333EA" };

/** Week grid: people by day, an open spot and a call-out. */
export function WeekMock() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rows = [
    { name: "Jessica M.", role: "CNA", color: ROLE.cna, cells: ["7a–3p", "7a–3p", "", "7a–3p", "7a–3p", "", ""] },
    { name: "Michael B.", role: "LPN", color: ROLE.nurse, cells: ["", "3p–11p", "3p–11p", "3p–11p", "", "3p–11p", ""] },
    { name: "Sarah K.", role: "CNA", color: ROLE.cna, cells: ["3p–11p", "", "out", "3p–11p", "3p–11p", "", "3p–11p"] },
    { name: "David L.", role: "Med tech", color: ROLE.med, cells: ["7a–3p", "7a–3p", "7a–3p", "", "", "7a–3p", "7a–3p"] },
    { name: "Open spot", role: "CNA", color: "#F59E0B", cells: ["", "", "", "", "11p–7a", "", ""], open: true },
  ];
  return (
    <Box sx={card}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Nov 2 – Nov 8</Typography>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700 }}>
          <FiSend size={12} /> Send week
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "92px repeat(7, 1fr)", gap: "4px", fontSize: 11 }}>
        <Box />
        {days.map((d) => (
          <Typography key={d} sx={{ ...label, fontSize: 11, textAlign: "center" }}>{d}</Typography>
        ))}
        {rows.map((r) => (
          <Box key={r.name} sx={{ display: "contents" }}>
            <Box sx={{ minWidth: 0, pr: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: r.open ? "#B45309" : "#111827" }} noWrap>{r.name}</Typography>
              <Typography sx={{ fontSize: 10.5, color: "#667085" }} noWrap>{r.role}</Typography>
            </Box>
            {r.cells.map((c, i) => (
              <Box
                key={i}
                sx={{
                  borderRadius: "6px",
                  minHeight: 30,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 10.5,
                  ...(c === "out"
                    ? { bgcolor: "#FEE2E2", color: "#B91C1C" }
                    : r.open && c
                      ? { border: "1.5px dashed #F59E0B", color: "#B45309", bgcolor: "#FFFBEB" }
                      : c
                        ? { bgcolor: `${r.color}1A`, color: r.color }
                        : { bgcolor: "#F8FAFC" }),
                }}
              >
                {c === "out" ? "Call-out" : c}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Overtime coming, with the Fix button. */
export function OvertimeMock() {
  const people = [
    { name: "Maria L.", role: "CNA", hours: 52, ot: 12, when: "goes over on Thursday" },
    { name: "Andre P.", role: "Med tech", hours: 44, ot: 4, when: "goes over on Saturday" },
  ];
  const max = 56;
  return (
    <Box sx={card}>
      <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Overtime coming</Typography>
      <Typography sx={{ fontSize: 12.5, color: "#667085", mt: 0.25, mb: 1.25 }}>Before it reaches payroll</Typography>
      {people.map((p, i) => (
        <Box key={p.name} sx={{ py: 1.1, borderTop: i ? "1px solid #F2F4F7" : "none" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }} noWrap>
              {p.name} <Box component="span" sx={{ color: "#667085", fontWeight: 500, fontSize: 12.5 }}>{p.role}</Box>
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#DC2626", ...num }}>+{p.ot} h</Typography>
            <Box sx={{ px: 1.25, py: 0.35, borderRadius: 999, bgcolor: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700 }}>Fix</Box>
          </Box>
          <Box sx={{ position: "relative", height: 7, borderRadius: 4, bgcolor: "#F2F4F7", mt: 0.75, overflow: "hidden" }}>
            <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(40 / max) * 100}%`, bgcolor: "#94A3B8" }} />
            <Box sx={{ position: "absolute", left: `${(40 / max) * 100}%`, top: 0, bottom: 0, width: `${(p.ot / max) * 100}%`, bgcolor: "#EF4444" }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.5, ...num }}>{p.hours} h this week, {p.when}</Typography>
        </Box>
      ))}
      <Box sx={{ mt: 1, p: 1.25, borderRadius: "10px", bgcolor: "#F0FDF4", color: "#166534", fontSize: 12.5, fontWeight: 600 }}>
        Give Thursday to Ana D. (24 h this week). Saves 8 h of overtime.
      </Box>
    </Box>
  );
}

/** Hours per resident day against budget, with the math. */
export function BudgetMock() {
  const value = 3.62;
  const target = 3.85;
  const max = 4.6;
  return (
    <Box sx={card}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Hours per resident day</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 26, color: "#B45309", ...num }}>
          {value} <Box component="span" sx={{ fontSize: 13, color: "#667085", fontWeight: 600 }}>of {target}</Box>
        </Typography>
      </Box>
      <Box sx={{ position: "relative", height: 10, borderRadius: 5, bgcolor: "#F2F4F7", mt: 1 }}>
        <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(3.83 / max) * 100}%`, borderRadius: 5, bgcolor: "#FDE7C7" }} />
        <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(value / max) * 100}%`, borderRadius: 5, bgcolor: "#F59E0B" }} />
        <Box sx={{ position: "absolute", top: -4, bottom: -4, left: `${(target / max) * 100}%`, width: 2, bgcolor: "#111827" }} />
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, mt: 1.25 }}>
        80 hours under budget. 72 of those are open shifts nobody is assigned to yet.
      </Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid #F2F4F7", display: "grid", gap: 0.25 }}>
        {[
          "1,267 h staffed ÷ 350 resident days (50 residents × 7 days) = 3.62",
          "Budget: 3.85 × 350 = 1,347.5 h this week",
        ].map((t) => (
          <Typography key={t} sx={{ fontSize: 12, color: "#667085", ...num }}>{t}</Typography>
        ))}
      </Box>
    </Box>
  );
}

/** The Monday labor email, for people without a login. */
export function MondayEmailMock() {
  const rows = [
    ["Hours staffed", "1,267 h of 1,339 h needed"],
    ["Hours per resident day", "3.62 (target 3.85)"],
    ["Overtime", "16 h, 2 people"],
    ["Call-outs", "5, and 1 no-show"],
    ["Certifications", "1 expired, 2 expiring soon"],
  ];
  return (
    <Box sx={card}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1.25, borderBottom: "1px solid #F2F4F7" }}>
        <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center" }}>
          <FiMail size={15} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800 }} noWrap>Labor last week: Maple Grove</Typography>
          <Typography sx={{ fontSize: 12, color: "#667085" }}>Monday, 7:00 AM · to the administrator and regional VP</Typography>
        </Box>
      </Box>
      {rows.map(([k, v]) => (
        <Box key={k} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, borderBottom: "1px solid #F8FAFC" }}>
          <Typography sx={{ fontSize: 13, color: "#475467" }}>{k}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, textAlign: "right", ...num }}>{v}</Typography>
        </Box>
      ))}
      <Box sx={{ mt: 1.25, display: "flex", alignItems: "center", gap: 1, color: "#B45309", fontSize: 12.5, fontWeight: 600 }}>
        <FiAlertTriangle size={14} /> Maria L. is heading for overtime again this week
      </Box>
    </Box>
  );
}

/** Twelve weeks of hours per resident day against the target. */
export function TrendMock() {
  const points = [3.98, 3.95, 4.02, 3.91, 3.88, 3.93, 3.84, 3.8, 3.86, 3.77, 3.7, 3.62];
  const W = 280;
  const H = 70;
  const min = 3.5;
  const max = 4.1;
  const x = (i) => 6 + (i * (W - 12)) / (points.length - 1);
  const y = (v) => H - 6 - ((v - min) / (max - min)) * (H - 12);
  return (
    <Box sx={card}>
      <Typography sx={label}>Last 12 weeks</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 15, mt: 0.25 }}>Hours per resident day</Typography>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden style={{ display: "block", marginTop: 8 }}>
        <line x1="6" x2={W - 6} y1={y(3.85)} y2={y(3.85)} stroke="#111827" strokeDasharray="4 4" opacity="0.5" />
        <path d={points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke="#2563EB" strokeWidth="2.25" strokeLinejoin="round" />
        {points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill="#2563EB" />)}
      </svg>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#16A34A", mt: 0.75 }}>Down 5% vs the 4 weeks before</Typography>
    </Box>
  );
}
