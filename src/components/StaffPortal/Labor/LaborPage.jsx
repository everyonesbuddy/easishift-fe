import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, Container, IconButton, Typography } from "@mui/material";
import { FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiChevronRight, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { IOS, roleColor, tint } from "../../../theme/ios";
import LaborSettingsDialog from "./LaborSettingsDialog";
import { certLabel, dayLabel, hours, money, roleLabel, weekLabel } from "./laborFormat";

// Regular hours on the overtime bars: a calm slate so the red overtime stands out.
const OT_REGULAR = "#8E9AAF";

const surface = {
  bgcolor: IOS.surface,
  borderRadius: IOS.radius.card,
  boxShadow: IOS.shadow,
  border: `1px solid ${IOS.hairline}`,
};
const num = { fontVariantNumeric: "tabular-nums" };
const TONE = { good: IOS.greenText, warn: IOS.orangeText, bad: IOS.redText, none: IOS.ink };

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** What needs someone's attention this week, most urgent first. */
function attentionItems(d) {
  const items = [];
  const exp = d.credentials.expired.length;
  const soon = d.credentials.expiringSoon.length;
  if (d.openShifts.unfilledPast) items.push({ tone: "bad", text: `${plural(d.openShifts.unfilledPast, "shift")} went unfilled`, target: "labor-shifts" });
  if (exp) items.push({ tone: "bad", text: `${plural(exp, "certification")} expired`, target: "labor-credentials" });
  if (d.overtime.people.length) items.push({ tone: "warn", text: `${plural(d.overtime.people.length, "person", "people")} going into overtime`, target: "labor-overtime" });
  if (d.openShifts.openUpcoming) items.push({ tone: "warn", text: `${plural(d.openShifts.openUpcoming, "shift")} still open`, target: "labor-shifts" });
  if (soon) items.push({ tone: "warn", text: `${plural(soon, "certification")} expiring soon`, target: "labor-credentials" });
  if (d.turnoverWatch.length) items.push({ tone: "warn", text: `${plural(d.turnoverWatch.length, "person", "people")} to check in with`, target: "labor-watch" });
  return items;
}

function Section({ id, title, note, children, sx }) {
  return (
    <Box id={id} sx={{ ...surface, p: { xs: 2, md: 2.5 }, minWidth: 0, scrollMarginTop: 80, ...sx }}>
      <Typography sx={{ fontWeight: 700, fontSize: 17, color: IOS.ink, letterSpacing: "-0.01em" }}>{title}</Typography>
      {note && <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mt: 0.25, mb: 1.5, maxWidth: 560 }}>{note}</Typography>}
      {!note && <Box sx={{ height: 12 }} />}
      {children}
    </Box>
  );
}

const Quiet = ({ children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: IOS.secondary, fontSize: 14, py: 1 }}>
    <FiCheckCircle color={IOS.green} />
    {children}
  </Box>
);

const fmt = (n, digits = 1) => Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });

/**
 * Hours per resident day against the target, written so an administrator
 * or VP can follow it: the number, a bar with the target marked (and how
 * far filling the open shifts would get you), a plain verdict, and the math.
 */
