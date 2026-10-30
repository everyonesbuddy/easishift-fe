import { useEffect, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { AUDIENCES } from "./usePlaybookPlays";
import HqPlays from "./HqPlays";
import HqPlaybook from "./HqPlaybook";
import HqContentPlan from "./HqContentPlan";

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

/** Who this buyer is, from the written playbook. */
function BuyerCards({ keys }) {
  const [buyers, setBuyers] = useState(null);
  useEffect(() => {
    let off = false;
    api
      .get("/hq/playbook")
      .then((res) => !off && setBuyers((res.data.meta.buyers || []).filter((b) => keys.includes(b.key))))
      .catch(() => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys is fixed per page
  }, []);
  if (!buyers?.length) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${buyers.length}, 1fr)` }, gap: 1.25, mb: 2.5 }}>
      {buyers.map((b) => {
        const color = AUDIENCES[b.key]?.color || IOS.blue;
        return (
          <Box key={b.key} sx={{ p: 1.75, borderRadius: IOS.radius.cell, bgcolor: IOS.surface, border: `1px solid ${IOS.hairline}`, borderLeft: `4px solid ${color}` }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color }}>{b.name}</Typography>
            <Typography sx={{ fontSize: 13.5, mt: 0.5 }}>
              <b>Care about:</b> {b.cares}
            </Typography>
            <Typography sx={{ fontSize: 13.5, mt: 0.25 }}>
              <b>Offer:</b> {b.offer}
            </Typography>
            <Typography sx={{ fontSize: 13.5, mt: 0.25, color: IOS.secondary }}>
              <b>Reach them:</b> {b.how}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * One buyer's page: what to do today for them, their plays (with the
 * scoreboard), and their content.
 */
export default function HqAudience({ audiences, roles, reloadKey, onChanged }) {
  const [tab, setTab] = useState("now");
  return (
    <Box>
      <BuyerCards keys={audiences} />
      <SubTabs
        tabs={[
          ["now", "To do now"],
          ["plays", "Marketing plays"],
          ["content", "Content"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "now" && <HqPlays roles={roles} title="To do now" reloadKey={reloadKey} onChanged={onChanged} />}
      {tab === "plays" && <HqPlaybook audiences={audiences} reloadKey={reloadKey} />}
      {tab === "content" && <HqContentPlan audiences={audiences} reloadKey={reloadKey} />}
    </Box>
  );
}

/** The whole program: scoreboard, every play, the week, and the full content calendar. */
export function HqOverall({ reloadKey, onChanged }) {
  const [tab, setTab] = useState("score");
  return (
    <Box>
      <SubTabs
        tabs={[
          ["score", "Scoreboard, marketing plays and the week"],
          ["content", "Content calendar"],
          ["now", "Everything to do now"],
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
