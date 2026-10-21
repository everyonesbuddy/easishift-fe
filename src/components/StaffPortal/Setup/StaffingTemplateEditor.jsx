import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
import { Link as RouterLink } from "react-router-dom";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";
import { tagKey } from "../../../utils/tags";
import { IOS, roleColor, segmentedSx, tint } from "../../../theme/ios";

// countsByWeekday is Sunday-first: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

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

const lower = tagKey;

const mergeKeys = (...lists) => [...new Set(lists.flat().map(lower).filter(Boolean))].sort();

/** Every shift slot defined in facility preferences. */
const listShiftSlots = (prefs) =>
  (prefs?.shiftTypeDefinitions || []).flatMap((def) =>
    (def.timeSlots || []).map((slot) => ({
      key: `${def.key}:${slot.tag}`,
      shiftType: def.key,
      shiftTag: slot.tag,
      name: def.label || titleCase(def.key),
      slotLabel: slot.label || "",
      time: `${compactTime(slot.startLocalTime)}–${compactTime(slot.endLocalTime)}`,
      start: slot.startLocalTime || "",
    })),
  );

// Borderless, rounded selector used for area and certification pickers.
const selectSx = {
  borderRadius: "10px",
  bgcolor: IOS.canvas,
  minHeight: 36,
  fontSize: 13,
  "& fieldset": { border: "none" },
  "&:hover": { bgcolor: "#EDEDF0" },
  "&.Mui-focused": { bgcolor: "#fff", boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.25)}` },
  "&.Mui-disabled": { bgcolor: "transparent", border: `1px dashed ${IOS.separator}` },
  "& .MuiSelect-select": { py: "6px", pl: "12px", display: "flex", alignItems: "center", minHeight: "24px !important" },
};

const menuProps = {
  PaperProps: { sx: { borderRadius: "12px", boxShadow: IOS.shadowRaised, mt: 0.5, maxHeight: 320 } },
};

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
        maxWidth: 52,
        height: 36,
        boxSizing: "border-box",
        textAlign: "center",
        font: "inherit",
        fontWeight: 700,
        fontSize: 15,
        fontVariantNumeric: "tabular-nums",
        color: Number(value) === 0 ? IOS.tertiary : IOS.ink,
        bgcolor: Number(value) === 0 ? "transparent" : IOS.canvas,
        border: `1px solid ${Number(value) === 0 ? IOS.separator : "transparent"}`,
        borderRadius: "10px",
        outline: "none",
        transition: "background-color 120ms ease, box-shadow 120ms ease",
        "&:hover": { bgcolor: "#EDEDF0" },
        "&:focus": { bgcolor: "#fff", borderColor: IOS.blue, boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.2)}` },
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
 * Unit areas and certifications are picked from Facility Preferences (the
 * same lists staff are tagged from); when a list is empty its picker is off.
 */
