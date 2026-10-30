// Small helpers shared by the HQ screens.
import { IOS } from "../../theme/ios";

export const surface = {
  bgcolor: IOS.surface,
  borderRadius: IOS.radius.card,
  boxShadow: IOS.shadow,
  border: `1px solid ${IOS.hairline}`,
};
export const num = { fontVariantNumeric: "tabular-nums" };

export const ROLE_LABELS = {
  executive_director: "Executive Director",
  administrator: "Administrator",
  don: "Director of Nursing",
  regional: "Regional / C-suite",
  owner: "Owner",
  scheduler: "Scheduler",
  other: "Other",
};
export const ROLE_SHORT = {
  executive_director: "ED",
  administrator: "Admin",
  don: "DON",
  regional: "Regional",
  owner: "Owner",
  scheduler: "Scheduler",
  other: "Other",
};
export const ROLE_COLORS = {
  executive_director: "#5856D6",
  administrator: "#007AFF",
  don: "#AF52DE",
  regional: "#FF2D55",
  owner: "#A2845E",
  scheduler: "#34C759",
  other: "#8E8E93",
};

export const PLAY_KINDS = {
  help: { label: "Help finish setup", color: IOS.orange },
  expand: { label: "Reach out to leadership", color: "#5856D6" },
  upgrade: { label: "Upgrade ask", color: IOS.green },
  rescue: { label: "Check in", color: IOS.orange },
  personal: { label: "Clicked our email", color: IOS.blue },
  reply: { label: "Replied", color: IOS.red },
  lead: { label: "Website lead", color: "#30B0C7" },
  operator: { label: "Group pitch", color: "#FF2D55" },
  call: { label: "Call-back due", color: "#30B0C7" },
  overdue: { label: "Content overdue", color: IOS.red },
  content: { label: "Content due", color: IOS.orange },
  cadence: { label: "Weekly target", color: "#5856D6" },
  didwell: { label: "Did well", color: IOS.green },
};

export const n = (v, digits = 0) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "–" : Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });

export const pct = (v, digits = 1) => (v === null || v === undefined ? "–" : `${(Number(v) * 100).toFixed(digits)}%`);

export const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(new Date(d).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }) : "–";

export const ago = (d) => {
  if (!d) return "never";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 0) {
    const days = Math.ceil(-s / 86400);
    return days <= 1 ? "tomorrow" : `in ${days} days`;
  }
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round(s / 86400);
  if (days < 45) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(d);
};

export const errorText = (err, fallback) => err?.response?.data?.message || fallback;

/** "2026-11-03" for <input type="date"> from a Date/ISO string. */
export const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const KINDS = [
  ["call", "Call"],
  ["email", "Cold email (own inbox)"],
  ["linkedin", "LinkedIn"],
  ["meeting", "Meeting"],
  ["note", "Note"],
];
