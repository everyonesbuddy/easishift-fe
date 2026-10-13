// Canonical form for unit areas and certification tags, matching the
// backend: "Memory Care", "memory care" and "memory_care" are one tag.
export const tagKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