export default function StaffingTemplateEditor({
  rules,
  onChange,
  facilityPreferences,
  disabled = false,
  // Optional { roles, areas }: show only these (Weekly Needs page filter).
  filter = null,
}) {
  const slots = useMemo(() => listShiftSlots(facilityPreferences), [facilityPreferences]);
  const roles = facilityPreferences?.roleFamilies || [];
  const prefAreas = useMemo(() => mergeKeys(facilityPreferences?.unitAreas || []), [facilityPreferences]);
  const prefCerts = useMemo(() => mergeKeys(facilityPreferences?.certificationTags || []), [facilityPreferences]);
  // Values already on a rule stay selectable so older data still shows.
  const areas = useMemo(() => mergeKeys(prefAreas, rules.map((r) => r.unitArea)), [prefAreas, rules]);
  const certs = useMemo(
    () => mergeKeys(prefCerts, rules.flatMap((r) => r.requiredCertificationTags || [])),
    [prefCerts, rules],
  );
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
    // With an area filter on, start new rows in the first filtered area so they stay visible.
    let unitArea = filterAreas.length ? filterAreas.find((a) => !isDuplicate({ ...slot, role, unitArea: a })) || null : null;
    if (filterAreas.length && !unitArea) return;
    if (!unitArea && isDuplicate({ ...slot, role, unitArea: null })) {
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
  const filterRoles = filter?.roles || [];
  const filterAreas = filter?.areas || [];
  const filtering = filterRoles.length > 0 || filterAreas.length > 0;
  const shown = (rule) =>
    (!filterRoles.length || filterRoles.includes(lower(rule.role))) &&
    (!filterAreas.length || filterAreas.includes(lower(rule.unitArea)));
  const visibleRules = rules.filter(shown);
  const totals = columns.map((col) => visibleRules.reduce((sum, rule) => sum + (rule.countsByWeekday[col.days[0]] || 0), 0));
  // With a role filter on, "Add a role" offers those roles first.
  const addRoles = filterRoles.length ? roles.filter((r) => filterRoles.includes(lower(r))) : roles;
  const countCols = `repeat(${columns.length}, ${mode === "each_day" ? "52px" : "72px"})`;
  const grid = `minmax(130px, 1fr) minmax(150px, 1fr) minmax(170px, 1.2fr) ${countCols} 36px`;
  const minWidth = mode === "each_day" ? 920 : 640;

  const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const headCell = { fontSize: 12, color: IOS.secondary, fontWeight: 600, letterSpacing: "0.02em" };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, value) => value && setMode(value)} sx={segmentedSx}>
          <ToggleButton value="weekday_weekend">Weekdays and weekends</ToggleButton>
          <ToggleButton value="each_day">Each day different</ToggleButton>
        </ToggleButtonGroup>
        {visibleRules.length > 0 && (
          <Typography sx={{ color: IOS.secondary, fontSize: 14 }}>
            {filtering ? "Shown: " : ""}
            {mode === "weekday_weekend"
              ? `${totals[0]} people on a weekday, ${totals[1]} on a weekend day`
              : `${Math.min(...totals)}–${Math.max(...totals)} people a day`}
          </Typography>
        )}
      </Box>

      <Box sx={{ overflowX: "auto", borderRadius: IOS.radius.card, bgcolor: IOS.surface, boxShadow: IOS.shadow, border: `1px solid ${IOS.hairline}` }}>
        <Box sx={{ minWidth }}>
          {/* Column header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: grid,
              columnGap: 1.5,
              alignItems: "center",
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${IOS.separator}`,
            }}
          >
            <Typography sx={headCell}>Role</Typography>
            <Typography sx={headCell}>Unit area</Typography>
            <Typography sx={headCell}>Certifications</Typography>
            {columns.map((col) => (
              <Typography key={col.label} sx={{ ...headCell, textAlign: "center" }}>
                {col.label}
              </Typography>
            ))}
            <span />
          </Box>

          {sortedSlots.map((slot) => {
            const inSlot = rules
              .map((rule, index) => ({ rule, index }))
              .filter(({ rule }) => ruleSlotKey(rule) === slot.key && shown(rule));
            // Filtered: skip shifts with nothing to show (unless you can add to them).
            if (filtering && !inSlot.length && (disabled || !addRoles.length)) return null;
            return (
              <Box key={slot.key} sx={{ "& + &": { borderTop: `1px solid ${IOS.separator}` } }}>
                <Box sx={{ px: 2, pt: 1.75, pb: 0.75, display: "flex", alignItems: "baseline", gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: IOS.ink, fontSize: 15 }}>{slot.name}</Typography>
                  {slot.slotLabel && !slot.slotLabel.toLowerCase().startsWith(slot.name.toLowerCase()) && (
                    <Typography sx={{ color: IOS.secondary, fontSize: 13 }}>{slot.slotLabel}</Typography>
                  )}
                  <Typography sx={{ color: IOS.secondary, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{slot.time}</Typography>
                </Box>

                {inSlot.map(({ rule, index }) => {
                  const color = roleColor(rule.role, roles);
                  const roleName = getRoleDisplayName(rule.role);
                  return (
                    <Box
                      key={`${rule.role}:${rule.unitArea || ""}:${index}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: grid,
                        columnGap: 1.5,
                        alignItems: "center",
                        px: 2,
                        py: 0.75,
                        "&:hover": { bgcolor: "rgba(0,0,0,0.015)" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Box sx={{ width: 4, alignSelf: "stretch", minHeight: 24, borderRadius: 4, bgcolor: color, flexShrink: 0 }} />
                        <Typography noWrap sx={{ fontWeight: 600, color: IOS.ink, fontSize: 14 }}>
                          {roleName}
                        </Typography>
                      </Box>

                      <Select
                        size="small"
                        displayEmpty
                        disabled={disabled || !prefAreas.length}
                        value={lower(rule.unitArea)}
                        onChange={(e) => {
                          const next = e.target.value || null;
                          if (next && isDuplicate({ ...rule, unitArea: next }, index)) return;
                          update(index, { unitArea: next });
                        }}
                        renderValue={(v) =>
                          v ? (
                            titleCase(v)
                          ) : (
                            <Box component="span" sx={{ color: IOS.tertiary }}>
                              {prefAreas.length ? "Any area" : "None set up"}
                            </Box>
                          )
                        }
                        inputProps={{ "aria-label": `Unit area for ${roleName} on ${slot.name}` }}
                        MenuProps={menuProps}
                        sx={selectSx}
                      >
                        <MenuItem value="">Any area</MenuItem>
                        {areas.map((a) => (
                          <MenuItem key={a} value={a} disabled={isDuplicate({ ...rule, unitArea: a }, index)}>
                            {titleCase(a)}
                          </MenuItem>
                        ))}
                      </Select>

                      <Select
                        size="small"
                        multiple
                        displayEmpty
                        disabled={disabled || !prefCerts.length}
                        value={(rule.requiredCertificationTags || []).map(lower)}
                        onChange={(e) =>
                          update(index, { requiredCertificationTags: [...new Set(e.target.value.map(lower).filter(Boolean))] })
                        }
                        renderValue={(v) =>
                          v.length ? (
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {v.map((c) => (
                                <Chip
                                  key={c}
                                  size="small"
                                  label={titleCase(c)}
                                  sx={{ height: 22, fontSize: 12, fontWeight: 600, borderRadius: "6px", bgcolor: tint(IOS.purple, 0.12), color: "#8944AB" }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Box component="span" sx={{ color: IOS.tertiary }}>
                              {prefCerts.length ? "Any certification" : "None set up"}
                            </Box>
                          )
                        }
                        inputProps={{ "aria-label": `Certifications for ${roleName} on ${slot.name}` }}
                        MenuProps={menuProps}
                        sx={selectSx}
                      >
                        {certs.map((c) => (
                          <MenuItem key={c} value={c} sx={{ gap: 1 }}>
                            <Checkbox size="small" checked={(rule.requiredCertificationTags || []).map(lower).includes(c)} sx={{ p: 0 }} />
                            {titleCase(c)}
                          </MenuItem>
                        ))}
                      </Select>

                      {columns.map((col) => (
                        <Box key={col.label} sx={{ display: "flex", justifyContent: "center" }}>
                          <CountInput
                            value={rule.countsByWeekday[col.days[0]]}
                            onChange={(v) => setCount(index, col.days, v)}
                            disabled={disabled}
                            label={`${roleName} ${slot.name} ${col.label}`}
                          />
                        </Box>
                      ))}
                      <Tooltip title="Remove">
                        <span>
                          <IconButton
                            size="small"
                            aria-label={`Remove ${roleName} on ${slot.name}`}
                            onClick={() => onChange(rules.filter((_, i) => i !== index))}
                            disabled={disabled}
                            sx={{ color: IOS.tertiary, "&:hover": { color: IOS.red, bgcolor: tint(IOS.red, 0.08) } }}
                          >
                            <FiTrash2 size={15} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  );
                })}

                {!disabled && (
                  <Box sx={{ px: 1.25, pb: 1.25, pt: 0.25 }}>
                    <Button
                      size="small"
                      startIcon={<FiPlus />}
                      onClick={(e) => setAddMenu({ anchor: e.currentTarget, slot })}
                      disabled={!addRoles.length}
                      sx={{ color: IOS.blue, borderRadius: "8px", fontWeight: 600 }}
                    >
                      {inSlot.length ? "Add a role" : `Who works ${slot.name.toLowerCase()}?`}
                    </Button>
                  </Box>
                )}
              </Box>
            );
          })}

          {visibleRules.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: grid,
                columnGap: 1.5,
                alignItems: "center",
                px: 2,
                py: 1.5,
                bgcolor: IOS.canvas,
                borderTop: `1px solid ${IOS.separator}`,
              }}
            >
              <Typography sx={{ fontWeight: 700, color: IOS.ink, fontSize: 14, gridColumn: "span 3" }}>
                {filtering ? "People per day (shown roles and areas)" : "People per day"}
              </Typography>
              {totals.map((total, i) => (
                <Typography
                  key={columns[i].label}
                  sx={{ fontWeight: 700, textAlign: "center", color: IOS.ink, fontVariantNumeric: "tabular-nums" }}
                >
                  {total}
                </Typography>
              ))}
              <span />
            </Box>
          )}
        </Box>
      </Box>

      {(!slots.length || !roles.length) && (
        <Typography variant="body2" sx={{ color: IOS.secondary, mt: 1.5 }}>
          Add shift times and roles in Facility Preferences first.
        </Typography>
      )}
      {slots.length > 0 && roles.length > 0 && (
        <Typography variant="body2" sx={{ color: IOS.secondary, mt: 1.5 }}>
          {prefAreas.length && prefCerts.length
            ? "Pick a unit area or certification to only match staff tagged with it."
            : `No ${[!prefAreas.length && "unit areas", !prefCerts.length && "certifications"].filter(Boolean).join(" or ")} set up yet.`}{" "}
          <Box component={RouterLink} to="/facility-preferences#areas" sx={{ color: IOS.blue, fontWeight: 600, textDecoration: "none" }}>
            Manage in Facility Preferences
          </Box>
        </Typography>
      )}

      <Menu
        anchorEl={addMenu?.anchor}
        open={Boolean(addMenu)}
        onClose={() => setAddMenu(null)}
        slotProps={{ paper: { sx: { borderRadius: "12px", boxShadow: IOS.shadowRaised, minWidth: 200 } } }}
      >
        {addRoles.map((role) => (
          <MenuItem
            key={role}
            onClick={() => {
              addRole(addMenu.slot, role);
              setAddMenu(null);
            }}
            sx={{ gap: 1.25, fontSize: 14 }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: roleColor(role, roles) }} />
            {getRoleDisplayName(role)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
