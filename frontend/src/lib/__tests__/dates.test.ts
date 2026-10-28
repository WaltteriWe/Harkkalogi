import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatPeriod } from "../dates.js";

describe("dates: formatDate", () => {
  it("formats ISO dates in Finnish style without leading zeros", () => {
    assert.equal(formatDate("2026-06-01"), "1.6.2026");
    assert.equal(formatDate("2026-11-30"), "30.11.2026");
  });

  it("returns an empty string for empty or malformed input", () => {
    assert.equal(formatDate(""), "");
    assert.equal(formatDate("1.6.2026"), "");
  });
});

describe("dates: formatPeriod", () => {
  it("joins start and end with an en dash", () => {
    assert.equal(formatPeriod("2026-06-01", "2026-11-30"), "1.6.2026 – 30.11.2026");
  });

  it("returns an empty string when both dates are empty", () => {
    assert.equal(formatPeriod("", ""), "");
  });
});
