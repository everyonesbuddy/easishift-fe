import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Container, IconButton, Typography } from "@mui/material";
import { FiChevronLeft, FiChevronRight, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { IOS, roleColor } from "../../../theme/ios";
import LaborSettingsDialog from "./LaborSettingsDialog";
import { certLabel, dayLabel, hours, money, roleLabel, weekLabel } from "./laborFormat";

const card = {
  bgcolor: IOS.surface,
  borderRadius: IOS.radius.card,
  boxShadow: IOS.shadow,
  border: `1px solid ${IOS.hairline}`,
};

function Stat({ label, value, sub, tone }) {
  const color = tone === "bad" ? IOS.redText : tone === "warn" ? IOS.orangeText : tone === "good" ? IOS.greenText : IOS.ink;
  return (
    <Box sx={{ ...card, p: 2, minWidth: 0 }}>
      <Typography sx={{ color: IOS.secondary, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      {sub && <Typography sx={{ color: IOS.secondary, fontSize: 13 }}>{sub}</Typography>}
    </Box>
  );
}

function Panel({ title, hint, children, action }) {
  return (
    <Box sx={{ ...card, p: 2, minWidth: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: hint ? 0 : 1 }}>
        <Typography sx={{ fontWeight: 700, color: IOS.ink }}>{title}</Typography>
        {action}
      </Box>
      {hint && <Typography sx={{ color: IOS.secondary, fontSize: 13, mb: 1.25 }}>{hint}</Typography>}
      {children}
    </Box>
  );
}

const Empty = ({ children }) => <Typography sx={{ color: IOS.tertiary, fontSize: 14 }}>{children}</Typography>;

const Row = ({ left, right, sub, dot }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
    {dot && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dot, flexShrink: 0 }} />}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: IOS.ink }} noWrap>{left}</Typography>
      {sub && <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>{sub}</Typography>}
    </Box>
    {right !== undefined && (
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: IOS.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{right}</Typography>
    )}
  </Box>
);

/**
 * Labor: one building's week for leadership (ED, DON, VP) and schedulers.
 * Hours vs budget, cost (owners/admins), overtime coming, call-outs, open
 * shifts, credentials and a watch list. Paid plans.
 */