function BudgetGauge({ budget, hoursInfo, canManage, onSetup }) {
  if (!budget || budget.targetPPD === null) {
    return (
      <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Hours per resident day</Typography>
        <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mt: 0.5 }}>
          {budget ? `${budget.scheduledPPD} this week. ` : ""}
          Set your usual number of residents and a target to compare staffing against your budget.
        </Typography>
        {canManage && (
          <Button size="small" onClick={onSetup} sx={{ mt: 1, px: 0, fontWeight: 600 }}>
            Set up budget
          </Button>
        )}
      </Box>
    );
  }
  const { scheduledPPD: value, targetPPD: target, varianceHours, residentDays, residentsPerDay, countedDays, budgetHours, neededPPD } = budget;
  const ifFilled = neededPPD !== null && neededPPD > value ? neededPPD : null;
  const max = Math.max(target * 1.3, value * 1.08, (ifFilled || 0) * 1.05);
  const over = value > target * 1.03;
  const under = value < target * 0.97;
  const color = over ? IOS.red : under ? IOS.orange : IOS.green;
  const gap = Math.abs(varianceHours);
  const open = hoursInfo?.open || 0;
  const verdict = over
    ? `${fmt(gap)} hours over budget this week.`
    : under
      ? open
        ? `${fmt(gap)} hours under budget. ${fmt(Math.min(open, gap))} of those are open shifts nobody is assigned to yet.`
        : `${fmt(gap)} hours under budget. Check you're staffed safely.`
      : "On budget this week.";
  const line = { fontSize: 12.5, color: IOS.secondary, ...num };
  return (
    <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Hours per resident day</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 26, color: over ? IOS.redText : under ? IOS.orangeText : IOS.greenText, ...num }}>
          {value}
          <Box component="span" sx={{ fontSize: 14, color: IOS.secondary, fontWeight: 600, ml: 0.75 }}>of {target}</Box>
        </Typography>
      </Box>
      <Box
        sx={{ position: "relative", height: 12, borderRadius: 6, bgcolor: IOS.fill, mt: 1.25 }}
        role="img"
        aria-label={`${value} hours per resident day against a target of ${target}${ifFilled ? `; ${ifFilled} if every open shift is filled` : ""}`}
      >
        {ifFilled && (
          <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(ifFilled / max) * 100}%`, borderRadius: 6, bgcolor: tint(color, 0.3) }} />
        )}
        <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(value / max) * 100}%`, borderRadius: 6, bgcolor: color }} />
        <Box sx={{ position: "absolute", top: -4, bottom: -4, left: `${(target / max) * 100}%`, width: 2, bgcolor: IOS.ink, borderRadius: 1 }} />
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: IOS.ink, mt: 1 }}>{verdict}</Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${IOS.separator}`, display: "grid", gap: 0.25 }}>
        <Typography sx={line}>
          {fmt(hoursInfo.scheduled)} h staffed ÷ {fmt(residentDays, 0)} resident days
          {countedDays === 7 ? ` (${fmt(residentsPerDay)} residents × 7 days)` : ""} = {value}
        </Typography>
        <Typography sx={line}>
          Budget: {target} × {fmt(residentDays, 0)} = {fmt(budgetHours)} h this week
        </Typography>
        {ifFilled && (
          <Typography sx={line}>
            With every open shift filled: {ifFilled} (lighter bar)
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** One number in the strip of key figures. */
function Figure({ label, value, detail, tone = "none", onClick }) {
  const Wrapper = onClick ? ButtonBase : Box;
  return (
    <Wrapper
      onClick={onClick}
      sx={{
        display: "block",
        textAlign: "left",
        px: { xs: 1.5, md: 2.5 },
        py: 2,
        minWidth: 0,
        borderRadius: 0,
        bgcolor: `${IOS.surface} !important`,
        ...(onClick ? { "&:hover": { bgcolor: "#FAFAFC !important" } } : {}),
        "&:focus-visible": { outline: `2px solid ${IOS.blue}`, outlineOffset: -2 },
      }}
    >
      <Typography sx={{ color: IOS.secondary, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 700, color: TONE[tone], letterSpacing: "-0.02em", ...num }}>{value}</Typography>
      <Typography sx={{ color: IOS.secondary, fontSize: 12.5 }} noWrap>{detail}</Typography>
    </Wrapper>
  );
}

/** A labeled horizontal bar (hours by role, call-outs by shift). */
function BarRow({ label, value, max, color, display }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(90px, 140px) 1fr auto", alignItems: "center", gap: 1.5, py: 0.75 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{label}</Typography>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: IOS.fill, overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${max ? (value / max) * 100 : 0}%`, bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 56, textAlign: "right", ...num }}>{display}</Typography>
    </Box>
  );
}

