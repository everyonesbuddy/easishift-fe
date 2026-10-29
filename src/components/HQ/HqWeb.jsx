import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { FiRefreshCw } from "react-icons/fi";
import api from "../../config/api";
import { IOS } from "../../theme/ios";
import { Empty, NotConnected, Section, Stat } from "./HqBits";
import { ago, errorText, n, pct } from "./hqFormat";

/** One bar per day; hover shows the number. */
function DayBars({ rows, valueKey, dateKey, color }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 72, mt: 1 }} aria-hidden>
      {rows.map((r) => {
        const d = String(r[dateKey]);
        const label = d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6)}` : d.slice(5);
        return (
          <Box
            key={d}
            title={`${label}: ${r[valueKey]}`}
            sx={{ flex: 1, minWidth: 2, height: `${Math.max(2, (r[valueKey] / max) * 100)}%`, bgcolor: color, borderRadius: "3px 3px 0 0", opacity: 0.85 }}
          />
        );
      })}
    </Box>
  );
}

function Table({ head, rows }) {
  if (!rows.length) return <Empty>Nothing yet.</Empty>;
  return (
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, "& td, & th": { py: 0.75, px: 0.5, borderBottom: `1px solid ${IOS.hairline}` }, "& th": { color: IOS.secondary, fontWeight: 700, fontSize: 12, textAlign: "left" } }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} style={{ textAlign: i ? "right" : "left" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={idx}>
            {r.map((c, i) => (
              <td key={i} style={{ textAlign: i ? "right" : "left", maxWidth: i ? undefined : 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

const path = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

/** Google Analytics and Search Console, last 28 days. */
export default function HqWeb({ reloadKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/web", { params: refresh ? { refresh: 1 } : {} })
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load web numbers")));
    return () => {
      off = true;
    };
  }, [reloadKey, refresh]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const a = data.analytics;
  const s = data.search;
  const signups = a.data?.events?.find((e) => e.eventName === "sign_up")?.eventCount || 0;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button size="small" startIcon={<FiRefreshCw />} onClick={() => setRefresh((r) => r + 1)} sx={{ textTransform: "none" }}>
          Refresh from Google
        </Button>
      </Box>
      <Section title="Website (Google Analytics)" note={a.fetchedAt ? `Last 28 days, updated ${ago(a.fetchedAt)}.` : ""}>
        {a.error === "not_configured" ? (
          <NotConnected what="Google Analytics" env={["GOOGLE_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"]} />
        ) : (
          <>
            {a.error && <Alert severity="warning" sx={{ mb: 1 }}>{a.error}</Alert>}
            {a.data && (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
                  <Stat label="Visitors" value={n(a.data.totals.activeUsers)} />
                  <Stat label="Visits" value={n(a.data.totals.sessions)} />
                  <Stat label="Engaged visits" value={a.data.totals.sessions ? pct(a.data.totals.engagedSessions / a.data.totals.sessions, 0) : "–"} />
                  <Stat label="Sign-ups (website)" value={n(signups)} tone={signups ? IOS.greenText : undefined} />
                </Box>
                <DayBars rows={a.data.byDay} valueKey="activeUsers" dateKey="date" color={IOS.blue} />
                <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>Visitors per day</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>Top pages</Typography>
                    <Table head={["Page", "Views", "Visitors"]} rows={a.data.pages.slice(0, 15).map((p) => [p.pagePath, n(p.screenPageViews), n(p.activeUsers)])} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>Where visitors came from</Typography>
                    <Table head={["Source / medium", "Visits", "Visitors"]} rows={a.data.sources.map((r) => [`${r.sessionSource} / ${r.sessionMedium}`, n(r.sessions), n(r.activeUsers)])} />
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Google search (Search Console)" note={s.data ? `${s.data.from} to ${s.data.to} (Google runs ~2 days behind).` : ""}>
        {s.error === "not_configured" ? (
          <NotConnected what="Search Console" env={["GOOGLE_SERVICE_ACCOUNT_JSON", "GSC_SITE_URL"]} />
        ) : (
          <>
            {s.error && <Alert severity="warning" sx={{ mb: 1 }}>{s.error}</Alert>}
            {s.data && (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
                  <Stat label="Clicks from Google" value={n(s.data.totals.clicks)} />
                  <Stat label="Times shown" value={n(s.data.totals.impressions)} />
                  <Stat label="Click rate" value={pct(s.data.totals.ctr)} />
                  <Stat label="Average position" value={s.data.totals.position ? n(s.data.totals.position, 1) : "–"} />
                </Box>
                <DayBars rows={s.data.byDay} valueKey="impressions" dateKey="date" color={IOS.green} />
                <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>Times shown in Google per day</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>What people searched</Typography>
                    <Table head={["Search", "Clicks", "Shown", "Position"]} rows={s.data.queries.map((q) => [q.query, n(q.clicks), n(q.impressions), n(q.position, 1)])} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>Pages found on Google</Typography>
                    <Table head={["Page", "Clicks", "Shown", "Position"]} rows={s.data.pages.map((p) => [path(p.page), n(p.clicks), n(p.impressions), n(p.position, 1)])} />
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Section>
    </Box>
  );
}
