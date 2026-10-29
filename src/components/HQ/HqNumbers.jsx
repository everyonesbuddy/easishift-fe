import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS, tint } from "../../theme/ios";
import { Empty, Section } from "./HqBits";
import { errorText, n, num } from "./hqFormat";
import { AUDIENCES } from "./usePlaybookPlays";

const GROUP_COLORS = { In: IOS.blue, Moving: "#5856D6", Outreach: IOS.orange, Out: IOS.red };
const ROLE_NAMES = { scheduler: "Scheduler", don: "DON", executive_director: "Executive Director", administrator: "Administrator", regional: "Regional", owner: "Owner", other: "Other" };
const weekLabel = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Spark({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 22, width: 84 }} aria-hidden>
      {values.map((v, i) => (
        <Box key={i} sx={{ flex: 1, height: `${Math.max(6, (v / max) * 100)}%`, bgcolor: i === values.length - 1 ? color : tint(color, 0.35), borderRadius: "2px" }} />
      ))}
    </Box>
  );
}

function Bars({ title, rows, color, empty }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1 }}>{title}</Typography>
      {!rows.length && <Empty>{empty}</Empty>}
      {rows.slice(0, 8).map((r) => (
        <Box key={r.label} sx={{ display: "grid", gridTemplateColumns: "minmax(90px, 140px) 1fr 36px", gap: 1, alignItems: "center", mb: 0.6 }}>
          <Typography sx={{ fontSize: 13 }} noWrap>{r.label.charAt(0).toUpperCase() + r.label.slice(1)}</Typography>
          <Box sx={{ height: 10, borderRadius: 5, bgcolor: IOS.fill }}>
            <Box sx={{ height: "100%", width: `${(r.count / max) * 100}%`, bgcolor: color, borderRadius: 5 }} />
          </Box>
          <Typography sx={{ fontSize: 13, textAlign: "right", fontWeight: 600, ...num }}>{r.count}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Numbers: where everyone is, week by week, who drops off, and where people come from. */
export default function HqNumbers({ reloadKey }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    api
      .get("/hq/funnel")
      .then((res) => !off && setD(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load the numbers")));
    return () => {
      off = true;
    };
  }, [reloadKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!d) return <CircularProgress size={22} />;

  const maxStage = Math.max(...d.stages.map((s) => s.value), 1);
  const last = d.weeks.length - 1;
  const showFrom = Math.max(0, d.weeks.length - 8); // last 8 weeks as columns; the sparkline shows all 12

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Section title="Where everyone is now" note="From our list to paying. The percentage is how many made it from the step above.">
        {d.stages.map((s, i) => {
          // Only compare like with like (buildings, people, workspaces).
          const prev = i && d.stages[i - 1].unit === s.unit ? d.stages[i - 1].value : null;
          const pct = prev ? Math.round((s.value / prev) * 100) : null;
          const product = i >= 4;
          return (
            <Box key={s.key} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 70px", md: "240px 1fr 70px 60px" }, gap: 1.5, alignItems: "center", py: 0.6 }}>
              <Typography sx={{ fontSize: 14, fontWeight: product ? 700 : 500 }}>{s.label}</Typography>
              <Box sx={{ height: 14, borderRadius: 7, bgcolor: IOS.fill, display: { xs: "none", md: "block" } }}>
                <Box sx={{ height: "100%", width: `${Math.max(1, (s.value / maxStage) * 100)}%`, bgcolor: product ? IOS.green : IOS.blue, borderRadius: 7 }} />
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, textAlign: "right", ...num }}>{n(s.value)}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary, textAlign: "right", display: { xs: "none", md: "block" }, ...num }}>{pct !== null && prev ? `${pct}%` : ""}</Typography>
            </Box>
          );
        })}
      </Section>

      <Section title="Week by week" note="Weeks start Monday. The last column is this week, still in progress.">
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 820,
              "& td, & th": { borderBottom: `1px solid ${IOS.hairline}`, py: 0.75, px: 1, fontSize: 13.5, textAlign: "right", ...num },
              "& th": { fontSize: 12, color: IOS.secondary, fontWeight: 700 },
              "& td:first-of-type, & th:first-of-type": { textAlign: "left", position: "sticky", left: 0, bgcolor: IOS.surface },
            }}
          >
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th style={{ textAlign: "left" }}>12 weeks</th>
                {d.weeks.slice(showFrom).map((w, i) => (
                  <th key={w}>{showFrom + i === last ? "This week" : weekLabel(w)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["In", "Moving", "Outreach", "Out"].map((g) => [
                <tr key={`g-${g}`}>
                  <td colSpan={d.weeks.length - showFrom + 2} style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: GROUP_COLORS[g], paddingTop: 14 }}>
                    {{ In: "COMING IN", Moving: "MOVING FORWARD", Outreach: "OUR OUTREACH", Out: "DROPPING OFF" }[g]}
                  </td>
                </tr>,
                ...d.rows
                  .filter((r) => r.group === g)
                  .map((r) => {
                    const vals = r.values ? d.weeks.map((w) => r.values[w] || 0) : null;
                    return (
                      <tr key={r.key}>
                        <td>{r.label}</td>
                        <td style={{ textAlign: "left" }}>{vals ? <Spark values={vals} color={GROUP_COLORS[g]} /> : <Typography component="span" sx={{ fontSize: 12, color: IOS.tertiary }}>{r.note}</Typography>}</td>
                        {d.weeks.slice(showFrom).map((w, i) => (
                          <td key={w} style={{ fontWeight: showFrom + i === last ? 700 : 400, color: vals && vals[showFrom + i] === 0 ? IOS.tertiary : IOS.ink }}>
                            {vals ? n(vals[showFrom + i]) : "–"}
                          </td>
                        ))}
                      </tr>
                    );
                  }),
              ])}
            </tbody>
          </Box>
        </Box>
      </Section>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.25 }}>
        {d.out.map((o) => (
          <Box key={o.key} sx={{ p: 2, bgcolor: IOS.surface, borderRadius: IOS.radius.card, border: `1px solid ${IOS.hairline}` }}>
            <Typography sx={{ fontSize: 13, color: IOS.secondary, fontWeight: 600 }}>{o.label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: o.value ? IOS.redText : IOS.ink, ...num }}>{o.value}</Typography>
            {o.names.length > 0 && <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>{o.names.join(" · ")}</Typography>}
          </Box>
        ))}
      </Box>

      <Section title="Where they come from" note="Signups by first visit (campaign link, the site that sent them, or what they told us), and calculator emails by calculator.">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Bars title="Signups by source" rows={d.sources.signups} color={IOS.blue} empty="No signups yet." />
          <Bars title="What they told us (how they heard)" rows={d.sources.heard} color="#5856D6" empty="New signups answer this on the form." />
          <Bars title="Who signed up" rows={d.sources.roles.map((r) => ({ ...r, label: ROLE_NAMES[r.label] || r.label }))} color={AUDIENCES.director.color} empty="New signups answer this on the form." />
          <Bars title="Calculator emails (last 12 weeks)" rows={d.sources.leads} color={IOS.green} empty="No calculator emails yet." />
        </Box>
      </Section>
    </Box>
  );
}
