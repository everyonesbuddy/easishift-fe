import {
  FiAlertTriangle,
  FiAward,
  FiBarChart2,
  FiClock,
  FiFileText,
  FiHeart,
  FiLayers,
  FiLock,
  FiMail,
  FiSend,
  FiShuffle,
  FiTarget,
  FiTrendingDown,
} from "react-icons/fi";

/** Said once on every page, so nobody mistakes us for an agency. */
export const NOT_AN_AGENCY = "WiserShifts is software for your own team. We don't supply staff.";

export const DEMO_URL = "https://calendly.com/wisershifts-info/30min";

/**
 * The three people we sell to. Used by the "Built for your role" tabs on the
 * home page and the /for/:role pages. `mocks` name drawings in ProductMocks.
 */
export const ROLES = [
  {
    slug: "schedulers",
    tab: "Schedulers",
    tabShort: "Schedulers",
    eyebrow: "For schedulers and staffing coordinators",
    title: "Get next week out tonight, and keep it covered.",
    subtitle:
      "Set your weekly needs once. Build the week by hand or with auto-fill, send everyone their own link, and fill call-outs from your phone.",
    points: [
      { icon: FiLayers, title: "Weekly Needs, reused every week", text: "How many CNAs, med techs and nurses each shift needs. Every new week starts from it." },
      { icon: FiSend, title: "Sent in one click", text: "Each person gets their own link by text or email and sees just their shifts. No app or password for your staff." },
      { icon: FiAlertTriangle, title: "Open spots and call-outs in one place", text: "Today shows what's still open for the next three days. Tap Fill to see who on your team is qualified and free." },
      { icon: FiShuffle, title: "Swaps without the group text", text: "Your staff ask to swap or pick up a shift from their link. You approve it in one tap." },
    ],
    mocks: ["week"],
    calculator: { label: "Call-out cost calculator", to: "/calculators/call-out-cost-calculator" },
    primary: "start",
  },
  {
    slug: "directors",
    tab: "DONs and administrators",
    tabShort: "DONs & admins",
    eyebrow: "For directors of nursing and administrators",
    title: "Catch overtime and open shifts before payroll does.",
    subtitle:
      "Your building's labor at a glance: hours per resident day against budget, overtime coming, call-outs by shift, certifications about to expire, and who's showing signs of burning out.",
    points: [
      { icon: FiClock, title: "Overtime before payroll", text: "See who's heading past 40 hours and on which day. Fix moves a shift to someone on your team with room." },
      { icon: FiTarget, title: "Hours per resident day vs budget", text: "Staffed hours against your target, with the math written out and how much of a gap is open shifts." },
      { icon: FiAward, title: "Certifications about to expire", text: "Expired, or expiring in the next 30 days, so nobody works a shift they're not cleared for." },
      { icon: FiHeart, title: "Who to check in with", text: "Repeated call-outs, overtime streaks and hours dropping off: the early signs someone may leave." },
    ],
    mocks: ["overtime", "budget"],
    calculator: { label: "Hours per resident day calculator", to: "/calculators/hours-per-resident-day-calculator" },
    primary: "start",
  },
  {
    slug: "operators",
    tab: "Regional operators",
    tabShort: "Operators",
    eyebrow: "For regional directors and operators",
    title: "Each building's labor numbers, in your inbox every Monday.",
    subtitle:
      "Hours per resident day against budget, overtime, call-outs and labor cost for each building, emailed every Monday. No login needed. Trends over 12 weeks and a one-page monthly summary for your reviews.",
    points: [
      { icon: FiMail, title: "A Monday email for each building", text: "Sent to the administrator and anyone you add, such as a regional VP without a login." },
      { icon: FiBarChart2, title: "The same measure in every building", text: "Hours per resident day worked out the same way everywhere, with the math shown, so buildings compare fairly." },
      { icon: FiTrendingDown, title: "Is it getting better?", text: "Twelve weeks of hours per resident day, overtime and call-outs, with the change in plain words." },
      { icon: FiFileText, title: "A one-page monthly summary", text: "Print it for the monthly review: key numbers, the budget math, overtime, call-outs and certifications." },
      { icon: FiLock, title: "Pay rates stay private", text: "Dollar figures are for owners and admins only. Schedulers see hours." },
    ],
    mocks: ["email", "trend"],
    calculator: { label: "Schedule coverage calculator", to: "/calculators/schedule-coverage-calculator" },
    primary: "demo",
    note: "Each building runs as its own workspace with its own report. Book a demo and we'll set them up with you.",
  },
];

export const roleBySlug = (slug) => ROLES.find((r) => r.slug === slug) || null;

export const FAQ = [
  {
    q: "Is WiserShifts a staffing agency?",
    a: "No. WiserShifts is software for scheduling and running your own team. We don't supply staff, and we don't take a cut of anyone's hours.",
  },
  {
    q: "Do our staff need an account or an app?",
    a: "No. Each person gets their own link by text or email and sees just their shifts. If they have the app, the link opens it.",
  },
  {
    q: "What does it cost?",
    a: "Free for one scheduler and up to 15 staff. Paid plans add texting, auto-fill, swaps, the time clock and the labor reports, with a 14-day free trial and no card needed.",
  },
  {
    q: "We run several buildings. Does it work for us?",
    a: "Yes. Each building gets its own workspace, Labor page and Monday email, so every administrator and your regional team see their numbers. Book a demo and we'll set them up with you.",
  },
];

