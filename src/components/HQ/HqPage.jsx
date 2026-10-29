import { useCallback, useEffect, useState } from "react";
import { Alert, Box, ButtonBase, Container } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Stat } from "./HqBits";
import { n } from "./hqFormat";
import HqPlays from "./HqPlays";
import HqFacilities from "./HqFacilities";
import HqPeople from "./HqPeople";
import HqSignups from "./HqSignups";
import HqEmail from "./HqEmail";
import HqContent from "./HqContent";
import HqWeb from "./HqWeb";
import HqConnections from "./HqConnections";

const TABS = [
  { id: "plays", label: "Plays", Comp: HqPlays },
  { id: "facilities", label: "Facilities", Comp: HqFacilities },
  { id: "people", label: "People", Comp: HqPeople },
  { id: "signups", label: "Signups", Comp: HqSignups },
  { id: "email", label: "Email", Comp: HqEmail },
  { id: "content", label: "Content", Comp: HqContent },
  { id: "web", label: "Web & search", Comp: HqWeb },
  { id: "connections", label: "Connections", Comp: HqConnections },
];

/** HQ: WiserShifts' own command center (inside HqApp, behind the HQ sign-in). */
export default function HqPage() {
  const { tab = "plays" } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    api
      .get("/hq/overview")
      .then((res) => {
        setOverview(res.data);
        setError("");
      })
      .catch((err) => err?.response?.status !== 401 && setError("Couldn't load HQ."));
  }, [reloadKey]);

  const current = TABS.find((t) => t.id === tab) || TABS[0];
  const o = overview;
  const leaders = o ? ["executive_director", "administrator", "don", "regional", "owner"].reduce((s, r) => s + (o.contactsByRole?.[r] || 0), 0) : null;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 8 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 1 }}>
        <Stat label="Plays for today" value={o ? n(o.plays.today) : "…"} detail={o ? `${n(o.plays.total)} open in all` : ""} tone={o?.plays.today ? IOS.blue : undefined} onClick={() => navigate("/hq/plays")} />
        <Stat label="Signups" value={o ? n(o.signups.total) : "…"} detail={o ? `${o.signups.last7} this week · ${o.signups.active} active` : ""} onClick={() => navigate("/hq/signups")} />
        <Stat label="Paying" value={o ? n(o.signups.paid) : "…"} detail={o ? `${o.signups.trialing} on trial` : ""} onClick={() => navigate("/hq/signups")} />
        <Stat label="Facilities" value={o ? n(o.facilities) : "…"} detail="on our list" onClick={() => navigate("/hq/facilities")} />
        <Stat label="Leadership contacts" value={o ? n(leaders) : "…"} detail={o ? `${n(o.contacts)} people in all` : ""} onClick={() => navigate("/hq/people")} />
        <Stat
          label="Real email clicks"
          value={o ? n(o.email.human) : "…"}
          detail={o ? (o.email.bot ? `${n(o.email.clickers)} people · ${n(o.email.bot)} scanner clicks ignored` : `${n(o.email.clickers)} people`) : ""}
          onClick={() => navigate("/hq/email")}
        />
      </Box>

      <Box
        role="tablist"
        sx={{ display: "flex", gap: 0.5, mt: 3, mb: 2, overflowX: "auto", pb: 0.5, borderBottom: `1px solid ${IOS.separator}` }}
      >
        {TABS.map((t) => {
          const active = t.id === current.id;
          return (
            <ButtonBase
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => navigate(`/hq/${t.id}`)}
              sx={{
                px: 1.5,
                py: 1,
                fontSize: 14.5,
                fontWeight: active ? 700 : 500,
                color: active ? IOS.ink : IOS.secondary,
                borderBottom: `2px solid ${active ? IOS.ink : "transparent"}`,
                mb: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </ButtonBase>
          );
        })}
      </Box>

      <current.Comp reloadKey={reloadKey} onChanged={reload} overview={o} />
    </Container>
  );
}