function PersonLine({ name, color, detail, right, rightTone }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
      <Box
        sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: tint(color, 0.16), color, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
        aria-hidden
      >
        {name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>{name}</Typography>
        <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{detail}</Typography>
      </Box>
      {right && (
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: TONE[rightTone || "none"], whiteSpace: "nowrap", ...num }}>{right}</Typography>
      )}
    </Box>
  );
}

/**
 * Labor: one building's week for leadership (ED, DON, VP) and schedulers.
 * Leads with what needs attention, then the budget, key figures, overtime,
 * certifications, who to check in with and where the hours went. Paid plans.
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
          setError(err?.response?.data?.message || "Couldn't load the labor report. Refresh to try again.");
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
      <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
        <Typography sx={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, maxWidth: 560 }}>
          See where your labor hours and dollars go, every week.
        </Typography>
        <Typography sx={{ color: IOS.secondary, mt: 1.5, fontSize: 16, maxWidth: 560, lineHeight: 1.55 }}>
          Hours against your budget per resident day, overtime before it reaches payroll, call-outs by shift, open
          shifts, certifications about to expire, and who's at risk of leaving. Plus a Monday email for your
          administrator and regional VP.
        </Typography>
        {can("billing.manage") ? (
          <Button variant="contained" disableElevation onClick={() => navigate("/billing")} sx={{ mt: 3, borderRadius: "10px", bgcolor: IOS.blue, px: 3 }}>
            See paid plans
          </Button>
        ) : (
          <Typography sx={{ color: IOS.secondary, mt: 3, fontSize: 14 }}>Ask the workspace owner to upgrade to turn this on.</Typography>
        )}
      </Container>
    );
  }

  const roles = facilityPreferences?.roleFamilies || [];
  const d = data;
  const isThisWeek = d && d.weekStart === d.thisWeek;
  const attention = d ? attentionItems(d) : [];
  const roleMax = d ? Math.max(1, ...d.hours.byRole.map((r) => r.scheduled)) : 1;
  const shiftMax = d ? Math.max(1, ...d.attendance.byShift.map((s) => s.callOuts + s.noShows)) : 1;
  const hasTarget = d?.budget?.targetPPD !== null && d?.budget?.targetPPD !== undefined;
  const dayBudget = (day) => (hasTarget && day.residents ? d.budget.targetPPD * day.residents : null);
  const dayMax = d ? Math.max(1, ...d.hours.byDay.map((x) => Math.max(x.scheduled, dayBudget(x) || 0))) : 1;
  const threshold = d?.overtime.thresholdHours || 40;
  const otMax = d ? Math.max(threshold * 1.25, ...d.overtime.people.map((o) => o.projectedHours)) : threshold;

  return (
    <Container sx={{ mt: 4, mb: 8 }}>
      {/* Title and week */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", color: IOS.ink }}>Labor</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", bgcolor: IOS.fill, borderRadius: "12px", p: "3px" }}>
            <IconButton size="small" aria-label="Previous week" onClick={() => d && setWeekStart(d.previous)}>
              <FiChevronLeft />
            </IconButton>
            <Typography sx={{ fontWeight: 600, fontSize: 14, px: 1, minWidth: 128, textAlign: "center", ...num }}>
              {d ? weekLabel(d.days) : "…"}
            </Typography>
            <IconButton size="small" aria-label="Next week" onClick={() => d && setWeekStart(d.next)}>
              <FiChevronRight />
            </IconButton>
          </Box>
          {d && !isThisWeek && (
            <Button size="small" onClick={() => setWeekStart(d.thisWeek)} sx={{ fontWeight: 600 }}>
              Back to this week
            </Button>
          )}
          {d?.canManage && (
            <Button
              startIcon={<FiSettings />}
              onClick={() => setSettingsOpen(true)}
              sx={{ bgcolor: IOS.fill, color: IOS.ink, borderRadius: "12px", px: 1.75, fontWeight: 600, "&:hover": { bgcolor: "rgba(118,118,128,0.2)" } }}
            >
              Settings
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: "12px" }}>{error}</Alert>}
      {!d && !error && <Typography sx={{ mt: 4, color: IOS.secondary }}>Loading this week…</Typography>}

      {d && (
        <>
          {/* What needs attention + budget */}
          <Box sx={{ ...surface, mt: 2.5, p: { xs: 2, md: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr" }, gap: { xs: 2, md: 4 }, alignItems: "center" }}>
            <Box>
              <Typography sx={{ color: IOS.secondary, fontSize: 14, fontWeight: 600 }}>
                {isThisWeek ? "This week" : `Week of ${weekLabel(d.days)}`}
              </Typography>
              <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, mt: 0.5, maxWidth: 620 }}>
                {attention.length
                  ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention`
                  : "Nothing needs your attention"}
              </Typography>
              {attention.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.75 }}>
                  {attention.map((a) => (
                    <ButtonBase
                      key={a.text}
                      onClick={() => scrollTo(a.target)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: IOS.radius.round,
                        fontSize: 14,
                        fontWeight: 600,
                        bgcolor: tint(a.tone === "bad" ? IOS.red : IOS.orange, 0.12),
                        color: a.tone === "bad" ? IOS.redText : IOS.orangeText,
                        "&:focus-visible": { outline: `2px solid ${IOS.blue}` },
                      }}
                    >
                      <FiAlertTriangle size={14} />
                      {a.text}
                    </ButtonBase>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: IOS.secondary, mt: 1, fontSize: 15 }}>
                  No one heads into overtime, every shift is covered, and certifications are current.
                </Typography>
              )}
            </Box>
            <BudgetGauge budget={d.budget} hoursInfo={d.hours} canManage={d.canManage} onSetup={() => setSettingsOpen(true)} />
          </Box>

          {/* Key figures */}
          <Box
            sx={{
              ...surface,
              mt: 1.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${d.canSeeCosts ? 5 : 4}, 1fr)` },
              overflow: "hidden",
              // 1px gaps over a hairline background draw the dividers.
              gap: "1px",
              bgcolor: IOS.hairline,
              // A lone last figure on phones takes the full row.
              "& > *:last-child:nth-of-type(odd)": { gridColumn: { xs: "1 / -1", md: "auto" } },
            }}
          >
            <Figure
              label="Hours staffed"
              value={hours(d.hours.scheduled)}
              detail={
                d.hours.needed
                  ? `of ${hours(d.hours.needed)} needed${d.hours.timeClockUsed ? `, ${hours(d.hours.worked)} worked` : ""}`
                  : d.hours.timeClockUsed
                    ? `${hours(d.hours.worked)} worked`
                    : "Shifts with someone assigned"
              }
            />
            {d.canSeeCosts && (
              <Figure
                label="Labor cost"
                value={d.costs?.needsRates ? "Add rates" : money(d.costs?.scheduled)}
                tone={!d.costs?.needsRates && d.costs?.overtimePremium ? "warn" : "none"}
                detail={d.costs?.needsRates ? "Pay rates turn hours into dollars" : d.costs?.overtimePremium ? `${money(d.costs.overtimePremium)} of it is overtime` : "No overtime pay"}
                onClick={d.costs?.needsRates && d.canManage ? () => setSettingsOpen(true) : undefined}
              />
            )}
            <Figure
              label="Overtime"
              value={hours(d.overtime.totalOvertimeHours)}
              tone={d.overtime.people.length ? "warn" : "good"}
              detail={d.overtime.people.length ? `${plural(d.overtime.people.length, "person", "people")} over ${threshold} h` : `No one over ${threshold} h`}
              onClick={d.overtime.people.length ? () => scrollTo("labor-overtime") : undefined}
            />
            <Figure
              label="Call-outs"
              value={d.attendance.callOuts}
              tone={d.attendance.callOuts ? "warn" : "good"}
              detail={d.attendance.noShows ? `and ${plural(d.attendance.noShows, "no-show")}` : "No no-shows"}
              onClick={d.attendance.callOuts + d.attendance.noShows ? () => scrollTo("labor-callouts") : undefined}
            />
            <Figure
              label="Shifts covered"
              value={`${d.openShifts.filled}/${d.openShifts.required}`}
              tone={d.openShifts.unfilledPast ? "bad" : d.openShifts.openUpcoming ? "warn" : "good"}
              detail={
                d.openShifts.unfilledPast || d.openShifts.openUpcoming
                  ? `${d.openShifts.openUpcoming} open, ${d.openShifts.unfilledPast} missed`
                  : "All covered"
              }
              onClick={() => scrollTo("labor-shifts")}
            />
          </Box>

          {d.costs?.missingRates?.length > 0 && (
            <Typography sx={{ color: IOS.secondary, fontSize: 13, mt: 1 }}>
              No pay rate set for {d.costs.missingRates.map(roleLabel).join(", ")}, so those hours aren't in the cost.
            </Typography>
          )}

          {/* Overtime + certifications */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: 1.5, mt: 1.5 }}>
            <Section
              id="labor-overtime"
              title="Overtime coming"
              note={`Everyone heading past ${threshold} hours this week, counting shifts already worked and still scheduled. Move a shift before it reaches payroll.`}
            >
              {d.overtime.people.length > 0 && (
                <Box sx={{ display: "flex", gap: 2, mb: 0.5, fontSize: 12, color: IOS.secondary }} aria-hidden>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                    <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: OT_REGULAR }} />First {threshold} h
                  </Box>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                    <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: IOS.red }} />Overtime
                  </Box>
                </Box>
              )}
              {d.overtime.people.length ? (
                d.overtime.people.map((o) => (
                  <Box key={o.staffId} sx={{ py: 1.1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                      <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>
                        {o.name}
                        <Box component="span" sx={{ color: IOS.secondary, fontWeight: 400, fontSize: 13, ml: 1 }}>{roleLabel(o.role)}</Box>
                      </Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: IOS.redText, whiteSpace: "nowrap", ...num }}>
                        +{o.overtimeHours} h
                      </Typography>
                    </Box>
                    <Box sx={{ position: "relative", height: 8, borderRadius: 4, bgcolor: IOS.fill, mt: 0.75, overflow: "hidden" }} role="img" aria-label={`${o.projectedHours} hours of ${threshold}`}>
                      {/* Fixed colors (not the role color) and a white gap at the
                          threshold, so regular hours and overtime never blend. */}
                      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(threshold / otMax) * 100}%`, bgcolor: OT_REGULAR }} />
                      <Box sx={{ position: "absolute", left: `${(threshold / otMax) * 100}%`, top: 0, bottom: 0, width: `${((o.projectedHours - threshold) / otMax) * 100}%`, bgcolor: IOS.red }} />
                      <Box sx={{ position: "absolute", left: `calc(${(threshold / otMax) * 100}% - 1px)`, top: 0, bottom: 0, width: 2, bgcolor: IOS.surface }} />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.5, ...num }}>
                      {hours(o.projectedHours)} this week, {o.alreadyOver ? "already over" : `goes over on ${dayLabel(o.crossesOn, { weekday: "long" })}`}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Quiet>No one goes over {threshold} hours this week.</Quiet>
              )}
            </Section>

            <Section
              id="labor-credentials"
              title="Certifications"
              note="Expired, or expiring in the next 30 days. Add expiry dates on each person's certifications in Staff."
            >
              {d.credentials.expired.length + d.credentials.expiringSoon.length ? (
                [...d.credentials.expired, ...d.credentials.expiringSoon].map((c) => (
                  <PersonLine
                    key={`${c.staffId}:${c.tag}`}
                    name={c.name}
                    color={c.daysLeft <= 0 ? IOS.red : IOS.orange}
                    detail={`${certLabel(c.tag)}, ${c.daysLeft <= 0 ? "expired" : "expires"} ${dayLabel(c.expiresAt.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })}`}
                    right={c.daysLeft <= 0 ? "Expired" : `${c.daysLeft} days`}
                    rightTone={c.daysLeft <= 0 ? "bad" : "warn"}
                  />
                ))
              ) : (
                <Quiet>Nothing expired or expiring in the next 30 days.</Quiet>
              )}
            </Section>
          </Box>

          {/* Who to check in with + call-outs + shifts */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: 1.5, mt: 1.5 }}>
            <Section
              id="labor-watch"
              title="Check in with"
              note="Signs of burnout or drifting away over the last 4 weeks. A short conversation now is cheaper than replacing them."
            >
              {d.turnoverWatch.length ? (
                d.turnoverWatch.map((w) => (
                  <PersonLine key={w.staffId} name={w.name} color={roleColor(w.role, roles)} detail={`${roleLabel(w.role)}: ${w.reasons.join(", ")}`} />
                ))
              ) : (
                <Quiet>No one stands out right now.</Quiet>
              )}
            </Section>

            <Box sx={{ display: "grid", gap: 1.5, alignContent: "start" }}>
              <Section id="labor-callouts" title="Call-outs and no-shows by shift">
                {d.attendance.byShift.length ? (
                  d.attendance.byShift.map((s) => (
                    <BarRow
                      key={s.key}
                      label={s.label}
                      value={s.callOuts + s.noShows}
                      max={shiftMax}
                      color={s.noShows ? IOS.red : IOS.orange}
                      display={s.noShows ? `${s.callOuts} + ${s.noShows}` : s.callOuts}
                    />
                  ))
                ) : (
                  <Quiet>No call-outs or no-shows this week.</Quiet>
                )}
              </Section>
              <Section id="labor-shifts" title="Shifts">
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                  {[
                    ["Filled", d.openShifts.filled, "good"],
                    ["Still open", d.openShifts.openUpcoming, d.openShifts.openUpcoming ? "warn" : "none"],
                    ["Went unfilled", d.openShifts.unfilledPast, d.openShifts.unfilledPast ? "bad" : "none"],
                  ].map(([label, value, tone]) => (
                    <Box key={label} sx={{ p: 1.5, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas }}>
                      <Typography sx={{ fontSize: 22, fontWeight: 700, color: TONE[tone], ...num }}>{value}</Typography>
                      <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Section>
            </Box>
          </Box>

          {/* Where the hours went */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" }, gap: 1.5, mt: 1.5 }}>
            <Section title="Hours by role">
              {d.hours.byRole.length ? (
                d.hours.byRole.map((r) => (
                  <BarRow key={r.role} label={roleLabel(r.role)} value={r.scheduled} max={roleMax} color={roleColor(r.role, roles)} display={hours(r.scheduled)} />
                ))
              ) : (
                <Quiet>No shifts this week.</Quiet>
              )}
            </Section>

            <Section title="Hours by day" note={hasTarget ? "The dark line on each day is the budget for that day's residents." : undefined}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.75, md: 1.5 }, alignItems: "end", height: 170 }}>
                {d.hours.byDay.map((day) => {
                  const budgetH = dayBudget(day);
                  const over = budgetH !== null && day.scheduled > budgetH * 1.03;
                  return (
                    <Box key={day.date} sx={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, ...num }}>{Math.round(day.scheduled)}</Typography>
                      <Box sx={{ position: "relative", width: "100%", maxWidth: 44, height: 120, display: "flex", alignItems: "flex-end" }}>
                        <Box sx={{ width: "100%", height: `${(day.scheduled / dayMax) * 100}%`, minHeight: 2, borderRadius: "6px 6px 2px 2px", bgcolor: over ? IOS.orange : IOS.blue }} />
                        {budgetH !== null && (
                          <Box sx={{ position: "absolute", left: -4, right: -4, bottom: `${(budgetH / dayMax) * 100}%`, height: 2, bgcolor: IOS.ink, borderRadius: 1 }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.75 }}>{dayLabel(day.date, { weekday: "short" })}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Section>
          </Box>

          {!d.hours.timeClockUsed && (
            <Typography sx={{ color: IOS.secondary, fontSize: 13, mt: 2 }}>
              Hours staffed are shifts with someone assigned (published or draft). Open shifts aren't counted until someone takes them. Turn on the time clock to compare with hours actually worked.
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
