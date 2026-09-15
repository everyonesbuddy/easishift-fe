export function getDisplayTimeZone(facilityPreferences) {
  return facilityPreferences?.facilityTimezoneConfirmed &&
    facilityPreferences?.facilityTimezone
    ? facilityPreferences.facilityTimezone
    : undefined;
}

// IANA zone abbreviation (e.g. "EDT") for a given instant, DST-aware.
export function getTimeZoneAbbreviation(date = new Date(), timeZone) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

export function getTimeZoneDayKey(date, timeZone) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getTimeZoneDateTimeValue(date, timeZone) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  if (!timeZone) return value.toISOString();

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

export function formatInTimeZone(date, options = {}, timeZone) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString(undefined, {
    ...options,
    ...(timeZone ? { timeZone } : {}),
  });
}

export function getLocalTimeZoneAbbreviation(date = new Date()) {
  return getTimeZoneAbbreviation(date);
}
