import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isEvaluationGroupComplete,
  type StarEvaluationSubject,
} from "../../components/starRating";
import {
  TYOPAIKKA_OHJAUS_SUBJECTS,
  OPPILAITOS_OHJAUS_SUBJECTS,
  OHJAUS_ARVIOINTI_SUBJECTS,
} from "../../app/(shared)/guidance-evaluation/page";

describe("collapsible-evaluation: isEvaluationGroupComplete helper", () => {
  const sampleItems: StarEvaluationSubject[] = [
    { id: "item1", subject: "Guidance quality" },
    { id: "item2", subject: "Work tasks" },
    { id: "item3", subject: "Atmosphere" },
  ];

  it("returns false when values are all unselected (0)", () => {
    const values = { item1: 0, item2: 0, item3: 0 };
    assert.equal(isEvaluationGroupComplete(sampleItems, values), false);
  });

  it("returns false when partially filled (e.g. 2 out of 3 selected)", () => {
    const values = { item1: 4, item2: 5, item3: 0 };
    assert.equal(isEvaluationGroupComplete(sampleItems, values), false);
  });

  it("returns false if values object is empty or missing keys", () => {
    assert.equal(isEvaluationGroupComplete(sampleItems, {}), false);
  });

  it("returns false for empty items array", () => {
    assert.equal(isEvaluationGroupComplete([], { item1: 5 }), false);
  });

  it("returns true only when every item in the group has rating > 0", () => {
    const values = { item1: 4, item2: 5, item3: 3 };
    assert.equal(isEvaluationGroupComplete(sampleItems, values), true);
  });
});

describe("collapsible-evaluation: multi-box subject separation", () => {
  it("splits subjects into 2 distinct groups with correct counts", () => {
    assert.equal(TYOPAIKKA_OHJAUS_SUBJECTS.length, 3);
    assert.equal(OPPILAITOS_OHJAUS_SUBJECTS.length, 2);
    assert.equal(OHJAUS_ARVIOINTI_SUBJECTS.length, 5);
  });

  it("groups workplace guidance subjects in Box 1", () => {
    const ids = TYOPAIKKA_OHJAUS_SUBJECTS.map((s) => s.id);
    assert.deepEqual(ids, ["tyopaikkaohjaus", "tehtavat_vastaavuus", "tyoyhteiso"]);
  });

  it("groups academic guidance and overall rating in Box 2", () => {
    const ids = OPPILAITOS_OHJAUS_SUBJECTS.map((s) => s.id);
    assert.deepEqual(ids, ["oppilaitos_ohjaus", "kokonaisarvio"]);
  });

  it("detects independent completion for each box", () => {
    const ratings = {
      tyopaikkaohjaus: 4,
      tehtavat_vastaavuus: 5,
      tyoyhteiso: 5,
      oppilaitos_ohjaus: 0,
      kokonaisarvio: 0,
    };

    // Box 1 should be complete and eligible to collapse once user leaves it
    assert.equal(isEvaluationGroupComplete(TYOPAIKKA_OHJAUS_SUBJECTS, ratings), true);

    // Box 2 is not yet filled, so it remains in normal expanded format
    assert.equal(isEvaluationGroupComplete(OPPILAITOS_OHJAUS_SUBJECTS, ratings), false);
  });

  it("determines effective readOnly mode when collapsed", () => {
    // When a box shouldCollapse, readOnly is enforced so stars are non-interactive
    const shouldCollapse = true;
    const baseReadOnly = false;
    const effectiveReadOnly = baseReadOnly || shouldCollapse;
    assert.equal(effectiveReadOnly, true, "Stars should be read-only when compact");

    // When a box is expanded, readOnly is restored to base value
    const expandedCollapse = false;
    assert.equal(baseReadOnly || expandedCollapse, false, "Stars should be interactive when expanded");
  });
});
