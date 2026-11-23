// HQ team activity: pick a workspace, see everyone in it (managers and staff)
// and how they use WiserShifts. Last seen in the app or on their link, the
// device, whether texts reach them, and what they do (shifts, clock-ins,
// call-outs picked up, swaps, time off). Signups shows the workspace; this
// shows the people in it.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, ButtonBase, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Section, Stat, Tag } from "./HqBits";
import { ago, errorText, num } from "./hqFormat";

const SEEN = {
  week: ["This week", IOS.green],
  month: ["8–30 days ago", IOS.orange],
  quiet: ["Over 30 days", IOS.red],
  never: ["Never opened", IOS.red],
};
const FILTERS = [
  ["all", "Everyone"],
  ["managers", "Managers"],
  ["staff", "Staff"],
  ["never", "Never opened"],
  ["quiet", "Not this week"],
  ["notext", "Can't get texts"],
];
const ROLE = { owner: "Owner", administrator: "Admin", scheduler: "Scheduler", viewer: "Viewer" };
const cap = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Person({ p }) {
  const [label, color] = SEEN[p.seen] || SEEN.never;
  const how = [p.access.app && "App", p.access.link && "Link"].filter(Boolean).join(" + ") || "No access yet";
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(200px, 1.3fr) minmax(170px, 1fr) minmax(170px, 1fr) minmax(190px, 1.2fr)" }, gap: { xs: 0.5, md: 2 }, py: 1.25, px: 1, borderBottom: `1px solid ${IOS.hairline}` }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5 }} noWrap>{p.name}</Typography>
          {p.accountRoles.map((r) => (
            <Tag key={r} color={IOS.blue}>{ROLE[r] || cap(r)}</Tag>
          ))}
          {p.jobRoles.slice(0, 2).map((r) => (
            <Tag key={r}>{r.length <= 4 ? r.toUpperCase() : cap(r)}</Tag>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{p.email || p.phone || "No email or phone"}</Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Tag color={color}>{label}</Tag>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.25 }}>
          {p.lastSeenAt ? `Seen ${ago(p.lastSeenAt)}` : "Never seen"}
        </Typography>
        <Typography sx={{ fontSize: 12, color: IOS.tertiary }} noWrap>
          {p.appSeenAt ? `App ${ago(p.appSeenAt)}` : ""}
          {p.appSeenAt && p.linkOpenedAt ? " · " : ""}
          {p.linkOpenedAt ? `Link ${ago(p.linkOpenedAt)}` : ""}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13 }}>{how}</Typography>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>
          {p.access.devices.length ? p.access.devices.join(", ") : "No device saved"}
          {!p.manager && p.access.link ? (p.access.pinSet ? " · PIN set" : " · no PIN") : ""}
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: p.texting.ok ? IOS.greenText : IOS.redText }} noWrap>
          {p.texting.ok ? "Texts reach them" : p.texting.why}
          {p.texting.ok && p.texts30 ? ` · ${p.texts30} in 30 days` : ""}
        </Typography>
      </Box>

      {p.manager && !p.shiftsNext7 && !p.worked14 && !p.clockIns14 && !p.callOutsAsked30 ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: IOS.secondary }}>Not on the schedule</Typography>
        </Box>
      ) : (
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, ...num }}>
          {p.shiftsNext7} shift{p.shiftsNext7 === 1 ? "" : "s"} next 7 days · {p.worked14} worked in 2 wk
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>
          {p.clockIns14 ? `${p.clockIns14} clock-in${p.clockIns14 === 1 ? "" : "s"} · last ${ago(p.lastClockInAt)}` : "No clock-ins in 2 wk"}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>
          {p.callOutsAsked30 ? `Picked up ${p.callOutsPickedUp30} of ${p.callOutsAsked30} call-outs` : "No call-out texts"}
          {p.swaps30 ? ` · ${p.swaps30} swap${p.swaps30 === 1 ? "" : "s"}` : ""}
          {p.timeOff30 ? ` · ${p.timeOff30} time off` : ""}
        </Typography>
        {(p.noShows30 > 0 || p.callOuts30 > 0) && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: IOS.orangeText }}>
            {[p.callOuts30 && `${p.callOuts30} called out`, p.noShows30 && `${p.noShows30} no-show`].filter(Boolean).join(" · ")} in 30 days
          </Typography>
        )}
      </Box>
      )}
    </Box>
  );
}

