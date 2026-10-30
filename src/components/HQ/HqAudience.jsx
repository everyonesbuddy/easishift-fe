import { useEffect, useState } from "react";
import { Alert, Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { errorText } from "./hqFormat";
import { AUDIENCES } from "./usePlaybookPlays";
import HqPlays from "./HqPlays";
import HqPlaybook from "./HqPlaybook";
import HqContentPlan from "./HqContentPlan";
import { PlayCard } from "./PlayCards";


/** Small tab bar used inside a page. */
export function SubTabs({ tabs, value, onChange }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, mb: 2, borderBottom: `1px solid ${IOS.separator}`, overflowX: "auto" }}>
      {tabs.map(([k, label]) => (
        <ButtonBase
          key={k}
          onClick={() => onChange(k)}
          sx={{ px: 1.5, py: 1, fontSize: 14.5, fontWeight: value === k ? 700 : 500, color: value === k ? IOS.ink : IOS.secondary, borderBottom: `2px solid ${value === k ? IOS.ink : "transparent"}`, mb: "-1px", whiteSpace: "nowrap" }}
        >
          {label}
        </ButtonBase>
      ))}
    </Box>
  );
}

// Which tab a play belongs on.
const tabForPlay = (p) => (p.channel === "calls" ? "calls" : p.channel === "email" ? "email" : p.channel === "linkedin" && p.countsFrom === "activities" ? "linkedin" : "content");

const TABS = {
  content: { label: "Content", note: "What we publish for them: LinkedIn posts, videos, Klaviyo emails, blog posts and templates, Facebook groups. Plan it on the board below." },
  email: { label: "Cold email", note: "One-to-one emails from your own inbox, not Klaviyo. Log each one on the facility with its play so it counts." },
  calls: { label: "Calls", note: "Phone calls to the building. Log each one on the facility with its play so it counts." },
  linkedin: { label: "LinkedIn outreach", note: "Connection requests and messages, one person at a time. Log each message with its play so it counts." },
};

/**
 * One buyer's marketing plays: a short explanation, then tabs. "To do now"
 * has everything for this buyer; each other tab is one way we reach them
 * (content, cold email, calls…) with its plays and its own to-dos.
 */
export default function HqAudience({ audiences, reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("todo");
  const [open, setOpen] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [key, setKey] = useState(0);
  const audKey = audiences.join(",");

  useEffect(() => {
    let off = false;
    api
      .get("/hq/playbook")
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load this page")));
    return () => {
      off = true;
    };
  }, [reloadKey, key, audKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  const mine = (list) => (list || []).some((a) => audiences.includes(a));
  const buyers = (data.meta.buyers || []).filter((b) => audiences.includes(b.key));
  const plays = data.plays.filter((p) => mine(p.audience));
  const playTab = new Map(data.plays.map((p) => [String(p._id), tabForPlay(p)]));
  const tabs = ["content", "email", "calls", "linkedin"].filter((t) => plays.some((p) => tabForPlay(p) === t));
  // Which tab a to-do belongs on.
  const todoTab = (t) => (t.playId && playTab.get(t.playId)) || (t.channel === "calls" ? "calls" : t.channel === "email" ? "email" : "content");
  const toggle = (id) =>
    setOpen((st) => {
      const nx = new Set(st);
      if (nx.has(id)) nx.delete(id);
      else nx.add(id);
      return nx;
    });

  return (
    <Box>
      {/* The explanation */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${Math.max(1, buyers.length)}, 1fr)` }, gap: 1.25, mb: 2.5 }}>
        {buyers.map((b) => {
          const color = AUDIENCES[b.key]?.color || IOS.blue;
          return (
            <Box key={b.key} sx={{ p: 2, borderRadius: IOS.radius.card, bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderLeft: `4px solid ${color}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color }}>{b.name}</Typography>
              <Typography sx={{ fontSize: 14, mt: 0.5, lineHeight: 1.5 }}>{b.who}</Typography>
              {[
                ["They care about", b.cares],
                ["What we offer", b.offer],
                ["How we reach them", b.how],
              ].map(([k, v]) => (
                <Typography key={k} sx={{ fontSize: 14, mt: 0.75, lineHeight: 1.5 }}>
                  <b>{k}:</b> {v}
                </Typography>
              ))}
            </Box>
          );
        })}
      </Box>

      <SubTabs tabs={[["todo", "To do now"], ...tabs.map((t) => [t, TABS[t].label])]} value={tab} onChange={setTab} />

      {tab === "todo" && (
        <HqPlays
          audiences={audiences}
          reloadKey={reloadKey + key}
          onChanged={onChanged}
          title="Today"
          note="Everything for this buyer, across content, cold email, calls and LinkedIn. Most urgent first."
        />
      )}

      {tab !== "todo" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Typography sx={{ color: IOS.secondary, fontSize: 14.5 }}>{TABS[tab].note}</Typography>

          <HqPlays
            audiences={audiences}
            filter={(t) => todoTab(t) === tab}
            hideChannels={tab !== "content"}
            reloadKey={reloadKey + key}
            onChanged={onChanged}
            title={`To do now: ${TABS[tab].label.toLowerCase()}`}
            note=" "
            emptyText="Nothing to do here right now."
          />

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: IOS.secondary, textTransform: "uppercase", mb: 0.75 }}>
              The plays
            </Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {plays
                .filter((p) => tabForPlay(p) === tab)
                .map((p) => (
                  <PlayCard
                    key={p._id}
                    play={p}
                    open={open.has(p._id)}
                    onToggle={() => toggle(p._id)}
                    editing={editing === p._id}
                    onEdit={() => setEditing(p._id)}
                    onDone={() => {
                      setEditing(null);
                      setKey((k) => k + 1);
                    }}
                  />
                ))}
            </Box>
          </Box>

          {tab === "content" && (
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: IOS.secondary, textTransform: "uppercase", mb: 0.75 }}>
                Content board
              </Typography>
              <HqContentPlan audiences={audiences} reloadKey={reloadKey + key} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/** The whole program: scoreboard, every play, the week, and the full content calendar. */
export function HqOverall({ reloadKey, onChanged }) {
  const [tab, setTab] = useState("now");
  return (
    <Box>
      <SubTabs
        tabs={[
          ["now", "Everything to do now"],
          ["score", "Scoreboard, marketing plays and the week"],
          ["content", "Content calendar"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "score" && <HqPlaybook reloadKey={reloadKey} />}
      {tab === "content" && <HqContentPlan reloadKey={reloadKey} />}
      {tab === "now" && <HqPlays reloadKey={reloadKey} onChanged={onChanged} title="Today" />}
    </Box>
  );
}
