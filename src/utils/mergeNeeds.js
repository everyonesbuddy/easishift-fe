/**
 * Merges rows from "Describe your week" (POST /nl/parse, formType
 * weeklyNeeds) into the Weekly Needs rules.
 *
 * A row matches an existing rule on shift + role + unit area. Its counts are
 * Sunday-first; null means "not mentioned", so the existing number stays (0
 * for a new row). A row that ends up 0 every day is removed (or not added).
 * Returns the new rules and what changed.
 */
const lower = (v) => String(v || "").trim().toLowerCase();
const keyOf = (r) => [lower(r.shiftType), lower(r.shiftTag), lower(r.role), lower(r.unitArea)].join("|");

export function mergeNeeds(rules, rows) {
  const next = rules.map((r) => ({ ...r, countsByWeekday: [...r.countsByWeekday] }));
  const index = new Map(next.map((r, i) => [keyOf(r), i]));
  const removeAt = new Set();
  let added = 0;
  let changed = 0;
  let removed = 0;

  for (const row of rows || []) {
    const counts = row.countsByWeekday || [];
    const at = index.get(keyOf(row));
    if (at !== undefined) {
      const before = next[at].countsByWeekday;
      const after = before.map((n, d) => (counts[d] ?? n));
      if (after.every((n) => n === 0)) {
        if (!removeAt.has(at)) removed += 1;
        removeAt.add(at);
      } else if (after.some((n, d) => n !== before[d])) {
        if (removeAt.delete(at)) removed -= 1;
        next[at] = { ...next[at], countsByWeekday: after };
        changed += 1;
      }
      continue;
    }
    const fresh = Array.from({ length: 7 }, (_, d) => counts[d] ?? 0);
    if (fresh.every((n) => n === 0)) continue;
    next.push({
      shiftType: lower(row.shiftType),
      shiftTag: lower(row.shiftTag),
      role: lower(row.role),
      unitArea: row.unitArea ? lower(row.unitArea) : null,
      requiredCertificationTags: [],
      countsByWeekday: fresh,
    });
    index.set(keyOf(row), next.length - 1);
    added += 1;
  }

  return { rules: next.filter((_, i) => !removeAt.has(i)), added, changed, removed };
}

/** "Added 3 rows, changed 1, removed 1" */
export function describeMerge({ added, changed, removed }) {
  const parts = [];
  if (added) parts.push(`added ${added} row${added === 1 ? "" : "s"}`);
  if (changed) parts.push(`changed ${changed}`);
  if (removed) parts.push(`removed ${removed}`);
  if (!parts.length) return "Nothing changed";
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
