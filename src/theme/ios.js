// Shared look for the scheduling screens: system font, soft greys, rounded
// surfaces and Apple-calendar-style colored shift pills.

export const IOS = {
  canvas: "#F5F5F7",
  surface: "#FFFFFF",
  ink: "#1D1D1F",
  secondary: "#6E6E73",
  tertiary: "#AEAEB2",
  separator: "rgba(60, 60, 67, 0.12)",
  hairline: "rgba(60, 60, 67, 0.08)",
  fill: "rgba(118, 118, 128, 0.12)",
  blue: "#007AFF",
  green: "#34C759",
  greenText: "#248A3D",
  orange: "#FF9500",
  orangeText: "#C93400",
  red: "#FF3B30",
  redText: "#D70015",
  purple: "#AF52DE",
  radius: { card: "18px", cell: "12px", pill: "8px", round: "999px" },
  shadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
  shadowRaised: "0 8px 30px rgba(0,0,0,0.12)",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
};

// Calendar-style colors, assigned to roles in a stable order.
const ROLE_PALETTE = [
  "#007AFF", // blue
  "#34C759", // green
  "#AF52DE", // purple
  "#FF9500", // orange
  "#FF2D55", // pink
  "#5AC8FA", // teal
  "#5856D6", // indigo
  "#A2845E", // brown
  "#FFCC00", // yellow
  "#30B0C7", // cyan
];

const hash = (value) => {
  let h = 0;
  for (const ch of String(value || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/** Stable color for a role; pass the facility's role list to avoid clashes. */
export const roleColor = (role, roleList) => {
  const key = String(role || "").toLowerCase();
  const index = Array.isArray(roleList) ? roleList.map((r) => String(r).toLowerCase()).indexOf(key) : -1;
  return ROLE_PALETTE[(index >= 0 ? index : hash(key)) % ROLE_PALETTE.length];
};

/** Hex color with alpha, e.g. tint("#007AFF", 0.12). */
export const tint = (hex, alpha) => {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Segmented control (iOS style) for MUI ToggleButtonGroup `sx`. */
export const segmentedSx = {
  bgcolor: IOS.fill,
  borderRadius: "10px",
  p: "2px",
  gap: "2px",
  "& .MuiToggleButton-root": {
    border: "none !important",
    borderRadius: "8px !important",
    textTransform: "none",
    fontWeight: 600,
    fontSize: 13,
    color: IOS.ink,
    px: 1.5,
    py: 0.5,
    lineHeight: 1.4,
    "&:hover": { bgcolor: "rgba(255,255,255,0.5)" },
  },
  "& .MuiToggleButton-root.Mui-selected": {
    bgcolor: "#fff !important",
    color: IOS.ink,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)",
  },
};
