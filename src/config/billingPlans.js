// Presentation details for the plans. Limits, prices and what the workspace
// is on always come from GET /stripe/plans (backend config/plans.js).

export const PAID_PLAN_KEYS = ["starter", "growth", "premium"];
export const POPULAR_PLAN = "growth";

// Free keeps the core; every paid plan has all of this.
export const FREE_FEATURES = [
  "Weekly needs and the week schedule",
  "Unit areas and certifications",
  "Staff directory",
  "Publish by email, one message per person",
  "Staff personal links (no app, no login)",
  "Time-off requests",
];

export const PAID_FEATURES = [
  "Everything in Free",
  "Automated scheduling",
  "Set weekly needs by typing or voice",
  "Text the schedule and shift reminders",
  "Shift swaps and open-shift pickup",
  "Fill call-outs by text: first yes gets it",
  "Internal messaging",
  "Time clock, timesheets and payroll export",
  "Dashboard and reports",
  "Spreadsheet import",
];

export const ENTERPRISE_FEATURES = [
  "150+ active staff, unlimited schedulers",
  "Several facilities under one account",
  "Your branding",
  "Priority support and a custom annual package",
];

export const PLAN_TAGLINES = {
  free: "One scheduler trying it with their team",
  starter: "A facility with up to 50 staff",
  growth: "A facility with up to 100 staff",
  premium: "A facility with up to 150 staff",
  enterprise: "Groups and larger facilities",
};

export const SUPPORT_LABELS = {
  help_docs: "Help docs",
  standard: "Standard support",
  priority: "Priority support",
};

const dollars = (cents) => Math.round(Number(cents) / 100).toLocaleString();

export const formatPrice = (cents, interval) => {
  if (cents === null || cents === undefined) return "Custom";
  return `$${dollars(cents)}/${interval === "year" ? "yr" : "mo"}`;
};

export const formatMoney = (cents) => `$${dollars(cents)}`;

export const formatLimit = (value, noun) =>
  value === null || value === undefined
    ? `Unlimited ${noun}`
    : `${value} ${value === 1 ? noun.replace(/s$/, "") : noun}`;

export const daysLeft = (isoDate) => {
  if (!isoDate) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000),
  );
};

export const planLabel = (key) =>
  ({
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    premium: "Premium",
    enterprise: "Enterprise",
  })[key] || "a paid";
