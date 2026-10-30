import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, Typography } from "@mui/material";
import { FiArrowDown, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Section, Tag } from "./HqBits";
import { errorText, shortDate } from "./hqFormat";
import usePlaybookPlays, { AUDIENCES, CHANNEL_LABELS } from "./usePlaybookPlays";
import HqPlays from "./HqPlays";
import HqPlaybook from "./HqPlaybook";
import HqContentPlan, { ItemDialog } from "./HqContentPlan";
import { PlayCard } from "./PlayCards";

// Content plan channel → playbook channel, so content sits with its channel.
const CONTENT_CHANNEL = { youtube: "youtube", linkedin: "linkedin", blog: "blog", website: "blog", newsletter: "newsletter", email: "newsletter", facebook: "facebook", other: "other" };
const STATUS = { idea: ["Idea", IOS.tertiary], drafting: ["Drafting", IOS.orange], ready: ["Ready", "#5856D6"], scheduled: ["Scheduled", IOS.blue], published: ["Published", IOS.green] };
const FORMAT_FOR = { youtube: "video", linkedin: "linkedin_post", blog: "blog_post", newsletter: "newsletter", facebook: "facebook_post" };

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

const Heading = ({ n, children, sub, id }) => (
  <Box id={id} sx={{ mt: 4, mb: 1.5, scrollMarginTop: 80 }}>
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: IOS.tertiary }}>STEP {n}</Typography>
    <Typography component="h2" sx={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" }}>{children}</Typography>
    {sub && <Typography sx={{ color: IOS.secondary, fontSize: 14.5 }}>{sub}</Typography>}
  </Box>
);

/**
 * One buyer's marketing plays, read top to bottom: what we're doing, how we
 * reach them on every channel (plays and the content for that channel
 * together), then everything to do now.
 */
