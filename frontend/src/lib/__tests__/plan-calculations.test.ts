import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDurationWeeks,
  calculateEstimatedHours,
  calculateEstimatedCredits,
} from "../plan-calculations";

describe("plan-calculations engine", () => {
  it("calculates 10.9 weeks and 409 hours for reference scenario (Sept 1 to Nov 15, 2026, Full-Time)", () => {
    const weeks = calculateDurationWeeks("2026-09-01", "2026-11-15");
    assert.equal(weeks, 10.9);

    const hours = calculateEstimatedHours(weeks, "FULL_TIME");
    assert.equal(hours, 409);

    const credits = calculateEstimatedCredits(hours, "h1");
    assert.equal(credits.credits, 15.0);
    assert.equal(credits.targetCredits, 15.0);
    assert.equal(credits.isMet, true);
  });

  it("calculates part-time workload at 20 h/wk yielding 218 hours and 8.1 credits", () => {
    const weeks = 10.9;
    const hours = calculateEstimatedHours(weeks, "PART_TIME", 20);
    assert.equal(hours, 218);

    const credits = calculateEstimatedCredits(hours, "h1");
    assert.equal(credits.credits, 8.1);
    assert.equal(credits.targetCredits, 15.0);
    assert.equal(credits.isMet, false);
  });

  it("returns 0 for invalid, empty, or reversed dates", () => {
    assert.equal(calculateDurationWeeks("", ""), 0);
    assert.equal(calculateDurationWeeks(null, null), 0);
    assert.equal(calculateDurationWeeks("2026-11-15", "2026-09-01"), 0);
    assert.equal(calculateDurationWeeks("not-a-date", "2026-11-15"), 0);

    const hours = calculateEstimatedHours(0, "FULL_TIME");
    assert.equal(hours, 0);

    const credits = calculateEstimatedCredits(0, "h1");
    assert.equal(credits.credits, 0);
    assert.equal(credits.isMet, false);
  });

  it("handles combined scope with 30.0 target credits", () => {
    const hours = 850;
    const credits = calculateEstimatedCredits(hours, "combined");
    assert.equal(credits.credits, 30.0);
    assert.equal(credits.targetCredits, 30.0);
    assert.equal(credits.isMet, true);
  });
});