export default function LaborPage() {
  const { can, hasFeature, facilityPreferences } = useAuth();
  const navigate = useNavigate();
  const included = hasFeature("labor");
  const [weekStart, setWeekStart] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reload, setReload] = useState(0);

  const load = useCallback(
    (key) =>
      api
        .get("/labor/report", { params: key ? { weekStart: key } : {} })
        .then((res) => {
          setData(res.data);
          setError("");
        })
        .catch((err) => {
          if (err?.response?.status === 402) return;
          setError(err?.response?.data?.message || "Couldn't load the labor report");
        }),
    [],
  );

  useEffect(() => {
    if (included) load(weekStart);
  }, [included, weekStart, reload, load]);

  if (!can("labor.view")) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">Labor is for owners, admins, schedulers and viewers.</Alert>
      </Container>
    );
  }

  if (!included) {
    return (
      <Container sx={{ mt: 4, mb: 6 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 700, color: IOS.ink, letterSpacing: "-0.02em" }}>Labor</Typography>
        <Box sx={{ ...card, p: 3, mt: 2, maxWidth: 720 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>See where your labor hours and dollars go, every week</Typography>
          <Typography sx={{ color: IOS.secondary, mt: 1 }}>
            Hours against your budget per resident day, overtime before it hits payroll, call-outs by shift, open
            shifts, credentials about to expire, and who's at risk of leaving. Plus a Monday email for your ED and
            regional VP.
          </Typography>
          {can("billing.manage") ? (
            <Button variant="contained" disableElevation onClick={() => navigate("/billing")} sx={{ mt: 2, borderRadius: "10px", bgcolor: IOS.blue }}>
              See paid plans
            </Button>
          ) : (
            <Typography sx={{ color: IOS.secondary, mt: 2, fontSize: 14 }}>Ask the workspace owner to upgrade to turn this on.</Typography>
          )}
        </Box>
      </Container>
    );
  }

  const roles = facilityPreferences?.roleFamilies || [];
  const d = data;
  const b = d?.budget;
  const ppdTone = b && b.targetPPD !== null ? (b.scheduledPPD > b.targetPPD * 1.03 ? "bad" : b.scheduledPPD < b.targetPPD * 0.9 ? "warn" : "good") : undefined;
  const isThisWeek = d && d.weekStart === d.thisWeek;

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: IOS.ink }}>Labor</Typography>
          <Typography sx={{ color: IOS.secondary }}>Your building's staffing, hours and labor for the week.</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton aria-label="Previous week" onClick={() => d && setWeekStart(d.previous)} sx={{ bgcolor: IOS.fill }}>
            <FiChevronLeft />
          </IconButton>
          <Typography sx={{ fontWeight: 700, minWidth: 150, textAlign: "center" }}>
            {d ? `${isThisWeek ? "This week · " : ""}${weekLabel(d.days)}` : "…"}
          </Typography>
          <IconButton aria-label="Next week" onClick={() => d && setWeekStart(d.next)} sx={{ bgcolor: IOS.fill }}>
            <FiChevronRight />
          </IconButton>
          {d && !isThisWeek && (
            <Button size="small" onClick={() => setWeekStart(d.thisWeek)} sx={{ fontWeight: 600 }}>
              This week
            </Button>
          )}
          {d?.canManage && (
            <Button
              startIcon={<FiSettings />}
              onClick={() => setSettingsOpen(true)}
              sx={{ bgcolor: IOS.fill, color: IOS.ink, borderRadius: "10px", px: 2, fontWeight: 600 }}
            >
              Settings
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {!d && !error && <Typography sx={{ mt: 3, color: IOS.secondary }}>Loading…</Typography>}

      {d && (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 1.5, mt: 3 }}>
            <Stat
              label="Hours scheduled"
              value={hours(d.hours.scheduled)}
              sub={d.hours.timeClockUsed ? `${hours(d.hours.worked)} worked (time clock)` : "No time clock entries"}
            />
            <Stat
              label="Hours per resident day"
              value={b ? b.scheduledPPD : "–"}
              tone={ppdTone}
              sub={
                b
                  ? b.targetPPD !== null
                    ? `Target ${b.targetPPD} · ${b.varianceHours >= 0 ? "+" : ""}${b.varianceHours} h vs budget`
                    : "Set a target in Settings"
                  : "Add residents in Settings"
              }
            />
            {d.canSeeCosts && (
              <Stat
                label="Labor cost"
                value={d.costs?.needsRates ? "–" : money(d.costs?.scheduled)}
                sub={
                  d.costs?.needsRates
                    ? "Add pay rates in Settings"
                    : d.costs?.overtimePremium
                      ? `incl. ${money(d.costs.overtimePremium)} overtime`
                      : "Scheduled hours × pay rates"
                }
                tone={d.costs?.overtimePremium ? "warn" : undefined}
              />
            )}
            <Stat
              label="Overtime"
              value={hours(d.overtime.totalOvertimeHours)}
              tone={d.overtime.people.length ? "warn" : "good"}
              sub={`${d.overtime.people.length} ${d.overtime.people.length === 1 ? "person" : "people"} over ${d.overtime.thresholdHours} h`}
            />
            <Stat
              label="Call-outs · no-shows"
              value={`${d.attendance.callOuts} · ${d.attendance.noShows}`}
              tone={d.attendance.noShows ? "bad" : d.attendance.callOuts ? "warn" : "good"}
              sub={d.attendance.byShift[0] ? `Most on ${d.attendance.byShift[0].label}` : "None this week"}
            />
            <Stat
              label="Open shifts"
              value={`${d.openShifts.openUpcoming} open`}
              tone={d.openShifts.unfilledPast ? "bad" : d.openShifts.openUpcoming ? "warn" : "good"}
              sub={`${d.openShifts.unfilledPast} missed · ${d.openShifts.filled} of ${d.openShifts.required} spots filled`}
            />
          </Box>

          {d.costs?.missingRates?.length > 0 && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: "12px" }}>
              No pay rate for {d.costs.missingRates.map(roleLabel).join(", ")}, so those hours aren't in the cost.
            </Alert>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
            <Panel title="Overtime coming" hint={`Over ${d.overtime.thresholdHours} h this week, counting worked and still-scheduled shifts. Swap a shift before it hits payroll.`}>
              {d.overtime.people.length ? (
                d.overtime.people.map((o) => (
                  <Row
                    key={o.staffId}
                    dot={roleColor(o.role, roles)}
                    left={o.name}
                    sub={`${roleLabel(o.role)} · ${o.alreadyOver ? "already over" : `goes over ${dayLabel(o.crossesOn)}`}`}
                    right={`${hours(o.projectedHours)} (+${o.overtimeHours})`}
                  />
                ))
              ) : (
                <Empty>No one goes over {d.overtime.thresholdHours} hours this week.</Empty>
              )}
            </Panel>

            <Panel title="Credentials" hint="Expired, or expiring in the next 30 days. Add expiry dates on each person's certifications.">
              {d.credentials.expired.length + d.credentials.expiringSoon.length ? (
                [...d.credentials.expired, ...d.credentials.expiringSoon].map((c) => (
                  <Row
                    key={`${c.staffId}:${c.tag}`}
                    dot={c.daysLeft <= 0 ? IOS.red : IOS.orange}
                    left={c.name}
                    sub={`${certLabel(c.tag)} · ${dayLabel(c.expiresAt.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })}`}
                    right={c.daysLeft <= 0 ? "Expired" : `${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`}
                  />
                ))
              ) : (
                <Empty>Nothing expired or expiring in the next 30 days.</Empty>
              )}
            </Panel>

            <Panel title="Watch list" hint="Signs of burnout or drifting away over the last 4 weeks. Worth a check-in before they quit.">
              {d.turnoverWatch.length ? (
                d.turnoverWatch.map((w) => (
                  <Row key={w.staffId} dot={roleColor(w.role, roles)} left={w.name} sub={`${roleLabel(w.role)} · ${w.reasons.join("; ")}`} />
                ))
              ) : (
                <Empty>No one stands out right now.</Empty>
              )}
            </Panel>

            <Panel title="Call-outs and no-shows by shift">
              {d.attendance.byShift.length ? (
                d.attendance.byShift.map((s) => (
                  <Row key={s.key} left={s.label} right={`${s.callOuts} · ${s.noShows}`} sub={`${s.callOuts} call-out${s.callOuts === 1 ? "" : "s"}, ${s.noShows} no-show${s.noShows === 1 ? "" : "s"}`} />
                ))
              ) : (
                <Empty>No call-outs or no-shows this week.</Empty>
              )}
            </Panel>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
            <Panel title="Hours by role">
              {d.hours.byRole.length ? (
                d.hours.byRole.map((r) => (
                  <Row
                    key={r.role}
                    dot={roleColor(r.role, roles)}
                    left={roleLabel(r.role)}
                    sub={d.hours.timeClockUsed ? `${hours(r.worked)} worked` : undefined}
                    right={hours(r.scheduled)}
                  />
                ))
              ) : (
                <Empty>No shifts this week.</Empty>
              )}
            </Panel>

            <Panel title="Hours by day">
              {d.hours.byDay.map((day) => (
                <Row
                  key={day.date}
                  left={dayLabel(day.date)}
                  sub={d.hours.timeClockUsed ? `${hours(day.worked)} worked` : undefined}
                  right={hours(day.scheduled)}
                />
              ))}
            </Panel>
          </Box>

          {!d.hours.timeClockUsed && (
            <Typography sx={{ color: IOS.secondary, fontSize: 13, mt: 1.5 }}>
              Hours are from the schedule. Turn on the time clock to compare with hours actually worked.
            </Typography>
          )}
        </>
      )}

      {settingsOpen && (
        <LaborSettingsDialog
          roles={roles}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            setReload((n) => n + 1);
          }}
        />
      )}
    </Container>
  );
}
