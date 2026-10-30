// Small helpers for the playbook screens.
import { toast } from "react-toastify";

export const COUNTS = {
  activities: "Touches logged with this play",
  content: "Content published for this play",
  leads: "Calculator emails",
  signups: "Workspace signups",
  none: "Not counted",
};
export const weekLabel = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtTarget = (t) => (t === null || t === undefined ? "–" : t < 1 ? `1 every ${Math.round(1 / t)} weeks` : String(t));
const unitFor = (t, unit = "") => (t === 1 && /s$/.test(unit) && !/ss$/.test(unit) ? unit.slice(0, -1) : unit);
export const targetText = (p) => (p.weeklyTarget < 1 ? fmtTarget(p.weeklyTarget) : `${fmtTarget(p.weeklyTarget)} ${unitFor(p.weeklyTarget, p.targetUnit)}`);
/** "60 calls a week", "1 every 2 weeks". */
export const targetSentence = (p) => (p.weeklyTarget < 1 ? targetText(p) : `${targetText(p)} a week`);


export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.info("Couldn't copy; select the text instead");
  }
};

