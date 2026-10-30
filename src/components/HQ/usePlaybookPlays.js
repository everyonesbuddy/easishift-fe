// The playbook's plays, for "which play was this?" pickers. Loaded once per page view.
import { useEffect, useState } from "react";
import api from "./hqApi";

let cache = null;
let pending = null;

export const CHANNEL_LABELS = {
  calls: "Calls",
  email: "Cold outreach email",
  linkedin: "LinkedIn",
  newsletter: "Klaviyo (content emails & sequences)",
  youtube: "YouTube",
  blog: "Blog & search",
  facebook: "Facebook groups",
  search: "Search",
  other: "Other",
};
export const AUDIENCES = {
  scheduler: { label: "Schedulers", short: "Scheduler", color: "#34C759" },
  director: { label: "DONs, EDs & administrators", short: "DON / ED", color: "#AF52DE" },
  operator: { label: "Regional operators & owners", short: "Operator", color: "#FF2D55" },
};

export function invalidatePlays() {
  cache = null;
}

export default function usePlaybookPlays() {
  const [plays, setPlays] = useState(cache);
  useEffect(() => {
    if (cache) return undefined;
    let off = false;
    pending =
      pending ||
      api
        .get("/hq/playbook")
        .then((res) => (cache = res.data.plays.map((p) => ({ _id: p._id, title: p.title, channel: p.channel, countsFrom: p.countsFrom }))))
        .finally(() => {
          pending = null;
        });
    pending.then((list) => !off && setPlays(list)).catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return plays || [];
}
