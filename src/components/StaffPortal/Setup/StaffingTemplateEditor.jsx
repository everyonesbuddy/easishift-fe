import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";

// countsByWeekday is Sunday-first: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const C = {
  ink: "#1F2937",
  muted: "#6B7280",
  line: "#E5E7EB",
  canvas: "#F8FAFC",
  accent: "#2563EB",
};

const titleCase = toLabel;

const compactTime = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  const suffix = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
};

const isWeekdayWeekendShape = (counts) =>
  WEEKDAYS.every((d) => counts[d] === counts[1]) &&
  WEEKEND.every((d) => counts[d] === counts[0]);

const lower = (v) => String(v || "").trim().toLowerCase();

/** Every shift slot defined in facility preferences. */
const listShiftSlots = (prefs) =>
  (prefs?.shiftTypeDefinitions || []).flatMap((def) =>
    (def.timeSlots || []).map((slot) => ({
      key: `${def.key}:${slot.tag}`,
      shiftType: def.key,
      shiftTag: slot.tag,
      name: def.label || titleCase(def.key),
      time: `${compactTime(slot.startLocalTime)}–${compactTime(slot.endLocalTime)}`,
      start: slot.startLocalTime || "",
    })),
  );

function CountInput({ value, onChange, disabled, label }) {
  return (
    <Box
      component="input"
      type="number"
      inputMode="numeric"
      min={0}
      max={50}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      sx={{
        width: "100%",
        maxWidth: 56,
        height: 36,
        boxSizing: "border-box",
        textAlign: "center",
        font: "inherit",
        fontWeight: 700,
        fontSize: 15,
        fontVariantNumeric: "tabular-nums",
        color: Number(value) === 0 ? C.muted : C.ink,
        bgcolor: Number(value) === 0 ? "transparent" : "#fff",
        border: `1px solid ${C.line}`,
        borderRadius: 1.5,
        outline: "none",
        "&:focus": { borderColor: C.accent, boxShadow: `0 0 0 3px ${C.accent}22` },
        "&::-webkit-inner-spin-button": { display: "none" },
        MozAppearance: "textfield",
      }}
    />
  );
}

/**
 * Weekly Needs: for each shift, which roles (optionally in a unit area and
 * with required certifications) and how many on each day.
 * Controlled: `rules` in, `onChange(rules)` out.
 */
