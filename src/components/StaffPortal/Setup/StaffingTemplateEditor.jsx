import { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MdDeleteOutline } from "react-icons/md";

// countsByWeekday is Sunday-first: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const pretty = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isWeekdayWeekendShape = (counts) =>
  WEEKDAYS.every((d) => counts[d] === counts[1]) &&
  WEEKEND.every((d) => counts[d] === counts[0]);

/** Every shift slot defined in facility preferences, as {key, label, ...}. */
const listShiftSlots = (facilityPreferences) =>
  (facilityPreferences?.shiftTypeDefinitions || []).flatMap((definition) =>
    (definition.timeSlots || []).map((slot) => ({
      key: `${definition.key}:${slot.tag}`,
      shiftType: definition.key,
      shiftTag: slot.tag,
      label:
        slot.label ||
        `${definition.label || pretty(definition.key)} ${slot.startLocalTime}–${slot.endLocalTime}`,
    })),
  );

/**
 * Edits the staffing template: for each shift + role, how many people on
 * each day. Controlled: `rules` in, `onChange(rules)` out.
 */
export default function StaffingTemplateEditor({
  rules,
  onChange,
  facilityPreferences,
  disabled = false,
}) {
  const slots = useMemo(
    () => listShiftSlots(facilityPreferences),
    [facilityPreferences],
  );
  const roles = facilityPreferences?.roleFamilies || [];
  const [mode, setMode] = useState(() =>
    rules.every((rule) => isWeekdayWeekendShape(rule.countsByWeekday))
      ? "weekday_weekend"
      : "each_day",
  );
  const [newSlot, setNewSlot] = useState("");
  const [newRole, setNewRole] = useState("");

  const slotLabel = (rule) =>
    slots.find((s) => s.shiftType === rule.shiftType && s.shiftTag === rule.shiftTag)
      ?.label || `${pretty(rule.shiftType)} (${rule.shiftTag})`;

  const setCount = (index, days, value) => {
    const count = Math.max(0, Math.min(50, Number.parseInt(value, 10) || 0));
    onChange(
      rules.map((rule, i) => {
        if (i !== index) return rule;
        const next = [...rule.countsByWeekday];
        days.forEach((d) => {
          next[d] = count;
        });
        return { ...rule, countsByWeekday: next };
      }),
    );
  };

  const removeRule = (index) => onChange(rules.filter((_, i) => i !== index));

  const addRule = () => {
    const slot = slots.find((s) => s.key === newSlot);
    if (!slot || !newRole) return;
    const exists = rules.some(
      (r) =>
        r.shiftType === slot.shiftType &&
        r.shiftTag === slot.shiftTag &&
        r.role === newRole,
    );
    if (exists) return;
    onChange([
      ...rules,
      {
        shiftType: slot.shiftType,
        shiftTag: slot.shiftTag,
        role: newRole,
        unitArea: null,
        countsByWeekday: [1, 1, 1, 1, 1, 1, 1],
      },
    ]);
    setNewRole("");
  };

  const columns =
    mode === "weekday_weekend"
      ? [
          { label: "Mon–Fri", days: WEEKDAYS },
          { label: "Sat–Sun", days: WEEKEND },
        ]
      : DAY_LABELS.map((label, day) => ({ label, days: [day] }));

  const totals = columns.map((col) =>
    rules.reduce((sum, rule) => sum + (rule.countsByWeekday[col.days[0]] || 0), 0),
  );

  const numberField = (index, col, rule) => (
    <TextField
      type="number"
      size="small"
      value={rule.countsByWeekday[col.days[0]]}
      onChange={(event) => setCount(index, col.days, event.target.value)}
      disabled={disabled}
      inputProps={{
        min: 0,
        max: 50,
        "aria-label": `${pretty(rule.role)} ${slotLabel(rule)} ${col.label}`,
        style: { width: 44, textAlign: "center" },
      }}
    />
  );

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_, value) => value && setMode(value)}
      >
        <ToggleButton value="weekday_weekend" sx={{ textTransform: "none" }}>
          Weekdays and weekends
        </ToggleButton>
        <ToggleButton value="each_day" sx={{ textTransform: "none" }}>
          Each day different
        </ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2 }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td, & th": { px: 1.5, py: 1, textAlign: "left" } }}>
          <thead>
            <Box component="tr" sx={{ bgcolor: "grey.50", "& th": { fontSize: 13, color: "text.secondary", fontWeight: 600 } }}>
              <th>Shift</th>
              <th>Role</th>
              {columns.map((col) => (
                <th key={col.label}>{col.label}</th>
              ))}
              <th aria-label="Remove" />
            </Box>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={columns.length + 3}>
                  <Typography color="text.secondary" sx={{ py: 1 }}>
                    No needs yet. Add a role to a shift below.
                  </Typography>
                </td>
              </tr>
            )}
            {rules.map((rule, index) => (
              <Box component="tr" key={`${rule.shiftType}:${rule.shiftTag}:${rule.role}`} sx={{ borderTop: 1, borderColor: "divider" }}>
                <td>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {slotLabel(rule)}
                  </Typography>
                </td>
                <td>{pretty(rule.role)}</td>
                {columns.map((col) => (
                  <td key={col.label}>{numberField(index, col, rule)}</td>
                ))}
                <td>
                  <IconButton
                    aria-label={`Remove ${pretty(rule.role)} on ${slotLabel(rule)}`}
                    onClick={() => removeRule(index)}
                    disabled={disabled}
                    size="small"
                  >
                    <MdDeleteOutline />
                  </IconButton>
                </td>
              </Box>
            ))}
            {rules.length > 0 && (
              <Box component="tr" sx={{ borderTop: 1, borderColor: "divider", bgcolor: "grey.50" }}>
                <td colSpan={2}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    People per day
                  </Typography>
                </td>
                {totals.map((total, i) => (
                  <td key={columns[i].label}>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "center", width: 60 }}>
                      {total}
                    </Typography>
                  </td>
                ))}
                <td />
              </Box>
            )}
          </tbody>
        </Box>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
        <TextField
          select
          size="small"
          label="Shift"
          value={newSlot}
          onChange={(event) => setNewSlot(event.target.value)}
          sx={{ minWidth: 200 }}
          disabled={disabled || !slots.length}
        >
          {slots.map((slot) => (
            <MenuItem key={slot.key} value={slot.key}>
              {slot.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Role"
          value={newRole}
          onChange={(event) => setNewRole(event.target.value)}
          sx={{ minWidth: 160 }}
          disabled={disabled || !roles.length}
        >
          {roles.map((role) => (
            <MenuItem key={role} value={role}>
              {pretty(role)}
            </MenuItem>
          ))}
        </TextField>
        <Button onClick={addRule} disabled={disabled || !newSlot || !newRole}>
          + Add role to shift
        </Button>
      </Stack>
      {(!slots.length || !roles.length) && (
        <Typography variant="body2" color="text.secondary">
          Add shift times and roles in Facility Preferences first.
        </Typography>
      )}
    </Stack>
  );
}
