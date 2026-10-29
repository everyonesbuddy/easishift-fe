import { useEffect, useState } from "react";
import { Alert, Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, RolePill, Section, Tag } from "./HqBits";
import { ago, errorText, shortDate } from "./hqFormat";
import FacilityDrawer from "./FacilityDrawer";

const HEARD = { google: "Google", linkedin: "LinkedIn", youtube: "YouTube", facebook: "Facebook", email: "Email", colleague: "A colleague", calculator: "Calculator", conference: "Conference", other: "Other" };

const sourceText = (s) => {
  if (!s) return "";
  if (s.utm_source) return [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean).join(" / ");
  if (s.referrer) {
    try {
      return new URL(s.referrer).hostname.replace(/^www\./, "");
    } catch {
      return s.referrer;
    }
  }
  return s.landingPage ? `direct → ${s.landingPage}` : "";
};

function Status({ w }) {
  if (!w.setupDone) return <Tag color={IOS.orange}>Setup not done</Tag>;
  if (w.paid) return <Tag color={IOS.green}>Paying</Tag>;
  if (w.trialDaysLeft !== null) return <Tag color={IOS.blue}>Trial · {w.trialDaysLeft}d left</Tag>;
  return <Tag>{w.active ? "Free · active" : "Free · quiet"}</Tag>;
}

/** Every workspace and how it's doing, plus emails left on calculators. */
export default function HqSignups({ reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/signups")
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load signups")));
    return () => {
      off = true;
    };
  }, [reloadKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Section title={`Workspaces (${data.workspaces.length})`} note="Newest first. Active means someone logged in this week or 5+ shifts were made in two weeks.">
        {!data.workspaces.length && <Empty>No signups yet.</Empty>}
        {data.workspaces.map((w) => (
          <ButtonBase
            key={w.tenantId}
            onClick={() => w.facilityId && setOpen(w.facilityId)}
            sx={{ display: "flex", width: "100%", textAlign: "left", gap: 2, py: 1.25, px: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "flex-start", "&:hover": { bgcolor: IOS.canvas }, flexWrap: { xs: "wrap", md: "nowrap" } }}
          >
            <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5 }} noWrap>{w.name}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>
                {w.group || w.facilityType?.replace(/_/g, " ") || "–"} · signed up {shortDate(w.createdAt)}
              </Typography>
            </Box>
            <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
              <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                <Typography sx={{ fontSize: 13.5 }} noWrap>{w.ownerName}</Typography>
                <RolePill role={w.signupRole} />
              </Box>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{w.ownerEmail}</Typography>
            </Box>
            <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
              <Typography sx={{ fontSize: 13 }} noWrap>{w.heardAbout ? HEARD[w.heardAbout] || w.heardAbout : "–"}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{sourceText(w.signupSource) || " "}</Typography>
            </Box>
            <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
              <Status w={w} />
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.25 }}>
                Seen {ago(w.lastActiveAt)} · {w.staffCount} staff · {w.shifts14} shifts/2wk
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: w.leadershipReached ? IOS.greenText : IOS.orangeText }}>
                {w.leadershipReached ? "Leadership reached" : "Leadership not reached"}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
      </Section>

      <Section title={`Calculator and newsletter emails (${data.leads.length})`} note="From the website. They're in Klaviyo too; only people who ticked the box are on the newsletter.">
        {!data.leads.length && <Empty>None yet.</Empty>}
        {data.leads.map((l) => (
          <Box key={l._id} sx={{ display: "flex", gap: 2, py: 1, px: 1, borderBottom: `1px solid ${IOS.hairline}`, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: "1 1 220px" }} noWrap>{l.email}</Typography>
            <Typography sx={{ fontSize: 13, flex: "1 1 160px" }} noWrap>{l.company || "–"}</Typography>
            <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: "2 1 260px" }} noWrap>
              {l.source.replace("calculator:", "").replace(/-/g, " ")}
              {l.summary ? ` · ${l.summary}` : ""}
            </Typography>
            <Box sx={{ flex: "0 0 auto", display: "flex", gap: 0.75, alignItems: "center" }}>
              {l.newsletter && <Tag color={IOS.green}>Newsletter</Tag>}
              {!l.klaviyo?.synced && <Tag color={IOS.orange}>{l.klaviyo?.error === "not_configured" ? "Not in Klaviyo yet" : "Klaviyo error"}</Tag>}
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>{ago(l.createdAt)}</Typography>
            </Box>
          </Box>
        ))}
      </Section>
      <FacilityDrawer id={open} onClose={() => setOpen(null)} onChanged={onChanged} />
    </Box>
  );
}
