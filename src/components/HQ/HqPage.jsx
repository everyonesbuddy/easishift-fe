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
import HqAudience, { SubTabs } from "./HqAudience";
import HqPlaybook from "./HqPlaybook";
import HqContentPlan from "./HqContentPlan";
import HqWeek from "./HqWeek";
import HqPlays from "./HqPlays";
import HqFacebook from "./HqFacebook";
import HqMoney from "./HqMoney";
import HqCustomerMessages from "./HqCustomerMessages";

const LeadershipPage = (props) => <HqAudience {...props} audiences={["director", "operator"]} />;
const SchedulersPage = (props) => <HqAudience {...props} audiences={["scheduler"]} />;
const ScoreboardPage = (props) => <HqPlaybook {...props} />;
const CalendarPage = (props) => <HqContentPlan {...props} />;

/** Home: this week's checklist, and the people to get back to. */
function HomePage({ reloadKey, onChanged, overview: o }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("week");
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1, mb: 2.5 }}>
        <Stat label="People to get back to" value={o ? n(o.plays.today) : "…"} detail={o ? `${n(o.plays.total)} open in all` : ""} tone={o?.plays.today ? IOS.blue : undefined} onClick={() => setTab("now")} />
        <Stat label="Signups" value={o ? n(o.signups.total) : "…"} detail={o ? `${o.signups.last7} this week · ${o.signups.active} active` : ""} onClick={() => navigate("/hq/signups")} />
        <Stat label="Paying" value={o ? n(o.signups.paid) : "…"} detail={o ? `${o.signups.trialing} on trial` : ""} onClick={() => navigate("/hq/numbers")} />
        <Stat label="Facilities" value={o ? n(o.facilities) : "…"} detail="on our list" onClick={() => navigate("/hq/facilities")} />
        <Stat label="Real email clicks" value={o ? n(o.email.human) : "…"} detail={o ? `${n(o.email.clickers)} people` : ""} onClick={() => navigate("/hq/email")} />
      </Box>
      <SubTabs
        tabs={[
          ["week", "This week's checklist"],
          ["now", "People to get back to"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "week" && <HqWeek reloadKey={reloadKey} onChanged={onChanged} />}
      {tab === "now" && <HqPlays reloadKey={reloadKey} onChanged={onChanged} title="Get back to them" note="Replies, email clicks, website leads, new signups and call-backs, plus content that's due. Most urgent first." />}
    </Box>
  );
}

// The menu, in the order the work happens: this week, reaching out, publishing, the strategy behind it, then results.
const GROUPS = [
  { label: "", items: [{ id: "week", label: "This week", Comp: HomePage, title: "This week", sub: "Everything to do this week, ticked off as you go, and the people to get back to." }] },
  {
    label: "Reach out",
    items: [
      { id: "facilities", label: "Facilities", Comp: HqFacilities, title: "Facilities", sub: "Every building we market to. Open one to call it, log it and see its history." },
      { id: "people", label: "Leaders & contacts", Comp: HqPeople, title: "Leaders & contacts", sub: "The people at those buildings, executives first." },
      { id: "facebook", label: "Facebook groups & people", Comp: HqFacebook, title: "Facebook", sub: "The groups where our buyers talk, where we stand in each, and everyone to message from them. Everything here also shows up in This week." },
    ],
  },
  {
    label: "Publish",
    items: [{ id: "calendar", label: "Content calendar", Comp: CalendarPage, title: "Content calendar", sub: "Every post, video, email and template: ideas, drafts, what's scheduled and what's out." }],
  },
  {
    label: "Strategy",
    items: [
      { id: "playbook", label: "Playbook", Comp: HqPlaybookRead, title: "Marketing playbook", sub: "How we sell, who we sell to, the channels and the campaigns we run." },
      { id: "schedulers", label: "Schedulers", Comp: SchedulersPage, title: "Campaigns for schedulers", sub: "Who schedulers are, what we say to them, and each campaign that reaches them: how it runs, its scripts, and this week's count." },
      { id: "leadership", label: "DONs, EDs & admins", Comp: LeadershipPage, title: "Campaigns for DONs, EDs and admins", sub: "Who the leaders are, what we say to them, and each campaign that reaches them: how it runs, its scripts, and this week's count." },
      { id: "scoreboard", label: "Scoreboard & all campaigns", Comp: ScoreboardPage, title: "Scoreboard and all campaigns", sub: "Each campaign's weekly target against the last four weeks, every campaign, and the week's schedule." },
    ],
  },
  {
    label: "Results",
    items: [
      { id: "numbers", label: "Funnel", Comp: HqNumbers, title: "Funnel", sub: "How people come in, how far they get, and who drops off." },
      { id: "signups", label: "Signups", Comp: HqSignups, title: "Signups", sub: "Who signed up, where they came from and how they're doing." },
      { id: "email", label: "Klaviyo email", Comp: HqEmail, title: "Klaviyo email", sub: "Our content email: who really clicks, how it lines up with the CRM, and who to stop emailing." },
      { id: "web", label: "Website & search", Comp: HqWeb, title: "Website and search", sub: "Google Analytics and Search Console." },
      { id: "channels", label: "Blog, video & LinkedIn", Comp: HqContent, title: "Blog, video and LinkedIn", sub: "How what we've published is doing." },
    ],
  },
  { label: "Business", items: [{ id: "money", label: "Money", Comp: HqMoney, title: "Money", sub: "Profit and loss by month: Stripe income, what we pay for, and who's subscribed." }] },
  {
    label: "Settings",
    items: [
      { id: "connections", label: "Connections & data", Comp: HqConnections, title: "Connections and data", sub: "Keys, imports, Google Sheets and backups." },
      { id: "customer-messages", label: "Customer messages", Comp: HqCustomerMessages, title: "Customer messages", sub: "Send a workspace's managers the morning summary, a next-step nudge or a call-out alert, to test them." },
    ],
  },
];
const ITEMS = GROUPS.flatMap((g) => g.items);
// Old links keep working.
const ALIASES = { content: "channels", plays: "week", overall: "week", "content-plan": "calendar" };

/** HQ: WiserShifts' own command center (inside HqApp, behind the HQ sign-in). */
export default function HqPage() {
  const { tab = "week" } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const current = ITEMS.find((t) => t.id === (ALIASES[tab] || tab)) || ITEMS[0];

  useEffect(() => {
    if (current.id !== "week") return;
    api
      .get("/hq/overview")
      .then((res) => {
        setOverview(res.data);
        setError("");
      })
      .catch((err) => err?.response?.status !== 401 && setError("Couldn't load HQ."));
  }, [reloadKey, current.id]);

  
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
              {(g.label || "Home").toUpperCase()}
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

        <current.Comp reloadKey={reloadKey} onChanged={reload} overview={overview} />
      </Box>
    </Box>
  );
}
