// First visit's marketing source (UTMs, the site that sent them, the page
// they landed on), kept in this browser so signups and calculator emails can
// say where people came from. Best effort: storage can be blocked.

const KEY = "ws_first_touch";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};

/** Build the record for a visit (pure; tested). */
export function firstTouchFrom(href, referrer = "") {
  const url = new URL(href);
  const out = { landingPage: url.pathname, firstSeenAt: new Date().toISOString() };
  for (const k of UTM) {
    const v = url.searchParams.get(k);
    if (v) out[k] = v.slice(0, 100);
  }
  try {
    const ref = referrer ? new URL(referrer) : null;
    // Only other sites; our own pages aren't a source.
    if (ref && ref.hostname !== url.hostname && !/(^|\.)wisershifts\.com$|(^|\.)easishift\.com$/.test(ref.hostname)) {
      out.referrer = `${ref.origin}/`;
    }
  } catch {
    // ignore bad referrers
  }
  return out;
}

/** Call on every page load: keeps the first visit, and the first UTM'd visit if the first had none. */
export function captureFirstTouch() {
  if (typeof window === "undefined") return;
  try {
    const now = firstTouchFrom(window.location.href, document.referrer);
    const prev = read();
    if (!prev || (!prev.utm_source && now.utm_source)) {
      localStorage.setItem(KEY, JSON.stringify(prev ? { ...prev, ...now, landingPage: prev.landingPage } : now));
    }
  } catch {
    // storage blocked; nothing to keep
  }
}

export const getFirstTouch = () => read();

/** Role guessed from the role page they first landed on (for the signup form). */
export function roleFromLanding(touch) {
  const m = String(touch?.landingPage || "").match(/^\/for\/(schedulers|directors|operators)/);
  return m ? { schedulers: "scheduler", directors: "don", operators: "regional" }[m[1]] : "";
}
