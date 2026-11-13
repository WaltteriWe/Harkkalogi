import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toggleItemInSelection } from "@/components/checkboxGroup";
import { getStarNumbers, resolveStarLabel } from "@/components/starRating";

describe("guidance-components: toggleItemInSelection", () => {
  it("adds an item to an empty selection", () => {
    const result = toggleItemInSelection([], "orientation");
    assert.deepEqual(result, ["orientation"]);
  });

  it("adds an item to an existing selection without duplicating", () => {
    const initial = ["orientation"];
    const result = toggleItemInSelection(initial, "feedback");
    assert.deepEqual(result, ["orientation", "feedback"]);
  });

  it("removes an item from selection if already present", () => {
    const initial = ["orientation", "feedback", "workload"];
    const result = toggleItemInSelection(initial, "feedback");
    assert.deepEqual(result, ["orientation", "workload"]);
  });

  it("removes the sole remaining item leaving an empty array", () => {
    const initial = ["orientation"];
    const result = toggleItemInSelection(initial, "orientation");
    assert.deepEqual(result, []);
  });
});

describe("guidance-components: getStarNumbers", () => {
  it("defaults to 5 stars when no argument is passed", () => {
    const stars = getStarNumbers();
    assert.deepEqual(stars, [1, 2, 3, 4, 5]);
  });

  it("generates exact number of stars when requested", () => {
    assert.deepEqual(getStarNumbers(3), [1, 2, 3]);
    assert.deepEqual(getStarNumbers(7), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(getStarNumbers(10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("clamps minimum to 1 star for non-positive numbers", () => {
    assert.deepEqual(getStarNumbers(0), [1]);
    assert.deepEqual(getStarNumbers(-5), [1]);
  });

  it("clamps maximum to 20 stars for overly large inputs", () => {
    const stars = getStarNumbers(50);
    assert.equal(stars.length, 20);
    assert.equal(stars[0], 1);
    assert.equal(stars[19], 20);
  });
});

describe("guidance-components: resolveStarLabel", () => {
  const sampleLabels = ["Heikko", "Välttävä", "Tyydyttävä", "Hyvä", "Kiitettävä"];

  it("resolves label from array based on star number", () => {
    assert.equal(resolveStarLabel(1, sampleLabels), "Heikko");
    assert.equal(resolveStarLabel(3, sampleLabels), "Tyydyttävä");
    assert.equal(resolveStarLabel(5, sampleLabels), "Kiitettävä");
  });

  it("returns undefined for star 0 or out of range", () => {
    assert.equal(resolveStarLabel(0, sampleLabels), undefined);
    assert.equal(resolveStarLabel(6, sampleLabels), undefined);
  });

  it("resolves from Record dictionary", () => {
    const record = { 1: "Poor", 5: "Excellent" };
    assert.equal(resolveStarLabel(1, record), "Poor");
    assert.equal(resolveStarLabel(5, record), "Excellent");
    assert.equal(resolveStarLabel(3, record), undefined);
  });

  it("falls back to minLabel on star 1 and maxLabel on maxStars", () => {
    assert.equal(
      resolveStarLabel(1, undefined, "1 = Ei vastannut", "5 = Vastasi täysin", 5),
      "Ei vastannut"
    );
    assert.equal(
      resolveStarLabel(5, undefined, "1 = Ei vastannut", "5 = Vastasi täysin", 5),
      "Vastasi täysin"
    );
    assert.equal(
      resolveStarLabel(3, undefined, "1 = Ei vastannut", "5 = Vastasi täysin", 5),
      undefined
    );
  });
});

describe("guidance-components: sidebar completion calculation", () => {
  const subjects = [
    { id: "s1", subject: "Subject 1" },
    { id: "s2", subject: "Subject 2" },
  ];

  it("calculates rated subject count accurately", () => {
    const ratings: Record<string, number> = { s1: 4, s2: 0 };
    const ratedCount = subjects.filter((s) => (ratings[s.id] ?? 0) > 0).length;
    assert.equal(ratedCount, 1);
  });

  it("identifies fully completed section", () => {
    const ratings: Record<string, number> = { s1: 4, s2: 5 };
    const ratedCount = subjects.filter((s) => (ratings[s.id] ?? 0) > 0).length;
    assert.equal(ratedCount, 2);
  });
});