export default function HqAudience({ audiences, reloadKey, onChanged }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [key, setKey] = useState(0);
  const playbookPlays = usePlaybookPlays();
  const audKey = audiences.join(",");

  useEffect(() => {
    let off = false;
    Promise.all([api.get("/hq/playbook"), api.get("/hq/content-plan")])
      .then(([pb, cp]) => {
        if (off) return;
        setData(pb.data);
        setItems(cp.data.items);
      })
      .catch((err) => !off && setError(errorText(err, "Couldn't load this page")));
    return () => {
      off = true;
    };
  }, [reloadKey, key, audKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || !items) return <CircularProgress size={22} />;

  const mine = (list) => (list || []).some((a) => audiences.includes(a));
  const buyers = (data.meta.buyers || []).filter((b) => audiences.includes(b.key));
  const plays = data.plays.filter((p) => mine(p.audience));
  const content = items.filter((i) => mine(i.audience));
  const channelKeys = [...new Set([...(data.meta.channels || []).map((c) => c.key), ...plays.map((p) => p.channel)])];
  const sections = channelKeys
    .map((ck) => ({
      key: ck,
      meta: (data.meta.channels || []).find((c) => c.key === ck),
      plays: plays.filter((p) => p.channel === ck || (ck === "blog" && p.channel === "search")),
      content: content.filter((i) => CONTENT_CHANNEL[i.channel] === ck),
    }))
    .filter((s) => s.plays.length || s.content.length);
  const toggle = (id) =>
    setOpen((s) => {
      const nx = new Set(s);
      if (nx.has(id)) nx.delete(id);
      else nx.add(id);
      return nx;
    });
  const refresh = () => setKey((k) => k + 1);

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Button size="small" startIcon={<FiArrowDown />} onClick={() => document.getElementById("todo")?.scrollIntoView({ behavior: "smooth" })} sx={{ px: 0, mb: 1 }}>
        Jump to what to do now
      </Button>

      <Heading n={1} sub="Who they are, what they care about, and what we offer them.">What we're doing</Heading>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${Math.max(1, buyers.length)}, 1fr)` }, gap: 1.25 }}>
        {buyers.map((b) => {
          const color = AUDIENCES[b.key]?.color || IOS.blue;
          return (
            <Box key={b.key} sx={{ p: 2, borderRadius: IOS.radius.card, bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderTop: `4px solid ${color}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color }}>{b.name}</Typography>
              {[
                ["Who", b.who],
                ["They care about", b.cares],
                ["Where they are", b.where],
                ["What we offer", b.offer],
              ].map(([k, v]) => (
                <Typography key={k} sx={{ fontSize: 14, mt: 0.75, lineHeight: 1.5 }}>
                  <b>{k}:</b> {v}
                </Typography>
              ))}
            </Box>
          );
        })}
      </Box>

      <Heading n={2} sub="Every channel we use for them: the plays we run there, and the content going out on it.">How we reach them</Heading>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        {sections.map((s) => {
          const upcoming = s.content.filter((i) => i.status !== "published").sort((a, b) => new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15));
          const publishedCount = s.content.length - upcoming.length;
          const isContent = Boolean(FORMAT_FOR[s.key]);
          return (
            <Section key={s.key} title={s.meta?.name || CHANNEL_LABELS[s.key] || s.key} note={s.meta?.why}>
              {s.plays.length > 0 && (
                <Box sx={{ display: "grid", gap: 1, mb: upcoming.length || isContent ? 2 : 0 }}>
                  {s.plays.map((p) => (
                    <PlayCard
                      key={p._id}
                      play={{ ...p, done: p.done }}
                      open={open.has(p._id)}
                      onToggle={() => toggle(p._id)}
                      editing={editing === p._id}
                      onEdit={() => setEditing(p._id)}
                      onDone={() => {
                        setEditing(null);
                        refresh();
                      }}
                    />
                  ))}
                </Box>
              )}
              {(upcoming.length > 0 || isContent) && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>
                      CONTENT {upcoming.length ? `· ${upcoming.length} coming up` : ""}
                      {publishedCount ? ` · ${publishedCount} published` : ""}
                    </Typography>
                    <Button size="small" startIcon={<FiPlus />} onClick={() => setOpenItem({ status: "idea", audience: [audiences[0]], format: FORMAT_FOR[s.key] || "other", channel: s.key === "blog" ? "blog" : s.key })} sx={{ ml: "auto" }}>
                      Add
                    </Button>
                  </Box>
                  {upcoming.slice(0, 5).map((i) => (
                    <ButtonBase
                      key={i._id}
                      onClick={() => setOpenItem(i)}
                      sx={{ display: "flex", width: "100%", textAlign: "left", gap: 1, py: 0.75, px: 1, borderRadius: "8px", alignItems: "center", "&:hover": { bgcolor: IOS.canvas } }}
                    >
                      <Tag color={STATUS[i.status][1]}>{STATUS[i.status][0]}</Tag>
                      <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0 }} noWrap>{i.title}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: IOS.secondary, flexShrink: 0 }}>{i.dueDate ? shortDate(i.dueDate) : ""}</Typography>
                    </ButtonBase>
                  ))}
                  {upcoming.length > 5 && <Typography sx={{ fontSize: 12.5, color: IOS.secondary, px: 1 }}>+{upcoming.length - 5} more in the content calendar</Typography>}
                  {!upcoming.length && <Typography sx={{ fontSize: 13, color: IOS.tertiary, px: 1 }}>Nothing planned yet.</Typography>}
                </Box>
              )}
            </Section>
          );
        })}
      </Box>

      <Box id="todo" sx={{ scrollMarginTop: 80 }}>
        <Heading n={3} sub="Across every channel above: people to contact and content to ship. Most urgent first.">To do now</Heading>
        <HqPlays audiences={audiences} reloadKey={reloadKey + key} onChanged={onChanged} title="Today" note=" " />
      </Box>

      <Button onClick={() => navigate("/hq/overall")} sx={{ mt: 3, px: 0 }}>
        See the full scoreboard and content calendar
      </Button>

      {openItem && (
        <ItemDialog
          item={openItem}
          plays={playbookPlays}
          onClose={() => setOpenItem(null)}
          onSaved={() => {
            setOpenItem(null);
            refresh();
          }}
        />
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
