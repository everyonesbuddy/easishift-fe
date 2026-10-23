/**
 * Merges rows from "Describe your week" (POST /nl/parse, formType
 * weeklyNeeds) into the Weekly Needs rules.
 *
 * The only change ever made to an existing rule is its numbers: when a row
 * has the same shift, role and unit area, the days it mentions get the new
 * counts (null = not mentioned, keep). Area, certifications and every other
 * rule are left alone, and nothing is ever deleted (a row set to 0 stays,
 * with zeros, for the scheduler to remove by hand). Any other row is added;
 * a new row that would be 0 every day isn't.
 */
const lower = (v) => String(v || "").trim().toLowerCase();
const keyOf = (r) => [lower(r.shiftType), lower(r.shiftTag), lower(r.role), lower(r.unitArea)].join("|");

export function mergeNeeds(rules, rows) {
  const next = rules.map((r) => ({ ...r, countsByWeekday: [...r.countsByWeekday] }));
  const index = new Map(next.map((r, i) => [keyOf(r), i]));
  const changedAt = new Set();
  let added = 0;

  for (const row of rows || []) {
    const counts = row.countsByWeekday || [];
    const at = index.get(keyOf(row));
    if (at !== undefined) {
      const before = next[at].countsByWeekday;
      const after = before.map((n, d) => (counts[d] ?? n));
      if (after.some((n, d) => n !== before[d])) {
        next[at] = { ...next[at], countsByWeekday: after };
        if (at < rules.length) changedAt.add(at);
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

  return { rules: next, added, changed: changedAt.size };
}

/** "Added 3 rows, updated the numbers on 1" */
export function describeMerge({ added, changed }) {
  const parts = [];
  if (added) parts.push(`added ${added} row${added === 1 ? "" : "s"}`);
  if (changed) parts.push(`updated the numbers on ${changed}`);
  if (!parts.length) return "Nothing changed";
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
