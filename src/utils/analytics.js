const ROOT_DOMAINS = ["wisershifts.com", "easishift.com"];
const CAMPAIGN_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
];
const PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/calculators",
  "/contact",
  "/integrations",
  "/login",
  "/signup-tenant",
  "/terms-and-conditions",
  "/privacy-policy",
  "/eula",
  "/calculators/call-out-cost-calculator",
  "/calculators/overtime-cost-calculator",
  "/calculators/time-clock-accuracy-calculator",
]);
const PAGE_AREAS = {
  "/": "home",
  "/login": "login",
  "/signup-tenant": "signup",
  "/dashboard": "dashboard",
  "/billing": "billing",
  "/billing/success": "billing",
  "/billing/cancel": "billing",
  "/schedule": "schedule",
  "/coverage-planning": "coverage",
  "/staffs": "staff_management",
  "/timeoff-decisions": "time_off",
  "/timeoff-requests": "time_off",
  "/swap-requests": "shift_swaps",
  "/messages": "messages",
  "/preferences": "preferences",
  "/facility-preferences": "facility_settings",
  "/tenant-branding": "workspace_branding",
  "/time-tracking": "time_tracking",
  "/payroll-exports": "payroll_exports",
  "/how-to-use": "help",
};
let measurementId;
let lastPage;
let lastPageKey;

export function isAnalyticsHost(hostname) {
  return ROOT_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function getAnalyticsUrl(value) {
  const url = new URL(value);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const safePath =
    PUBLIC_PATHS.has(path) || /^\/features\/[a-z0-9-]+$/.test(path)
      ? path
      : "/portal";
  const safeUrl = new URL(safePath, url.origin);
  if (safePath !== "/portal") {
    CAMPAIGN_PARAMETERS.forEach((parameter) => {
      const value = url.searchParams.get(parameter);
      if (value) safeUrl.searchParams.set(parameter, value.slice(0, 100));
    });
  }
  return safeUrl.href;
}

export function getAnalyticsPageContext(value) {
  const url = new URL(value);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const pageLocation = getAnalyticsUrl(value);
  const workspaceHost =
    ROOT_DOMAINS.some(
      (domain) =>
        url.hostname.endsWith(`.${domain}`) && url.hostname !== `www.${domain}`,
    ) || url.hostname.endsWith(".localhost");
  return {
    page_location: pageLocation,
    site_area: workspaceHost ? "workspace" : "main_site",
    page_area:
      PAGE_AREAS[path] ||
      (path.startsWith("/features/")
        ? "features"
        : path.startsWith("/calculators/")
          ? "calculators"
          : PUBLIC_PATHS.has(path)
            ? path.slice(1).replaceAll("-", "_")
            : "portal"),
    page_title:
      new URL(pageLocation).pathname === "/portal"
        ? "WiserShifts workspace"
        : "WiserShifts",
  };
}

function getPageParameters() {
  return getAnalyticsPageContext(window.location.href);
}

export function trackEvent(name, parameters = {}) {
  if (!measurementId || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", name, {
      ...getPageParameters(),
      ...parameters,
      send_to: measurementId,
    });
  } catch {
    return;
  }
}

export function trackPageView() {
  if (!measurementId) return;
  const parameters = getPageParameters();
  const pageLocation = parameters.page_location;
  const pageKey = `${pageLocation}|${parameters.page_area}`;
  if (lastPageKey === pageKey) return;
  const pageReferrer =
    lastPage || (document.referrer ? getAnalyticsUrl(document.referrer) : "");
  lastPage = pageLocation;
  lastPageKey = pageKey;
  window.gtag("set", {
    ...parameters,
    page_referrer: pageReferrer,
  });
  trackEvent("page_view", { page_referrer: pageReferrer });
}

function trackLinkClick(event) {
  const anchor = event.target?.closest?.("a[href]");
  if (!anchor) return;
  const target = new URL(anchor.href, window.location.href);
  const sourcePath = new URL(getAnalyticsUrl(window.location.href)).pathname;
  if (target.hostname === "calendly.com") {
    trackEvent("book_demo_click", { cta_path: sourcePath });
  } else if (target.origin === window.location.origin) {
    if (target.pathname === "/signup-tenant") {
      trackEvent("signup_click", { cta_path: sourcePath });
    } else if (target.pathname === "/login") {
      trackEvent("login_click", { cta_path: sourcePath });
    }
  }
}

export function initializeAnalytics({ enabled, id, debug = false }) {
  if (!enabled || !/^G-[A-Z0-9]+$/.test(id || "") || measurementId) return;
  measurementId = id;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false,
    ...getPageParameters(),
    page_referrer: document.referrer ? getAnalyticsUrl(document.referrer) : "",
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(debug ? { debug_mode: true } : {}),
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  document.addEventListener("click", trackLinkClick, true);
  document.addEventListener(
    "auxclick",
    (event) => {
      if (event.button === 1) trackLinkClick(event);
    },
    true,
  );
}
