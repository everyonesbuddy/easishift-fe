// Shared look and labels for the week grid and its dialogs.

export const GRID = {
  ink: "#1F2937",
  muted: "#6B7280",
  line: "#E5E7EB",
  canvas: "#F8FAFC",
  filled: "#0F766E",
  filledBg: "#F0FDFA",
  short: "#B45309",
  shortBg: "#FFFBEB",
  over: "#6D28D9",
};

export const titleCase = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

