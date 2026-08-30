// Browser's IANA zone abbreviation (e.g. "EDT") for a given instant, DST-aware.
export function getLocalTimeZoneAbbreviation(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}
