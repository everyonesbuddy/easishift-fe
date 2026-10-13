// Shared look and labels for the week grid and its dialogs.

import { IOS, tint } from "../../../theme/ios";

export const GRID = {
  ink: IOS.ink,
  muted: IOS.secondary,
  line: IOS.separator,
  canvas: IOS.canvas,
  filled: IOS.greenText,
  filledBg: tint(IOS.green, 0.12),
  short: IOS.orangeText,
  shortBg: tint(IOS.orange, 0.1),
  over: "#8944AB",
};

import { toLabel } from "../../../utils/labels";

export const titleCase = toLabel;

const compactTime = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  const suffix = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
};

const clockFromDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * "Day" + "7a–3p" for a shiftType + shiftTag, from facility preferences.
 * Older coverage may have no shift type; then the name is "Shift" and the
 * time comes from the row's own start/end (pass `row`).
 */
export const slotLabel = (prefs, shiftType, shiftTag, row) => {
  const def = shiftType ? (prefs?.shiftTypeDefinitions || []).find((d) => d.key === shiftType) : null;
  const slot = (def?.timeSlots || []).find((s) => s.tag === shiftTag);
  // Slot labels often already include the time ("Day 7a–3p"), so name the
  // shift by its type and show the time separately.
  const name = def?.label || titleCase(shiftType) || "Shift";
  const start = slot?.startLocalTime || clockFromDate(row?.startTime);
  const end = slot?.endLocalTime || clockFromDate(row?.endTime);
  const time = start && end ? `${compactTime(start)}–${compactTime(end)}` : "";
  return { name, time, start: start || "" };
};
