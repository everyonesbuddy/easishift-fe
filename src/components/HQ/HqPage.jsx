import { useCallback, useEffect, useState } from "react";
import { Alert, Box, ButtonBase, MenuItem, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Stat } from "./HqBits";
import { n } from "./hqFormat";
import HqFacilities from "./HqFacilities";
import HqPeople from "./HqPeople";
import HqSignups from "./HqSignups";
import HqEmail from "./HqEmail";
import HqContent from "./HqContent";
import HqWeb from "./HqWeb";
import HqConnections from "./HqConnections";
import HqNumbers from "./HqNumbers";
import HqPlaybookRead from "./HqPlaybookRead";
import HqAudience, { HqOverall } from "./HqAudience";

const LeadershipPage = (props) => <HqAudience {...props} audiences={["director", "operator"]} />;
const SchedulersPage = (props) => <HqAudience {...props} audiences={["scheduler"]} />;

// The menu: the playbook to read first, then leads, then plays by buyer, then the numbers.
const GROUPS = [
  { label: "", items: [{ id: "playbook", label: "Playbook", Comp: HqPlaybookRead, title: "Marketing playbook", sub: "How we sell, who we sell to, the channels and the marketing plays. Read this first." }] },
  {
    label: "Facility leads",
    items: [
      { id: "facilities", label: "Facilities", Comp: HqFacilities, title: "Facilities", sub: "Every building we market to. Open one to see its people and history, and to log a call." },
      { id: "people", label: "People", Comp: HqPeople, title: "People", sub: "The people at those buildings, executives first." },
    ],
  },
  {
    label: "Marketing plays",
    items: [
      { id: "schedulers", label: "For schedulers", Comp: SchedulersPage, title: "Marketing plays for schedulers", sub: "How we reach schedulers and staffing coordinators, on every channel, and what to do now." },
      { id: "leadership", label: "For DONs, EDs & admins", Comp: LeadershipPage, title: "Marketing plays for DONs, EDs and admins", sub: "How we reach directors of nursing, executive directors, administrators and regional operators, on every channel, and what to do now." },
      { id: "overall", label: "Full plan & scoreboard", Comp: HqOverall, title: "Full plan and scoreboard", sub: "Everything to do now for every buyer, the scoreboard, every marketing play, the week, and the full content calendar." },
    ],
  },
  {
    label: "Data & metrics",
    items: [
      { id: "numbers", label: "Funnel", Comp: HqNumbers, title: "Funnel", sub: "How people come in, how far they get, and who drops off." },
      { id: "signups", label: "Signups", Comp: HqSignups, title: "Signups", sub: "Who signed up, where they came from and how they're doing." },
      { id: "email", label: "Klaviyo email", Comp: HqEmail, title: "Klaviyo email", sub: "Our content email: who really clicks, how it lines up with the CRM, and who to stop emailing." },
      { id: "web", label: "Website & search", Comp: HqWeb, title: "Website and search", sub: "Google Analytics and Search Console." },
      { id: "channels", label: "Blog, video, LinkedIn", Comp: HqContent, title: "Blog, video and LinkedIn", sub: "How what we've published is doing." },
    ],
  },
  { label: "Settings", items: [{ id: "connections", label: "Connections & data", Comp: HqConnections, title: "Connections and data", sub: "Keys, imports, Google Sheets and backups." }] },
];
const ITEMS = GROUPS.flatMap((g) => g.items);
const ALIASES = { content: "channels", plays: "overall", "content-plan": "overall" };

