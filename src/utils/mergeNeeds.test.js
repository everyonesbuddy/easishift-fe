import test from "node:test";
import assert from "node:assert/strict";
import { mergeNeeds, describeMerge } from "./mergeNeeds.js";

const rule = (role, counts, extra = {}) => ({
  shiftType: "day",
  shiftTag: "day_8h",
  role,
  unitArea: null,
  requiredCertificationTags: [],
  countsByWeekday: counts,
  ...extra,
});
const row = (role, counts, extra = {}) => ({ shiftType: "day", shiftTag: "day_8h", role, unitArea: null, countsByWeekday: counts, ...extra });
const N = null;

test("adds new rows; days not mentioned start at 0", () => {
  const out = mergeNeeds([], [row("cna", [3, 4, 4, 4, 4, 4, 3]), row("nurse", [N, 1, 1, 1, 1, 1, N])]);
  assert.equal(out.added, 2);
  assert.deepEqual(out.rules[1].countsByWeekday, [0, 1, 1, 1, 1, 1, 0]);
  assert.deepEqual(out.rules[1].requiredCertificationTags, []);
});

test("changes only the days mentioned and keeps everything else on the row", () => {
  const rules = [rule("cna", [3, 4, 4, 4, 4, 4, 3], { requiredCertificationTags: ["dementia"] })];
  const out = mergeNeeds(rules, [row("CNA", [N, N, N, N, N, N, 2])]);
  assert.equal(out.changed, 1);
  assert.deepEqual(out.rules[0].countsByWeekday, [3, 4, 4, 4, 4, 4, 2]);
  assert.deepEqual(out.rules[0].requiredCertificationTags, ["dementia"]);
  assert.deepEqual(rules[0].countsByWeekday, [3, 4, 4, 4, 4, 4, 3], "input not mutated");
});

test("never deletes: zeros on an existing row stay as zeros; a new all-zero row is ignored", () => {
  const out = mergeNeeds([rule("cna", [1, 1, 1, 1, 1, 1, 1]), rule("nurse", [1, 1, 1, 1, 1, 1, 1])], [
    row("nurse", [0, 0, 0, 0, 0, 0, 0]),
    row("med_tech", [0, 0, 0, 0, 0, 0, 0]),
  ]);
  assert.deepEqual(out.rules.map((r) => r.role), ["cna", "nurse"]);
  assert.deepEqual(out.rules[1].countsByWeekday, [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(out.changed, 1);
  assert.equal(out.added, 0);
});

test("only numbers change on an existing row: area and certifications untouched", () => {
  const rules = [rule("cna", [2, 2, 2, 2, 2, 2, 2], { unitArea: "memory care", requiredCertificationTags: ["dementia"] })];
  const out = mergeNeeds(rules, [row("cna", [3, 3, 3, 3, 3, 3, 3], { unitArea: "Memory Care" })]);
  assert.equal(out.rules.length, 1);
  assert.deepEqual(out.rules[0], { ...rules[0], countsByWeekday: [3, 3, 3, 3, 3, 3, 3] });
});

test("a different unit area is a different row", () => {
  const out = mergeNeeds([rule("cna", [1, 1, 1, 1, 1, 1, 1])], [row("cna", [2, 2, 2, 2, 2, 2, 2], { unitArea: "Memory Care" })]);
  assert.equal(out.rules.length, 2);
  assert.equal(out.rules[1].unitArea, "memory care");
});

test("same numbers again counts as no change", () => {
  const out = mergeNeeds([rule("cna", [1, 1, 1, 1, 1, 1, 1])], [row("cna", [1, N, N, N, N, N, N])]);
  assert.equal(describeMerge(out), "Nothing changed");
  assert.equal(describeMerge({ added: 3, changed: 1 }), "Added 3 rows, updated the numbers on 1");
});
