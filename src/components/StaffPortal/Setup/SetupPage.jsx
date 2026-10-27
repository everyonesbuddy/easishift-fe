import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { trackEvent } from "../../../utils/analytics";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import StaffingTemplateEditor from "./StaffingTemplateEditor";
import { parseStaffLines } from "../../../utils/staffPaste";

const STEPS = [
  { title: "Your facility", hint: "Sets typical roles and shifts" },
  { title: "Shifts and roles", hint: "When people work, and as what" },
  { title: "A normal week", hint: "How many people each shift needs" },
  { title: "Your staff", hint: "Paste a list; no logins needed" },
];

const TYPE_NOTES = {
  assisted_living: "Caregivers and med techs around the clock",
  memory_care: "Secured units, usually staffed more heavily",
  skilled_nursing: "CNAs with LPN and RN coverage on every shift",
  home_care: "Caregivers on day and overnight visits",
  other: "Start blank and set your own roles",
};

const C = {
  ink: "#1F2937",
  muted: "#6B7280",
  line: "#E5E7EB",
  canvas: "#F8FAFC",
  accent: "#2563EB",
};

const SHIFT_COLORS = ["#2563EB", "#0F766E", "#7C3AED", "#B45309", "#BE185D"];

const roleKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const errorMessage = (err) => err?.response?.data?.message || err?.message || "Something went wrong";

