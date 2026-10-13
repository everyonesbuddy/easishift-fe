// Presentation details for the plans. Limits, prices and what the workspace
// is on always come from GET /stripe/plans (backend config/plans.js).

export const PLAN_FEATURES = {
  free: [
    "1 scheduler, up to 15 staff",
    "Staffing template and weekly schedule",
    "Publish by email, one message per person",
    "Staff personal links (no app, no login)",
    "Time-off requests",
  ],
  pro: [
    "3 schedulers, up to 75 staff",
    "Text the schedule to everyone",
    "Shift swaps and open-shift pickup",
    "Fill call-outs by text: first YES gets it",
    "Shift reminders and CSV import",
  ],
  facility: [
    "10 schedulers, up to 200 staff",
    "Auto-fill the week",
    "Time clock with location check",
    "Timesheets and payroll export",
    "Messaging and dashboard",
  ],
  organization: [
    "Multiple facilities",
    "White-label branding",
    "Custom limits and onboarding",
  ],
};

export const PLAN_TAGLINES = {
  free: "For one scheduler getting off spreadsheets",
  pro: "Everything staff need from their phone",
  facility: "Run the whole facility's time and pay",
  organization: "For groups with several facilities",
};

export const formatPrice = (cents, interval) => {
  if (cents === null || cents === undefined) return "Custom";
  const dollars = Math.round(Number(cents) / 100);
  return `$${dollars.toLocaleString()}/${interval === "year" ? "yr" : "mo"}`;
};

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
