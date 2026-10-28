// Small formatters shared by the Labor page and its settings.
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";

const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const dayLabel = (key, opts = { weekday: "short", month: "short", day: "numeric" }) =>
  keyToDate(key).toLocaleDateString(undefined, opts);

export const weekLabel = (days) =>
  days?.length ? `${dayLabel(days[0], { month: "short", day: "numeric" })} – ${dayLabel(days[6], { month: "short", day: "numeric" })}` : "";

/** "October 2026" from "2026-10". */
export const monthLabel = (month) => {
  const [y, m] = String(month).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

/** "October 2026" for a month, "Oct 19 – Oct 25" for a week. */
export const periodLabel = (d) => (d?.period === "month" ? monthLabel(d.month) : weekLabel(d?.days));

export const hours = (n) =>
  n === null || n === undefined ? "–" : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;

export const money = (n) =>
  n === null || n === undefined ? "–" : `$${Math.round(n).toLocaleString()}`;

export const roleLabel = (role) => (role && role !== "unassigned" ? getRoleDisplayName(role) : "No role");

export const certLabel = (tag) => toLabel(tag);

/** Print just this summary (the rest of the app is hidden while printing). */
export const printLaborSummary = () => {
  document.body.classList.add("printing-labor");
  const done = () => {
    document.body.classList.remove("printing-labor");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
};
