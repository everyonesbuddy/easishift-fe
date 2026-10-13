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

/** "Day 7a–3p" for a shiftType + shiftTag, from facility preferences. */
export const slotLabel = (prefs, shiftType, shiftTag) => {
  const def = (prefs?.shiftTypeDefinitions || []).find((d) => d.key === shiftType);
  const slot = (def?.timeSlots || []).find((s) => s.tag === shiftTag);
  // Slot labels often already include the time ("Day 7a–3p"), so name the
  // shift by its type and show the time separately.
  const name = def?.label || titleCase(shiftType);
  const time = slot ? `${compactTime(slot.startLocalTime)}–${compactTime(slot.endLocalTime)}` : "";
  return { name, time, start: slot?.startLocalTime || "" };
};

