import test from "node:test";
import assert from "node:assert/strict";
import { firstTouchFrom, roleFromLanding } from "./firstTouch.js";

test("first touch keeps UTMs, landing page and outside referrers only", () => {
  const t = firstTouchFrom("https://wisershifts.com/for/directors?utm_source=linkedin&utm_campaign=oct", "https://www.linkedin.com/feed/");
  assert.equal(t.landingPage, "/for/directors");
  assert.equal(t.utm_source, "linkedin");
  assert.equal(t.utm_campaign, "oct");
  assert.equal(t.referrer, "https://www.linkedin.com/");
  assert.equal(firstTouchFrom("https://wisershifts.com/pricing", "https://wisershifts.com/").referrer, undefined);
});

test("signup role guessed from the role page they landed on", () => {
  assert.equal(roleFromLanding({ landingPage: "/for/schedulers" }), "scheduler");
  assert.equal(roleFromLanding({ landingPage: "/for/operators" }), "regional");
  assert.equal(roleFromLanding({ landingPage: "/" }), "");
  assert.equal(roleFromLanding(null), "");
});
