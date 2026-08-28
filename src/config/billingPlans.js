// Shared plan metadata/helpers for Paywall.jsx and ManageSubscription.jsx.
// Pricing/availability itself always comes from GET /stripe/plans; this file
// only supplies presentation details the backend doesn't send (labels,
// highlight flag, support tier, shared feature list).

export const SHARED_FEATURE_LIST = [
  "Automated scheduling",
  "Shift swaps",
  "Time-off management",
  "Internal messaging",
  "Coverage planning",
  "Staff directory",
];

const PLAN_FAMILY_METADATA = {
  starter: { highlight: false, supportTier: "standard" },
  growth: { highlight: true, supportTier: "standard" },
  premium: { highlight: false, supportTier: "priority" },
};

// "starterMonthly" / "growthYearly" -> "starter" / "growth"
export const getPlanFamily = (planKey) =>
  String(planKey || "")
    .replace(/(Monthly|Yearly)$/i, "")
    .toLowerCase();

export const getPlanMetadata = (planKey) =>
  PLAN_FAMILY_METADATA[getPlanFamily(planKey)] || {
    highlight: false,
    supportTier: "standard",
  };

export const ENTERPRISE_PLAN = {
  planKey: "enterprise",
  name: "Enterprise",
  seats: "150+",
  supportTier: "priority",
  highlight: false,
  isEnterprise: true,
};

export const getSupportLabel = (plan) =>
  plan.supportTier === "priority" ? "Priority support" : "Standard support";

export const getCapacityLabel = (plan) =>
  plan.isEnterprise
    ? `${plan.seats} active employees`
    : `Up to ${plan.seats} active employees`;

export const formatPriceLabel = (priceCents, interval) => {
  const amount = Math.round((Number(priceCents) || 0) / 100);
  return `$${amount.toLocaleString()}/${interval === "month" ? "mo" : "yr"}`;
};

export const formatBillingCadenceNote = (priceCents, interval) => {
  if (interval === "month") return "Billed monthly";
  const monthlyEquivalent = Math.round((Number(priceCents) || 0) / 100 / 12);
  return `Equivalent to $${monthlyEquivalent}/mo billed annually`;
};

// Merges a raw plan entry from GET /stripe/plans with local display metadata.
export const decoratePlan = (plan) => ({
  ...plan,
  ...getPlanMetadata(plan.planKey),
  priceLabel: formatPriceLabel(plan.priceCents, plan.interval),
  cadenceNote: formatBillingCadenceNote(plan.priceCents, plan.interval),
});