const minutesOf = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** 24-hour bar showing when each shift runs (overnight shifts wrap). */
function ShiftTimeline({ defs }) {
  const segments = [];
  defs.forEach((def, d) =>
    (def.timeSlots || []).forEach((slot) => {
      const start = minutesOf(slot.startLocalTime);
      const end = minutesOf(slot.endLocalTime);
      const color = SHIFT_COLORS[d % SHIFT_COLORS.length];
      const label = def.label || def.key;
      if (end > start) segments.push({ start, end, color, label });
      else {
        segments.push({ start, end: 1440, color, label });
        if (end > 0) segments.push({ start: 0, end, color, label: "" });
      }
    }),
  );
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ position: "relative", height: 36, borderRadius: 2, bgcolor: "#EEF2F7", overflow: "hidden" }}>
        {segments.map((s, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(s.start / 1440) * 100}%`,
              width: `${((s.end - s.start) / 1440) * 100}%`,
              bgcolor: s.color,
              opacity: 0.88,
              borderRight: "2px solid #fff",
              display: "flex",
              alignItems: "center",
              px: 1,
            }}
          >
            <Typography noWrap sx={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        {["12a", "6a", "12p", "6p", "12a"].map((t, i) => (
          <Typography key={i} sx={{ fontSize: 11, color: C.muted }}>
            {t}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function StepRail({ step }) {
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: { xs: "row", md: "column" }, gap: { xs: 1, md: 0.5 } }}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <Box
            component="li"
            key={s.title}
            aria-current={current ? "step" : undefined}
            sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", py: { md: 1.25 }, flex: { xs: 1, md: "none" } }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                bgcolor: done ? "#DBEAFE" : current ? C.accent : "#fff",
                color: done ? C.accent : current ? "#fff" : C.muted,
                border: current || done ? "none" : `1.5px solid ${C.line}`,
              }}
            >
              {done ? <FiCheck /> : i + 1}
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography sx={{ color: current || done ? C.ink : C.muted, fontWeight: current ? 800 : 600, fontSize: 15 }}>
                {s.title}
              </Typography>
              <Typography sx={{ color: C.muted, fontSize: 13 }}>{s.hint}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const { tenant, fetchFacilityPreferences, refreshSession } = useAuth();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState([]);
  const [facilityType, setFacilityType] = useState(tenant?.facilityType || "");
  const [prefs, setPrefs] = useState(null);
  const [rules, setRules] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [staffText, setStaffText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [firstWeek, setFirstWeek] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/setup/facility-types")
      .then((res) => setTypes(res.data || []))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyFacilityType = () =>
    run(async () => {
      const res = await api.post("/setup/facility-type", { facilityType });
      setPrefs(res.data.facilityPreferences);
      setRules(res.data.staffingTemplate?.rules || []);
      trackEvent("setup_facility_type", { facilityType });
      setStep(1);
    });

  const updateSlot = (defIndex, slotIndex, key, value) =>
    setPrefs((prev) => ({
      ...prev,
      shiftTypeDefinitions: prev.shiftTypeDefinitions.map((def, d) =>
        d !== defIndex
          ? def
          : {
              ...def,
              timeSlots: def.timeSlots.map((slot, s) => (s !== slotIndex ? slot : { ...slot, [key]: value, label: null })),
            },
      ),
    }));

  const addRole = () => {
    const key = roleKey(newRole);
    if (!key || prefs.roleFamilies.includes(key)) return;
    setPrefs((prev) => ({ ...prev, roleFamilies: [...prev.roleFamilies, key] }));
    setNewRole("");
  };

  const removeRole = (role) => {
    setPrefs((prev) => ({ ...prev, roleFamilies: prev.roleFamilies.filter((r) => r !== role) }));
    setRules((prev) => prev.filter((rule) => rule.role !== role));
  };

  const saveShiftsAndRoles = () =>
    run(async () => {
      const shiftTypeDefinitions = prefs.shiftTypeDefinitions.map((def) => ({
        key: def.key,
        label: def.label,
        timeSlots: def.timeSlots.map((slot) => ({
          tag: slot.tag,
          label: slot.label || null,
          startLocalTime: slot.startLocalTime,
          endLocalTime: slot.endLocalTime,
          spansOvernight: slot.endLocalTime <= slot.startLocalTime,
        })),
      }));
      const res = await api.post("/facility-preferences", {
        roleFamilies: prefs.roleFamilies,
        shiftTypes: shiftTypeDefinitions.map((def) => def.key),
        shiftTypeDefinitions,
      });
      setPrefs(res.data);
      await fetchFacilityPreferences?.();
      setStep(2);
    });

  const saveTemplate = () =>
    run(async () => {
      await api.put("/staffing-template", { rules });
      setStep(3);
    });

  // Live check of the pasted list, before anything is saved.
  const pasted = useMemo(() => {
    const known = new Set((prefs?.roleFamilies || []).map(roleKey));
    return parseStaffLines(staffText, prefs?.roleFamilies?.[0]).map((row) => {
      const problems = [];
      if (!row.name) problems.push("Add a name");
      if (row.role && !known.has(roleKey(row.role))) problems.push(`"${row.role}" isn't one of your roles`);
      return { ...row, problems };
    });
  }, [staffText, prefs]);
  const readyCount = pasted.filter((r) => !r.problems.length).length;

  const loadFirstWeek = async () => {
    try {
      const cur = (await api.get("/weeks/current")).data;
      const week = (await api.get(`/weeks/${cur.weekStart}`)).data;
      setFirstWeek({ weekStart: cur.weekStart, counts: week.counts, staff: week.staff?.length || 0 });
    } catch {
      setFirstWeek({ counts: null });
    }
  };

  const addStaffAndFinish = () =>
    run(async () => {
      const rows = pasted
        .filter((r) => !r.problems.length)
        .map((r) => ({ name: r.name, phone: r.phone, email: r.email, role: r.role }));
      if (rows.length) {
        const res = await api.post("/staff/bulk", { rows });
        setImportResult(res.data);
        const notCreated = (res.data.rows || []).filter((r) => r.status !== "created");
        const keptBack = pasted.filter((r) => r.problems.length);
        if (notCreated.length || keptBack.length) {
          const failedLines = notCreated.map((r) => rows[(r.rowNumber || 1) - 1]).filter(Boolean);
          setStaffText(
            [...failedLines, ...keptBack]
              .map((r) => [r.name, r.phone || r.email, r.role].filter(Boolean).join(", "))
              .join("\n"),
          );
          return;
        }
      }
      await finish();
    });

  const finish = async () => {
    await api.post("/setup/complete");
    await refreshSession?.();
    trackEvent("setup_complete");
    await loadFirstWeek();
    setStep(4);
  };

  const primaryButtonSx = { textTransform: "none", fontWeight: 700, px: 3, py: 1.1, borderRadius: 2 };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, minHeight: "calc(100vh - 72px)" }}>
      {/* Rail */}
      <Box sx={{ bgcolor: C.canvas, borderRight: { md: `1px solid ${C.line}` }, borderBottom: { xs: `1px solid ${C.line}`, md: "none" }, px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 5 } }}>
        <Typography sx={{ color: C.muted, fontSize: 14 }}>Setting up</Typography>
        <Typography sx={{ fontWeight: 800, color: C.ink, fontSize: { xs: 20, md: 24 }, lineHeight: 1.2, mb: { xs: 2, md: 4 } }}>
          {tenant?.name || "Your facility"}
        </Typography>
        <StepRail step={Math.min(step, 4)} />
        <Typography sx={{ display: { xs: "none", md: "block" }, color: C.muted, fontSize: 13, mt: 5 }}>
          About five minutes. You can change all of this later.
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 3, md: 5 }, maxWidth: 960 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                What kind of facility is this?
              </Typography>
              <Typography sx={{ color: C.muted, mt: 0.5 }}>
                We'll start you with typical roles, shift times and staffing numbers. You'll adjust them next.
              </Typography>
            </Box>
            {!types.length && <CircularProgress size={24} />}
            <Box role="radiogroup" sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {types.map((type) => {
                const selected = facilityType === type.key;
                return (
                  <Box
                    key={type.key}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => setFacilityType(type.key)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFacilityType(type.key)}
                    sx={{
                      p: 2.25,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      border: `1.5px solid ${selected ? C.accent : C.line}`,
                      bgcolor: selected ? "#EFF6FF" : "#fff",
                      outline: "none",
                      "&:focus-visible": { boxShadow: `0 0 0 3px ${C.accent}44` },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 800, color: C.ink, fontSize: 17 }}>{type.label}</Typography>
                      {selected && <FiCheck color={C.accent} />}
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 14, mt: 0.25 }}>{TYPE_NOTES[type.key] || ""}</Typography>
                    {type.roles?.length > 0 && (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1.25 }}>
                        {type.roles.map((r) => (
                          <Chip key={r} size="small" label={getRoleDisplayName(r)} sx={{ bgcolor: selected ? "#DBEAFE" : C.canvas }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" onClick={applyFacilityType} disabled={!facilityType || busy} sx={primaryButtonSx}>
                {busy ? "Setting up…" : "Continue"}
              </Button>
            </Box>
          </Stack>
        )}

        {step === 1 && prefs && (
          <Stack spacing={4}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                When do people work?
              </Typography>
              <Typography sx={{ color: C.muted, mt: 0.5 }}>
                Times are in your facility's time zone ({prefs.facilityTimezone}).
              </Typography>
              <ShiftTimeline defs={prefs.shiftTypeDefinitions} />
              <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                {prefs.shiftTypeDefinitions.map((def, d) =>
                  def.timeSlots.map((slot, s) => (
                    <Box key={`${def.key}:${slot.tag}`} sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SHIFT_COLORS[d % SHIFT_COLORS.length] }} />
                      <Typography sx={{ width: 96, fontWeight: 700, color: C.ink }}>{def.label || def.key}</Typography>
                      <TextField
                        type="time"
                        size="small"
                        label="Starts"
                        value={slot.startLocalTime}
                        onChange={(e) => updateSlot(d, s, "startLocalTime", e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        type="time"
                        size="small"
                        label="Ends"
                        value={slot.endLocalTime}
                        onChange={(e) => updateSlot(d, s, "endLocalTime", e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      {slot.endLocalTime <= slot.startLocalTime && (
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>ends the next day</Typography>
                      )}
                    </Box>
                  )),
                )}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, color: C.ink, fontSize: 20 }}>Roles you schedule</Typography>
              <Typography sx={{ color: C.muted, fontSize: 14 }}>
                The jobs people are scheduled as. Schedulers and viewers who log in are added separately.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 1.5 }}>
                {prefs.roleFamilies.map((role) => (
                  <Chip key={role} label={getRoleDisplayName(role)} onDelete={() => removeRole(role)} sx={{ fontWeight: 600 }} />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  label="Add a role"
                  placeholder="e.g. Dietary aide"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRole()}
                />
                <Button onClick={addRole} disabled={!newRole.trim()} sx={{ textTransform: "none" }}>
                  Add
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button onClick={() => setStep(0)} sx={{ textTransform: "none" }}>
                Back
              </Button>
              <Button variant="contained" onClick={saveShiftsAndRoles} disabled={busy || !prefs.roleFamilies.length} sx={primaryButtonSx}>
                Continue
              </Button>
            </Box>
          </Stack>
        )}

        {step === 2 && prefs && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                What does a normal week need?
              </Typography>
              <Typography sx={{ color: C.muted, mt: 0.5 }}>
                Every new week starts from these numbers, so you only set this once. A holiday or a busy day? Change
                just that day on the schedule.
              </Typography>
            </Box>
            <StaffingTemplateEditor rules={rules} onChange={setRules} facilityPreferences={prefs} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button onClick={() => setStep(1)} sx={{ textTransform: "none" }}>
                Back
              </Button>
              <Button variant="contained" onClick={saveTemplate} disabled={busy || !rules.length} sx={primaryButtonSx}>
                Continue
              </Button>
            </Box>
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                Who's on your team?
              </Typography>
              <Typography sx={{ color: C.muted, mt: 0.5 }}>
                One person per line: name, mobile number or email, and role. Staff don't need an app or a password;
                they get a personal link when you publish.
              </Typography>
            </Box>
            <TextField
              multiline
              minRows={6}
              placeholder={"Kim Tran, (555) 123-4567, CNA\nPat Lee, pat@example.com, LPN"}
              value={staffText}
              onChange={(e) => setStaffText(e.target.value)}
              sx={{ "& textarea": { fontSize: 15, lineHeight: 1.6 } }}
            />

            {pasted.length > 0 && (
              <Box sx={{ border: `1px solid ${C.line}`, borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1, bgcolor: C.canvas, display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>
                    {readyCount} of {pasted.length} ready to add
                  </Typography>
                </Box>
                <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
                  {pasted.map((row, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1.4fr 1fr 1.4fr" },
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderTop: i ? `1px solid ${C.line}` : "none",
                        fontSize: 14,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{row.name || "—"}</Typography>
                      <Typography sx={{ color: C.muted, fontSize: 14 }}>{row.phone || row.email || "—"}</Typography>
                      <Typography sx={{ color: C.muted, fontSize: 14 }}>{row.role ? getRoleDisplayName(roleKey(row.role)) : "—"}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: row.problems.length ? "#B45309" : "#0F766E" }}>
                        {row.problems.length
                          ? row.problems.join("; ")
                          : !row.phone && !row.email
                            ? "Ready · no phone or email: share their link"
                            : "Ready"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {importResult && (importResult.failed > 0 || importResult.skipped > 0) && (
              <Alert severity="warning">
                Added {importResult.created}. The lines left above need fixing:{" "}
                {(importResult.rows || [])
                  .filter((r) => r.status !== "created")
                  .map((r) => `${r.name || `Line ${r.rowNumber}`} (${r.reason})`)
                  .join(", ")}
                .
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Button onClick={() => setStep(2)} sx={{ textTransform: "none" }}>
                Back
              </Button>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button onClick={() => run(finish)} disabled={busy} sx={{ textTransform: "none" }}>
                  Skip for now
                </Button>
                <Button variant="contained" onClick={addStaffAndFinish} disabled={busy || (pasted.length > 0 && !readyCount)} sx={primaryButtonSx}>
                  {busy ? "Adding…" : readyCount ? `Add ${readyCount} and finish` : "Finish"}
                </Button>
              </Box>
            </Box>
          </Stack>
        )}

        {step === 4 && (
          <Stack spacing={3} sx={{ maxWidth: 620 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                Your first week is ready
              </Typography>
              <Typography sx={{ color: C.muted, mt: 0.5 }}>
                We filled in this week's needs from your numbers. Put people on the open slots, then publish: everyone
                gets one text or email with their shifts.
              </Typography>
            </Box>
            {firstWeek?.counts && (
              <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Box>
                  <Typography sx={{ fontSize: 44, fontWeight: 800, color: "#B45309", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {firstWeek.counts.openSlots}
                  </Typography>
                  <Typography sx={{ color: C.muted }}>open slots this week</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 44, fontWeight: 800, color: C.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {firstWeek.staff}
                  </Typography>
                  <Typography sx={{ color: C.muted }}>staff to schedule</Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={() => navigate("/schedule")} sx={primaryButtonSx}>
                Fill the week
              </Button>
              <Button onClick={() => navigate("/staffs")} sx={{ textTransform: "none" }}>
                Review staff
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
