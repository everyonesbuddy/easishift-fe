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
import HqGovernment from "./HqGovernment";
import HqSuccess from "./HqSuccess";

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

// The menu follows the funnel, numbered in order and colored by step:
//   1 Leads: who we want (our ideal customer) and the buildings and people we've found
//   2 Campaigns: how we reach those leads
//   3 Marketing results: whether it's working (traffic, signups, conversion)
//   4 Customers: keeping paying customers healthy
//   5 Money: revenue, costs and profit
const GROUPS = [
  { label: "", items: [{ id: "week", label: "This week", Comp: HomePage, title: "This week", sub: "Everything to do this week, from every step below, ticked off as you go." }] },
  {
    label: "1 · Leads",
    note: "Who we want as customers, and the ones we've found",
    color: "#007AFF",
    ink: "#0062CC", // the same color, dark enough for text
    items: [
      { id: "playbook", label: "Ideal customer (ICP)", Comp: HqPlaybookRead, title: "Ideal customer and playbook", sub: "Who we sell to (the buildings and the people in them), why they buy, and how we sell to them." },
      { id: "facilities", label: "Facilities (accounts)", Comp: HqFacilities, title: "Facilities: our accounts", sub: "Every building that fits our ideal customer. Open one to call it, log it and see its history." },
      { id: "people", label: "Contacts (leads)", Comp: HqPeople, title: "Contacts: our leads", sub: "The people at those buildings who decide or schedule, executives first." },
      { id: "facebook", label: "Facebook groups & people", Comp: HqFacebook, title: "Facebook groups and people", sub: "The groups where our buyers talk, and the people we've met there. Everything here also shows up in This week." },
      { id: "government", label: "Government bids", Comp: HqGovernment, title: "Government bids", sub: "Federal listings from SAM.gov every morning, state and county ones you add, and where we stand on each. Deadlines also show in This week." },
    ],
  },
  {
    label: "2 · Campaigns",
    note: "How we reach leads: calls, emails, posts",
    color: "#AF52DE",
    ink: "#8E3FC2", // the same color, dark enough for text
    items: [
      { id: "schedulers", label: "To schedulers", Comp: SchedulersPage, title: "Campaigns to schedulers", sub: "Who schedulers are, what we say to them, and each campaign that reaches them: how it runs, its scripts, and this week's count." },
      { id: "leadership", label: "To DONs, EDs & admins", Comp: LeadershipPage, title: "Campaigns to DONs, EDs and admins", sub: "Who the leaders are, what we say to them, and each campaign that reaches them: how it runs, its scripts, and this week's count." },
      { id: "calendar", label: "Content calendar", Comp: CalendarPage, title: "Content calendar", sub: "Every post, video, email and template that campaigns use: ideas, drafts, what's scheduled and what's out." },
      { id: "scoreboard", label: "Campaign scoreboard", Comp: ScoreboardPage, title: "Campaign scoreboard", sub: "Each campaign's weekly target against the last four weeks, every campaign, and the week's schedule." },
    ],
  },
  {
    label: "3 · Marketing results",
    note: "Is it working: traffic, signups, conversion",
    color: "#FF9500",
    ink: "#B35900", // the same color, dark enough for text
    items: [
      { id: "numbers", label: "Funnel: visit to paying", Comp: HqNumbers, title: "Funnel", sub: "How people come in, how far they get from first visit to paying, and where they drop off." },
      { id: "signups", label: "Signups & trials", Comp: HqSignups, title: "Signups and trials", sub: "Who signed up, where they came from and how far they've got." },
      { id: "web", label: "Website traffic & search", Comp: HqWeb, title: "Website traffic and search", sub: "Visitors, pages and sources from Google Analytics, and searches from Search Console." },
      { id: "email", label: "Email results", Comp: HqEmail, title: "Email results (Klaviyo)", sub: "Our content email: who really clicks, how it lines up with our leads, and who to stop emailing." },
      { id: "channels", label: "Blog, video & LinkedIn", Comp: HqContent, title: "Blog, video and LinkedIn results", sub: "How what we've published is doing." },
    ],
  },
  {
    label: "4 · Customers",
    note: "Paying customers: keep them healthy",
    color: "#34C759",
    ink: "#1E7F3A", // the same color, dark enough for text
    items: [
      { id: "success", label: "Customer health", Comp: HqSuccess, title: "Customer health", sub: "Every customer we look after: how healthy they are and why, who owns them, the checklist for their stage, and the next check-in." },
      { id: "customer-messages", label: "Messages & texting", Comp: HqCustomerMessages, title: "Customer messages and texting", sub: "Texting this month and what it costs, each workspace's managers, and test sends of the morning summary, a nudge or a call-out alert." },
    ],
  },
  {
    label: "5 · Money",
    note: "Revenue, costs and profit",
    color: "#30B0C7",
    ink: "#0E7385", // the same color, dark enough for text
    items: [{ id: "money", label: "Profit & loss", Comp: HqMoney, title: "Profit and loss", sub: "Profit and loss by month: Stripe income, what we pay for, who's subscribed, when they're billed and who pays late." }],
  },
  {
    label: "Settings",
    color: "#8E8E93",
    ink: "#6E6E73", // the same color, dark enough for text
    items: [{ id: "connections", label: "Connections & data", Comp: HqConnections, title: "Connections and data", sub: "Keys, imports, Google Sheets and backups." }],
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
  const currentGroup = GROUPS.find((g) => g.items.includes(current));

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
            {g.label && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 2.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: g.color || IOS.tertiary, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 750, letterSpacing: "0.06em", textTransform: "uppercase", color: g.ink || IOS.tertiary }}>{g.label}</Typography>
              </Box>
            )}
            {g.note && <Typography sx={{ px: 2.5, pl: 4, fontSize: 11.5, color: IOS.tertiary, lineHeight: 1.3, mb: 0.5 }}>{g.note}</Typography>}
            {g.items.map((it) => {
              const active = it.id === current.id;
              return (
                <ButtonBase
                  key={it.id}
                  onClick={() => navigate(`/hq/${it.id}`)}
                  sx={{
                    display: "block",
                    textAlign: "left",
                    width: "calc(100% - 16px)",
                    mx: 1,
                    px: 1.5,
                    py: 0.85,
                    borderRadius: "8px",
                    fontSize: 14.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? IOS.ink : IOS.secondary,
                    bgcolor: active ? (g.color ? `${g.color}1F` : IOS.fill) : "transparent",
                    boxShadow: active && g.color ? `inset 3px 0 0 ${g.color}` : "none",
                    "&:hover": { bgcolor: g.color ? `${g.color}14` : IOS.fill },
                  }}
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
            <MenuItem key={`h-${g.label || "top"}`} disabled sx={{ fontSize: 12, fontWeight: 700, opacity: "1 !important", color: g.ink || IOS.tertiary }}>
              {(g.label || "Home").toUpperCase()}
            </MenuItem>,
            ...g.items.map((it) => (
              <MenuItem key={it.id} value={it.id}>
                {it.label}
              </MenuItem>
            )),
          ])}
        </TextField>

        {currentGroup?.label && (
          <Typography sx={{ fontSize: 12, fontWeight: 750, letterSpacing: "0.06em", textTransform: "uppercase", color: currentGroup.ink || IOS.tertiary }}>
            {currentGroup.label}
            {currentGroup.note ? ` · ${currentGroup.note}` : ""}
          </Typography>
        )}
        <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em" }}>{current.title}</Typography>
        <Typography sx={{ color: IOS.secondary, fontSize: 14.5, mb: 2.5 }}>{current.sub}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <current.Comp reloadKey={reloadKey} onChanged={reload} overview={overview} />
      </Box>
    </Box>
  );
}
