import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, ButtonBase, Container, Tooltip, Typography } from "@mui/material";
import { FiAlertTriangle, FiArrowRight, FiCamera, FiCheckCircle, FiRepeat, FiSun, FiUserX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { IOS, roleColor, tint } from "../../../theme/ios";
import SlotDrawer from "../Schedule/SlotDrawer";
import WeekPublishBar from "../Schedule/WeekPublishBar";

const surface = {
  bgcolor: IOS.surface,
  borderRadius: IOS.radius.card,
  boxShadow: IOS.shadow,
  border: `1px solid ${IOS.hairline}`,
};
const num = { fontVariantNumeric: "tabular-nums" };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const time = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayName = (key, i) =>
  i === 0 ? "Today" : i === 1 ? "Tomorrow" : keyToDate(key).toLocaleDateString(undefined, { weekday: "long" });

function Section({ title, right, children, sx }) {
  return (
    <Box sx={{ ...surface, p: { xs: 2, md: 2.5 }, minWidth: 0, ...sx }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1.25, gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>{title}</Typography>
        {right}
      </Box>
      {children}
    </Box>
  );
}

const Quiet = ({ children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: IOS.secondary, fontSize: 14, py: 0.75 }}>
    <FiCheckCircle color={IOS.green} style={{ flexShrink: 0 }} />
    {children}
  </Box>
);

function Figure({ label, value, detail, tone }) {
  const color = tone === "bad" ? IOS.redText : tone === "warn" ? IOS.orangeText : tone === "good" ? IOS.greenText : IOS.ink;
  return (
    <Box sx={{ px: { xs: 1.75, md: 2.5 }, py: 1.75, bgcolor: IOS.surface, minWidth: 0 }}>
      <Typography sx={{ color: IOS.secondary, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color, ...num }}>{value}</Typography>
      <Typography sx={{ color: IOS.secondary, fontSize: 12.5 }} noWrap>{detail}</Typography>
    </Box>
  );
}

/** A request waiting on a decision (time off or swap). */
function RequestLine({ icon, title, detail }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
      <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: tint(IOS.blue, 0.1), color: IOS.blue, display: "grid", placeItems: "center", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>{title}</Typography>
        <Typography sx={{ fontSize: 13, color: IOS.secondary }} noWrap>{detail}</Typography>
      </Box>
    </Box>
  );
}

/**
 * Today: the scheduler's home page. What needs doing today and over the next
 * two days: spots to fill (fill them right here), call-outs, how full
 * today's shifts are, who's on now, and requests waiting on a decision.
 * Leadership's week/month view is the Labor page.
 */
