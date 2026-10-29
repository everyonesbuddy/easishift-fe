import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../config/api";
import { IOS } from "../../theme/ios";
import { Empty, NotConnected, RolePill, Section, Stat } from "./HqBits";
import { ago, errorText, n, num } from "./hqFormat";

/** Klaviyo: who really clicked (email scanners click everything; we count those apart). */
export default function HqEmail({ reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let off = false;
    api
      .get("/hq/email")
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load email")));
    return () => {
      off = true;
    };
  }, [reloadKey, key]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/hq/sync/klaviyo");
      const c = res.data.counts || {};
      toast.success(`Synced: ${c.received || 0} people sent to, ${c.clicked || 0} with clicks`);
      setKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const t = data.totals;
  const botShare = t.human + t.bot ? Math.round((t.bot / (t.human + t.bot)) * 100) : 0;

  return (
    <Section
      title="Email (Klaviyo)"
      note={data.sync?.lastOkAt ? `Synced ${ago(data.sync.lastOkAt)}. Runs every hour.` : "Not synced yet."}
      right={
        data.configured && (
          <Button size="small" variant="outlined" startIcon={<FiRefreshCw />} disabled={syncing} onClick={sync} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        )
      }
    >
      {!data.configured && <NotConnected what="Klaviyo" env={["KLAVIYO_PRIVATE_KEY", "KLAVIYO_LIST_ID"]} />}
      {data.sync?.error && <Alert severity="warning" sx={{ mb: 2 }}>Last sync: {data.sync.error}</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1, mb: 2 }}>
        <Stat label="People emailed" value={n(t.people)} />
        <Stat label="Emails delivered" value={n(t.delivered)} />
        <Stat label="Real clicks" value={n(t.human)} tone={IOS.blue} />
        <Stat label="Scanner clicks (ignored)" value={n(t.bot)} detail={t.bot ? `${botShare}% of all clicks` : ""} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>Who really clicked</Typography>
      {!data.clickers.length && <Empty>No real clicks yet.</Empty>}
      {data.clickers.map((c) => (
        <Box key={c.email} sx={{ display: "flex", gap: 2, py: 1, px: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{c.contact?.name || c.email}</Typography>
              <RolePill role={c.contact?.role} />
            </Box>
            <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>
              {c.contact ? [c.contact.title, c.contact.facilityName || c.contact.group].filter(Boolean).join(" · ") : "Not in our list"} · {c.email}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: "1 1 220px" }} noWrap>
            {(c.campaignsClicked || []).slice(-2).join(", ")}
          </Typography>
          <Box sx={{ textAlign: "right", flex: "0 0 140px" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: IOS.blue, ...num }}>{c.humanClicks} clicks</Typography>
            <Typography sx={{ fontSize: 12, color: IOS.secondary }}>last {ago(c.lastHumanClickAt)}</Typography>
          </Box>
        </Box>
      ))}
    </Section>
  );
}