export default function StaffingTemplateEditor({ rules, onChange, facilityPreferences, disabled = false }) {
  const slots = useMemo(() => listShiftSlots(facilityPreferences), [facilityPreferences]);
  const roles = facilityPreferences?.roleFamilies || [];
  const areas = facilityPreferences?.unitAreas || [];
  const certs = facilityPreferences?.certificationTags || [];
  const [mode, setMode] = useState(() =>
    rules.every((rule) => isWeekdayWeekendShape(rule.countsByWeekday)) ? "weekday_weekend" : "each_day",
  );
  const [addMenu, setAddMenu] = useState(null); // { anchor, slot }

  const columns =
    mode === "weekday_weekend"
      ? [
          { label: "Mon–Fri", days: WEEKDAYS },
          { label: "Sat–Sun", days: WEEKEND },
        ]
      : DAY_ORDER.map((day) => ({ label: DAY_LABELS[day], days: [day] }));

  const update = (index, patch) => onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  const setCount = (index, days, value) => {
    const count = Math.max(0, Math.min(50, Number.parseInt(value, 10) || 0));
    const next = [...rules[index].countsByWeekday];
    days.forEach((d) => {
      next[d] = count;
    });
    update(index, { countsByWeekday: next });
  };

  const isDuplicate = (candidate, skipIndex) =>
    rules.some(
      (r, i) =>
        i !== skipIndex &&
        r.shiftType === candidate.shiftType &&
        r.shiftTag === candidate.shiftTag &&
        r.role === candidate.role &&
        lower(r.unitArea) === lower(candidate.unitArea),
    );

  const addRole = (slot, role) => {
    // Same shift + role again is allowed in a different area; start it in
    // the first area not used yet.
    let unitArea = null;
    if (isDuplicate({ ...slot, role, unitArea: null })) {
      unitArea = areas.find((a) => !isDuplicate({ ...slot, role, unitArea: a })) || null;
      if (!unitArea) return;
    }
    onChange([
      ...rules,
      {
        shiftType: slot.shiftType,
        shiftTag: slot.shiftTag,
        role,
        unitArea: unitArea ? lower(unitArea) : null,
        requiredCertificationTags: [],
        countsByWeekday: [1, 1, 1, 1, 1, 1, 1],
      },
    ]);
  };

  const ruleSlotKey = (rule) => `${rule.shiftType}:${rule.shiftTag}`;
  const totals = columns.map((col) => rules.reduce((sum, rule) => sum + (rule.countsByWeekday[col.days[0]] || 0), 0));
  const grid = `minmax(190px, 1.6fr) repeat(${columns.length}, minmax(48px, 64px)) 36px`;

  const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value) => value && setMode(value)}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.75 } }}
        >
          <ToggleButton value="weekday_weekend">Weekdays and weekends</ToggleButton>
          <ToggleButton value="each_day">Each day different</ToggleButton>
        </ToggleButtonGroup>
        {rules.length > 0 && (
          <Typography sx={{ color: C.muted, fontSize: 14 }}>
            {mode === "weekday_weekend"
              ? `${totals[0]} people on a weekday, ${totals[1]} on a weekend day`
              : `${Math.min(...totals)}–${Math.max(...totals)} people a day`}
          </Typography>
        )}
      </Box>

      <Box sx={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 2, bgcolor: "#fff" }}>
        <Box sx={{ minWidth: mode === "each_day" ? 720 : 480 }}>
          {/* Column header */}
          <Box sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", px: 1.5, py: 1, bgcolor: C.canvas, borderBottom: `1px solid ${C.line}` }}>
            <Typography sx={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Who</Typography>
            {columns.map((col) => (
              <Typography key={col.label} sx={{ fontSize: 13, color: C.muted, fontWeight: 600, textAlign: "center" }}>
                {col.label}
              </Typography>
            ))}
            <span />
          </Box>

          {sortedSlots.map((slot) => {
            const inSlot = rules.map((rule, index) => ({ rule, index })).filter(({ rule }) => ruleSlotKey(rule) === slot.key);
            return (
              <Box key={slot.key} sx={{ borderBottom: `1px solid ${C.line}` }}>
                <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5, display: "flex", alignItems: "baseline", gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: C.ink }}>{slot.name}</Typography>
                  <Typography sx={{ color: C.muted, fontSize: 14 }}>{slot.time}</Typography>
                </Box>

                {inSlot.map(({ rule, index }) => (
                  <Box key={`${rule.role}:${rule.unitArea || ""}:${index}`} sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", px: 1.5, py: 0.75, gap: 0 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, pr: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: C.ink }}>{getRoleDisplayName(rule.role)}</Typography>
                      {(areas.length > 0 || certs.length > 0) && (
                        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                          {areas.length > 0 && (
                            <Select
                              size="small"
                              variant="standard"
                              disableUnderline
                              displayEmpty
                              disabled={disabled}
                              value={lower(rule.unitArea)}
                              onChange={(e) => {
                                const next = e.target.value || null;
                                if (isDuplicate({ ...rule, unitArea: next }, index)) return;
                                update(index, { unitArea: next });
                              }}
                              renderValue={(v) => (v ? titleCase(v) : "Any area")}
                              sx={{ fontSize: 13, color: rule.unitArea ? C.ink : C.muted, "& .MuiSelect-select": { py: 0, pr: "20px !important" } }}
                            >
                              <MenuItem value="">Any area</MenuItem>
                              {areas.map((a) => (
                                <MenuItem key={a} value={lower(a)} disabled={isDuplicate({ ...rule, unitArea: lower(a) }, index)}>
                                  {titleCase(a)}
                                </MenuItem>
                              ))}
                            </Select>
                          )}
                          {certs.length > 0 && (
                            <Select
                              size="small"
                              variant="standard"
                              disableUnderline
                              multiple
                              displayEmpty
                              disabled={disabled}
                              value={(rule.requiredCertificationTags || []).map(lower)}
                              onChange={(e) => update(index, { requiredCertificationTags: e.target.value })}
                              renderValue={(v) =>
                                v.length ? (
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    {v.map((c) => (
                                      <Chip key={c} size="small" label={titleCase(c)} sx={{ height: 20, fontSize: 12 }} />
                                    ))}
                                  </Box>
                                ) : (
                                  "Any certification"
                                )
                              }
                              sx={{ fontSize: 13, color: C.muted, "& .MuiSelect-select": { py: 0, pr: "20px !important" } }}
                            >
                              {certs.map((c) => (
                                <MenuItem key={c} value={lower(c)}>
                                  {titleCase(c)}
                                </MenuItem>
                              ))}
                            </Select>
                          )}
                        </Box>
                      )}
                    </Box>
                    {columns.map((col) => (
                      <Box key={col.label} sx={{ display: "flex", justifyContent: "center" }}>
                        <CountInput
                          value={rule.countsByWeekday[col.days[0]]}
                          onChange={(v) => setCount(index, col.days, v)}
                          disabled={disabled}
                          label={`${getRoleDisplayName(rule.role)} ${slot.name} ${col.label}`}
                        />
                      </Box>
                    ))}
                    <Tooltip title="Remove">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Remove ${getRoleDisplayName(rule.role)} on ${slot.name}`}
                          onClick={() => onChange(rules.filter((_, i) => i !== index))}
                          disabled={disabled}
                          sx={{ color: C.muted }}
                        >
                          <FiTrash2 size={15} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}

                {!disabled && (
                  <Box sx={{ px: 1, pb: 1 }}>
                    <Button
                      size="small"
                      startIcon={<FiPlus />}
                      onClick={(e) => setAddMenu({ anchor: e.currentTarget, slot })}
                      disabled={!roles.length}
                      sx={{ textTransform: "none", color: C.accent }}
                    >
                      {inSlot.length ? "Add a role" : `Who works ${slot.name.toLowerCase()}?`}
                    </Button>
                  </Box>
                )}
              </Box>
            );
          })}

          {rules.length > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", px: 1.5, py: 1.25, bgcolor: C.canvas }}>
              <Typography sx={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>People per day</Typography>
              {totals.map((total, i) => (
                <Typography key={columns[i].label} sx={{ fontWeight: 800, textAlign: "center", color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                  {total}
                </Typography>
              ))}
              <span />
            </Box>
          )}
        </Box>
      </Box>

      {(!slots.length || !roles.length) && (
        <Typography variant="body2" sx={{ color: C.muted, mt: 1.5 }}>
          Add shift times and roles in Facility Preferences first.
        </Typography>
      )}
      {slots.length > 0 && roles.length > 0 && areas.length === 0 && (
        <Typography variant="body2" sx={{ color: C.muted, mt: 1.5 }}>
          Need some people only in memory care, or only with Med Pass? Add unit areas and certifications in
          Facility Preferences and they'll show up here.
        </Typography>
      )}

      <Menu anchorEl={addMenu?.anchor} open={Boolean(addMenu)} onClose={() => setAddMenu(null)}>
        {roles.map((role) => (
          <MenuItem
            key={role}
            onClick={() => {
              addRole(addMenu.slot, role);
              setAddMenu(null);
            }}
          >
            {getRoleDisplayName(role)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