export default function TodayPage() {
  const { user, can, facilityPreferences, tenant, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const roles = facilityPreferences?.roleFamilies || [];
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [openSlotId, setOpenSlotId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      api
        .get("/summary/today")
        .then((res) => {
          setData(res.data);
          setError("");
        })
        .catch((err) => setError(err?.response?.data?.message || "Couldn't load today. Refresh to try again.")),
    [],
  );

  useEffect(() => {
    load();
  }, [load, reload]);

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Please use an image under 2 MB.");
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.patch("/auth/me", { profilePicture: base64 });
      if (res?.data?.user) updateCurrentUser({ profilePicture: res.data.user.profilePicture });
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update your photo.");
    } finally {
      setUploading(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const d = data;
  const canManage = d?.can?.manage;
  const openSlot = d?.openSlots.find((s) => s._id === openSlotId) || null;
  const requests = d ? d.timeOff.length + d.swaps.length : 0;
  const openCallOuts = d ? d.callOuts.filter((c) => c.stillOpen) : [];

  // Headline: the single most useful sentence for right now.
  const headline = !d
    ? ""
    : d.totals.openToday
      ? `${plural(d.totals.openToday, "spot")} still open today`
      : d.totals.openNextTwoDays
        ? `Today is covered. ${plural(d.totals.openNextTwoDays, "spot")} open in the next two days`
        : "Everything is covered for the next three days";

  return (
    <Container sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: IOS.secondary, fontSize: 15, fontWeight: 600 }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {tenant?.name ? ` · ${tenant.name}` : ""}
          </Typography>
          <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </Typography>
        </Box>
        <Tooltip title={user?.profilePicture ? "Change photo" : "Add a photo"}>
          <ButtonBase
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={user?.profilePicture ? "Change photo" : "Add a photo"}
            sx={{ position: "relative", width: 52, height: 52, borderRadius: "50%", flexShrink: 0, bgcolor: tint(IOS.blue, 0.12), overflow: "hidden" }}
          >
            {user?.profilePicture ? (
              <Box component="img" src={user.profilePicture} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Typography sx={{ fontWeight: 700, color: IOS.blue, fontSize: 18 }}>
                {(user?.name || "?").split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </Typography>
            )}
            <Box sx={{ position: "absolute", right: 0, bottom: 0, width: 20, height: 20, borderRadius: "50%", bgcolor: IOS.surface, display: "grid", placeItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
              <FiCamera size={11} color={IOS.secondary} />
            </Box>
          </ButtonBase>
        </Tooltip>
        <Box component="input" type="file" accept="image/*" ref={fileRef} onChange={onPhoto} sx={{ display: "none" }} />
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: "12px" }}>{error}</Alert>}

      {can("schedule.manage") && (
        <Box sx={{ mt: 2.5 }}>
          <WeekPublishBar refreshKey={reload} onChanged={() => setReload((n) => n + 1)} />
        </Box>
      )}

      {!d && !error && <Typography sx={{ mt: 4, color: IOS.secondary }}>Loading today…</Typography>}

      {d && (
        <>
          {/* Headline + figures */}
          <Box sx={{ ...surface, mt: 2, overflow: "hidden" }}>
            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.75, display: "flex", alignItems: "center", gap: 1.25 }}>
              {d.totals.openToday ? <FiAlertTriangle color={IOS.orange} size={20} /> : <FiCheckCircle color={IOS.green} size={20} />}
              <Typography sx={{ fontSize: { xs: 18, md: 21 }, fontWeight: 700, letterSpacing: "-0.015em" }}>{headline}</Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                gap: "1px",
                bgcolor: IOS.hairline,
                borderTop: `1px solid ${IOS.hairline}`,
              }}
            >
              <Figure label="On now" value={d.onNow.count} detail={d.onNow.byRole.map((r) => `${r.count} ${getRoleDisplayName(r.role)}`).join(", ") || "Nobody on shift"} />
              <Figure label="Shifts today" value={d.totals.shiftsToday} detail={`${d.todayShifts.reduce((n, s) => n + s.assigned, 0)} of ${d.todayShifts.reduce((n, s) => n + s.required, 0)} spots filled`} />
              <Figure label="Open today" value={d.totals.openToday} tone={d.totals.openToday ? "bad" : "good"} detail={d.totals.openToday ? "Fill below" : "All filled"} />
              <Figure label="Next 2 days" value={d.totals.openNextTwoDays} tone={d.totals.openNextTwoDays ? "warn" : "good"} detail={d.totals.openNextTwoDays ? "spots open" : "All filled"} />
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.35fr 1fr" }, gap: 1.5, mt: 1.5, alignItems: "start" }}>
            {/* Spots to fill */}
            <Section
              title="Spots to fill"
              right={
                <Button size="small" endIcon={<FiArrowRight />} onClick={() => navigate("/schedule")} sx={{ fontWeight: 600 }}>
                  Schedule
                </Button>
              }
            >
              {d.openSlots.length === 0 ? (
                <Quiet>Every spot is filled for today, tomorrow and {dayName(d.days[2], 2)}.</Quiet>
              ) : (
                d.days.map((day, i) => {
                  const slots = d.openSlots.filter((s) => s.dateKey === day);
                  if (!slots.length) return null;
                  return (
                    <Box key={day} sx={{ mt: i ? 1.5 : 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: i === 0 ? IOS.redText : IOS.secondary, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
                        {dayName(day, i)} · {plural(slots.reduce((n, s) => n + s.open, 0), "open spot")}
                      </Typography>
                      {slots.map((s) => {
                        const color = roleColor(s.role, roles);
                        return (
                          <Box key={s._id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
                            <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 4, bgcolor: color, flexShrink: 0 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: 14.5, fontWeight: 600, overflow: { sm: "hidden" }, textOverflow: { sm: "ellipsis" }, whiteSpace: { sm: "nowrap" } }}>
                                {getRoleDisplayName(s.role)}
                                {/* Times on their own line on phones so they aren't cut off. */}
                                <Box component="span" sx={{ color: IOS.secondary, fontWeight: 400, fontSize: 13.5, ml: { xs: 0, sm: 1 }, display: { xs: "block", sm: "inline" } }}>
                                  {s.label} · {time(s.startTime)}–{time(s.endTime)}
                                </Box>
                              </Typography>
                              <Typography sx={{ fontSize: 13, color: IOS.secondary, ...num }}>
                                {s.assignedCount} of {s.requiredCount} on
                                {s.unitArea ? ` · ${s.unitArea}` : ""}
                                {s.callOuts ? (
                                  <Box component="span" sx={{ color: IOS.redText, fontWeight: 600 }}>
                                    {` · ${plural(s.callOuts, "call-out")}`}
                                  </Box>
                                ) : null}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: i === 0 ? IOS.redText : IOS.orangeText, whiteSpace: "nowrap", ...num }}>
                              {s.open} open
                            </Typography>
                            {canManage && (
                              <Button
                                size="small"
                                variant="contained"
                                disableElevation
                                onClick={() => setOpenSlotId(s._id)}
                                sx={{ borderRadius: IOS.radius.round, px: 2, fontWeight: 600, flexShrink: 0 }}
                              >
                                Fill
                              </Button>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })
              )}
            </Section>

            <Box sx={{ display: "grid", gap: 1.5 }}>
              {/* Today's shifts */}
              <Section title="Today's shifts">
                {d.todayShifts.length === 0 ? (
                  <Quiet>No needs set for today.</Quiet>
                ) : (
                  d.todayShifts.map((s) => {
                    const pct = s.required ? (s.assigned / s.required) * 100 : 100;
                    const full = s.assigned >= s.required;
                    const past = new Date(s.endTime) <= new Date();
                    return (
                      <Box key={s.key} sx={{ py: 0.9, "& + &": { borderTop: `1px solid ${IOS.hairline}` }, opacity: past ? 0.55 : 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                          <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>
                            {s.label}
                            <Box component="span" sx={{ color: IOS.secondary, fontWeight: 400, fontSize: 13, ml: 1 }}>
                              {time(s.startTime)}–{time(s.endTime)}
                            </Box>
                          </Typography>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: full ? IOS.greenText : IOS.orangeText, whiteSpace: "nowrap", ...num }}>
                            {s.assigned}/{s.required}
                          </Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: 3, bgcolor: IOS.fill, mt: 0.6, overflow: "hidden" }}>
                          <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: full ? IOS.green : IOS.orange, borderRadius: 3 }} />
                        </Box>
                        {!full && (
                          <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.4 }}>
                            Short:{" "}
                            {s.roles
                              .filter((r) => r.assigned < r.required)
                              .map((r) => `${r.required - r.assigned} ${getRoleDisplayName(r.role)}`)
                              .join(", ")}
                            {past ? " (ended)" : ""}
                          </Typography>
                        )}
                      </Box>
                    );
                  })
                )}
              </Section>

              {/* Call-outs */}
              <Section title="Call-outs" right={openCallOuts.length ? <Typography sx={{ fontSize: 13, color: IOS.redText, fontWeight: 600 }}>{openCallOuts.length} not covered</Typography> : null}>
                {d.callOuts.length === 0 ? (
                  <Quiet>No call-outs for today or the next two days.</Quiet>
                ) : (
                  d.callOuts.map((c) => (
                    <Box key={c._id} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, "& + &": { borderTop: `1px solid ${IOS.hairline}` } }}>
                      <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: tint(IOS.red, 0.1), color: IOS.red, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <FiUserX size={15} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 600 }} noWrap>{c.name}</Typography>
                        <Typography sx={{ fontSize: 13, color: IOS.secondary }} noWrap>
                          {getRoleDisplayName(c.role)} · {shortDate(c.startTime)}, {time(c.startTime)}
                        </Typography>
                      </Box>
                      {c.stillOpen ? (
                        canManage && c.coverageId && d.openSlots.some((s) => s._id === c.coverageId) ? (
                          <Button size="small" onClick={() => setOpenSlotId(c.coverageId)} sx={{ fontWeight: 600, color: IOS.redText }}>
                            Cover
                          </Button>
                        ) : (
                          <Typography sx={{ fontSize: 13, color: IOS.redText, fontWeight: 600 }}>Not covered</Typography>
                        )
                      ) : (
                        <Typography sx={{ fontSize: 13, color: IOS.greenText, fontWeight: 600 }}>Covered</Typography>
                      )}
                    </Box>
                  ))
                )}
              </Section>

              {/* Waiting on you */}
              {(d.can.reviewTimeOff || d.can.manage) && (
                <Section title="Waiting on you" right={requests ? <Typography sx={{ fontSize: 13, color: IOS.secondary, fontWeight: 600 }}>{requests}</Typography> : null}>
                  {requests === 0 ? (
                    <Quiet>No requests waiting.</Quiet>
                  ) : (
                    <>
                      {d.timeOff.slice(0, 4).map((t) => (
                        <RequestLine
                          key={t._id}
                          icon={<FiSun size={15} />}
                          title={`${t.name}: time off`}
                          detail={`${shortDate(t.startTime)} – ${shortDate(t.endTime)}${t.reason ? ` · ${t.reason}` : ""}`}
                        />
                      ))}
                      {d.swaps.slice(0, 4).map((s) => (
                        <RequestLine
                          key={s._id}
                          icon={<FiRepeat size={15} />}
                          title={`${s.from}${s.to ? ` → ${s.to}` : ""}: swap`}
                          detail={s.startTime ? `${getRoleDisplayName(s.role)} · ${shortDate(s.startTime)}, ${time(s.startTime)}` : "Shift swap"}
                        />
                      ))}
                      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        {d.timeOff.length > 0 && (
                          <Button size="small" variant="outlined" onClick={() => navigate("/timeoff-decisions")} sx={{ borderRadius: IOS.radius.round, fontWeight: 600 }}>
                            Review time off ({d.timeOff.length})
                          </Button>
                        )}
                        {d.swaps.length > 0 && (
                          <Button size="small" variant="outlined" onClick={() => navigate("/swap-requests")} sx={{ borderRadius: IOS.radius.round, fontWeight: 600 }}>
                            Review swaps ({d.swaps.length})
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </Section>
              )}
            </Box>
          </Box>
        </>
      )}

      <SlotDrawer
        open={Boolean(openSlot)}
        row={openSlot}
        weekStart={openSlot?.weekStart}
        weekPublished={openSlot?.weekPublished}
        callOuts={openSlot?.callOuts || 0}
        people={openSlot?.people || []}
        canEdit={Boolean(canManage)}
        onClose={() => setOpenSlotId(null)}
        onChanged={() => setReload((n) => n + 1)}
      />
    </Container>
  );
}