/** HQ: WiserShifts' own command center (inside HqApp, behind the HQ sign-in). */
export default function HqPage() {
  const { tab = "playbook" } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const current = ITEMS.find((t) => t.id === (ALIASES[tab] || tab)) || ITEMS[0];

  useEffect(() => {
    if (current.id !== "overall") return;
    api
      .get("/hq/overview")
      .then((res) => {
        setOverview(res.data);
        setError("");
      })
      .catch((err) => err?.response?.status !== 401 && setError("Couldn't load HQ."));
  }, [reloadKey, current.id]);

  const o = overview;
  const leaders = o ? ["executive_director", "administrator", "don", "regional", "owner"].reduce((s, r) => s + (o.contactsByRole?.[r] || 0), 0) : null;

  return (
    <Box sx={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
      {/* Side menu (desktop) */}
      <Box
        component="nav"
        data-hq-chrome
        sx={{ display: { xs: "none", md: "block" }, width: 220, flexShrink: 0, borderRight: `1px solid ${IOS.separator}`, bgcolor: IOS.surface, py: 2, position: "sticky", top: 56, alignSelf: "flex-start", height: "calc(100vh - 56px)", overflowY: "auto" }}
      >
        {GROUPS.map((g) => (
          <Box key={g.label} sx={{ mb: 1.5 }}>
            {g.label && <Typography sx={{ px: 2.5, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: IOS.tertiary, mb: 0.5 }}>{g.label}</Typography>}
            {g.items.map((it) => {
              const active = it.id === current.id;
              return (
                <ButtonBase
                  key={it.id}
                  onClick={() => navigate(`/hq/${it.id}`)}
                  sx={{ display: "block", textAlign: "left", width: "calc(100% - 16px)", mx: 1, px: 1.5, py: 0.85, borderRadius: "8px", fontSize: 14.5, fontWeight: active ? 700 : 500, color: active ? IOS.ink : IOS.secondary, bgcolor: active ? IOS.fill : "transparent", "&:hover": { bgcolor: IOS.fill } }}
                >
                  {it.label}
                </ButtonBase>
              );
            })}
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3.5 }, pt: 3, pb: 8, maxWidth: 1400 }}>
        {/* Menu (phone) */}
        <TextField data-hq-chrome select size="small" fullWidth value={current.id} onChange={(e) => navigate(`/hq/${e.target.value}`)} sx={{ display: { md: "none" }, mb: 2, bgcolor: IOS.surface }}>
          {GROUPS.flatMap((g) => [
            <MenuItem key={`h-${g.label || "top"}`} disabled sx={{ fontSize: 12, fontWeight: 700, opacity: "1 !important", color: IOS.tertiary }}>
              {(g.label || "Start here").toUpperCase()}
            </MenuItem>,
            ...g.items.map((it) => (
              <MenuItem key={it.id} value={it.id}>
                {it.label}
              </MenuItem>
            )),
          ])}
        </TextField>

        <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em" }}>{current.title}</Typography>
        <Typography sx={{ color: IOS.secondary, fontSize: 14.5, mb: 2.5 }}>{current.sub}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {current.id === "overall" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }, gap: 1, mb: 2.5 }}>
            <Stat label="To do today" value={o ? n(o.plays.today) : "…"} detail={o ? `${n(o.plays.total)} open in all` : ""} tone={o?.plays.today ? IOS.blue : undefined} />
            <Stat label="Signups" value={o ? n(o.signups.total) : "…"} detail={o ? `${o.signups.last7} this week · ${o.signups.active} active` : ""} onClick={() => navigate("/hq/signups")} />
            <Stat label="Paying" value={o ? n(o.signups.paid) : "…"} detail={o ? `${o.signups.trialing} on trial` : ""} onClick={() => navigate("/hq/numbers")} />
            <Stat label="Facilities" value={o ? n(o.facilities) : "…"} detail="on our list" onClick={() => navigate("/hq/facilities")} />
            <Stat label="Leadership contacts" value={o ? n(leaders) : "…"} detail={o ? `${n(o.contacts)} people in all` : ""} onClick={() => navigate("/hq/people")} />
            <Stat label="Real email clicks" value={o ? n(o.email.human) : "…"} detail={o ? `${n(o.email.clickers)} people` : ""} onClick={() => navigate("/hq/email")} />
          </Box>
        )}

        <current.Comp reloadKey={reloadKey} onChanged={reload} overview={o} />
      </Box>
    </Box>
  );
}
