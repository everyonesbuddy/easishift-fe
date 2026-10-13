// Why a text/email didn't reach someone (reason codes from the backend).
export const NOT_SENT_REASONS = {
  no_contact: "no phone or email on file",
  opted_out: "replied STOP to texts",
  sms_needs_pro: "phone only; texting is on Pro",
  awaiting_opt_in: "hasn't replied START to our opt-in text yet",
  notifications_off: "turned notifications off",
  send_failed: "the message failed to send",
};

export const notSentReason = (code) =>
  NOT_SENT_REASONS[code] || "couldn't be reached";

// Why someone can't take a particular shift (eligibility reasons).
export const INELIGIBLE_REASONS = {
  role: "different role",
  area: "not set up for this area",
  shift_type: "doesn't work this shift",
  certification: "missing certification",
  already_assigned: "already on this shift",
  called_out: "called out of this shift",
  conflict: "working another shift then",
  time_off: "on time off",
};

export const ineligibleReason = (code) =>
  INELIGIBLE_REASONS[code] || String(code || "").replace(/_/g, " ");
