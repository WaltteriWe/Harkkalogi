import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_6_STEPS, calculateInternshipSteps } from "../../hooks/steps.js";

describe("steps: DEFAULT_6_STEPS structure and calculateInternshipSteps", () => {
  it("defines the 6 expected steps in order", () => {
    assert.equal(DEFAULT_6_STEPS.length, 6);
    assert.equal(DEFAULT_6_STEPS[0].title, "Plan submitted");
    assert.equal(DEFAULT_6_STEPS[0].href, "/planning");
    assert.equal(DEFAULT_6_STEPS[1].title, "Plan approved");
    assert.equal(DEFAULT_6_STEPS[1].href, "/planning");
    assert.equal(DEFAULT_6_STEPS[2].title, "Internship in progress");
    assert.equal(DEFAULT_6_STEPS[2].href, "/");
    assert.equal(DEFAULT_6_STEPS[3].title, "Report & work certificate");
    assert.equal(DEFAULT_6_STEPS[3].href, "/reports");
    assert.equal(DEFAULT_6_STEPS[4].title, "Teacher approval");
    assert.equal(DEFAULT_6_STEPS[4].href, "/reports");
    assert.equal(DEFAULT_6_STEPS[5].title, "Guidance evaluation");
    assert.equal(DEFAULT_6_STEPS[5].href, "/guidance-evaluation");
  });

  it("calculates progress percentage and current step correctly", () => {
    // In DEFAULT_6_STEPS, steps 1 and 2 are done (2/6 = 33%)
    const result = calculateInternshipSteps(DEFAULT_6_STEPS);
    assert.equal(result.total, 6);
    assert.equal(result.doneCount, 2);
    assert.equal(result.progress, 33);
    assert.equal(result.currentIndex, 2);
    assert.equal(result.currentStep?.title, "Internship in progress");
  });
});