function Team({ tenantId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let off = false; // keyed by workspace, so it starts empty for each one
    api
      .get(`/hq/team/${tenantId}`)
      .then((r) => !off && setData(r.data))
      .catch((e) => !off && setError(errorText(e, "Couldn't load this team.")));
    return () => {
      off = true;
    };
  }, [tenantId]);

  const people = useMemo(() => {
    const list = data?.people || [];
    if (filter === "managers") return list.filter((p) => p.manager);
    if (filter === "staff") return list.filter((p) => !p.manager);
    if (filter === "never") return list.filter((p) => p.seen === "never");
    if (filter === "quiet") return list.filter((p) => p.seen !== "week");
    if (filter === "notext") return list.filter((p) => !p.texting.ok);
    return list;
  }, [data, filter]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const s = data.summary;
  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
        <Stat label="People" value={s.people} detail={`${s.managers} manager${s.managers === 1 ? "" : "s"} · ${s.staff} staff`} />
        <Stat label="Seen this week" value={s.seen7} detail={`${s.staffSeen7} of ${s.staff} staff`} tone={s.people && s.seen7 / s.people >= 0.6 ? IOS.greenText : undefined} />
        <Stat label="Never opened" value={s.neverSeen} detail={`${s.staffNeverSeen} staff`} tone={s.neverSeen ? IOS.redText : undefined} onClick={() => setFilter("never")} />
        <Stat label="Can't get texts" value={s.cantText} detail="no number, STOP or failing" tone={s.cantText ? IOS.orangeText : undefined} onClick={() => setFilter("notext")} />
        <Stat label="Call-outs picked up" value={s.pickedUp30} detail={`last 30 days · ${s.clockingIn} clocking in`} />
      </Box>

      {s.tips.length > 0 && (
        <Box sx={{ bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>What to work on with them</Typography>
          {s.tips.map((t) => (
            <Typography key={t} sx={{ fontSize: 13.5 }}>· {t}</Typography>
          ))}
        </Box>
      )}

      <Section
        title={`${data.workspace.name}: everyone (${data.people.length})`}
        note="Managers first, then most recently seen. Seen = the app (an account) or their personal schedule link, whichever is later. Both update at most once an hour."
        right={
          <TextField size="small" select value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 170 }}>
            {FILTERS.map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
        }
      >
        {!people.length && <Empty>Nobody here.</Empty>}
        {people.map((p) => (
          <Person key={p._id} p={p} />
        ))}
      </Section>
    </>
  );
}

/** Every workspace's people and how they use WiserShifts. */
export default function HqTeam() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const tenantId = params.get("workspace") || "";

  useEffect(() => {
    let off = false;
    api
      .get("/hq/team", { params: all ? { all: 1 } : {} })
      .then((r) => !off && setList(r.data.workspaces))
      .catch((e) => !off && setError(errorText(e, "Couldn't load workspaces.")));
    return () => {
      off = true;
    };
  }, [all]);

  const pick = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("workspace", id);
    else next.delete("workspace");
    setParams(next, { replace: true });
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!list) return <CircularProgress size={22} />;
  const current = list.find((w) => w.tenantId === tenantId);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Section
        title="Workspaces"
        note="Paying first, then most recently used. Pick one to see everyone in it."
        right={
          <ButtonBase onClick={() => setAll(!all)} sx={{ fontSize: 13, fontWeight: 600, color: IOS.blue, px: 1, py: 0.5, borderRadius: 1 }}>
            {all ? "Hide test and demo" : "Show test and demo"}
          </ButtonBase>
        }
      >
        {!list.length && <Empty>No workspaces yet.</Empty>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
          {list.map((w) => {
            const on = w.tenantId === tenantId;
            return (
              <ButtonBase
                key={w.tenantId}
                onClick={() => pick(on ? "" : w.tenantId)}
                sx={{ display: "block", textAlign: "left", p: 1.5, borderRadius: IOS.radius.cell, bgcolor: on ? "rgba(0,122,255,0.08)" : IOS.canvas, border: `1px solid ${on ? IOS.blue : "transparent"}`, opacity: w.tag ? 0.6 : 1 }}
              >
                <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 0 }} noWrap>{w.name}</Typography>
                  {w.paid ? <Tag color={IOS.green}>Paying</Tag> : w.trialDaysLeft !== null ? <Tag color={IOS.blue}>Trial</Tag> : w.tag ? <Tag>{cap(w.tag.kind)}</Tag> : <Tag>Free</Tag>}
                </Box>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>
                  {w.seen7} of {w.people} seen this week{w.neverSeen ? ` · ${w.neverSeen} never` : ""}
                </Typography>
                <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>{w.lastSeenAt ? `Last activity ${ago(w.lastSeenAt)}` : "No activity yet"}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Section>

      {tenantId ? <Team key={tenantId} tenantId={tenantId} /> : <Empty>Pick a workspace above to see its people.</Empty>}
      {current?.tag && <Typography sx={{ fontSize: 12.5, color: IOS.tertiary }}>This workspace is tagged {cap(current.tag.kind).toLowerCase()}, so it's left out of HQ's counts.</Typography>}
    </Box>
  );
}
