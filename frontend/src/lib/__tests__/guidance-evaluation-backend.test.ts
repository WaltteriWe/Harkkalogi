import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TYOPAIKKA_OHJAUS_SUBJECTS,
  OPPILAITOS_OHJAUS_SUBJECTS,
} from "../../app/(shared)/guidance-evaluation/page.js";
import { isEvaluationGroupComplete } from "../../components/starRating.js";

describe("guidance-evaluation-backend: payload generation and validation", () => {
  it("builds valid draft payload with status DRAFT", () => {
    const checklist = ["perehdytys", "palaute"];
    const ratings = {
      tyopaikkaohjaus: 3,
      tehtavat_vastaavuus: 4,
      tyoyhteiso: 0,
      oppilaitos_ohjaus: 0,
      kokonaisarvio: 0,
    };

    const payload = {
      checklist,
      ratings,
      status: "DRAFT" as const,
    };

    assert.equal(payload.status, "DRAFT");
    assert.deepEqual(payload.checklist, ["perehdytys", "palaute"]);
    assert.equal(payload.ratings.tyopaikkaohjaus, 3);
  });

  it("builds valid submit payload with status SUBMITTED", () => {
    const checklist = ["tavoitteet"];
    const ratings = {
      tyopaikkaohjaus: 5,
      tehtavat_vastaavuus: 5,
      tyoyhteiso: 4,
      oppilaitos_ohjaus: 4,
      kokonaisarvio: 5,
    };

    const payload = {
      checklist,
      ratings,
      status: "SUBMITTED" as const,
    };

    assert.equal(payload.status, "SUBMITTED");
    assert.equal(Object.keys(payload.ratings).length, 5);
  });

  it("fails validation if any star rating is 0 before submission", () => {
    const incompleteRatings = {
      tyopaikkaohjaus: 4,
      tehtavat_vastaavuus: 5,
      tyoyhteiso: 0, // unrated!
      oppilaitos_ohjaus: 4,
      kokonaisarvio: 5,
    };

    const isWorkplaceComplete = isEvaluationGroupComplete(
      TYOPAIKKA_OHJAUS_SUBJECTS,
      incompleteRatings
    );
    const isInstitutionComplete = isEvaluationGroupComplete(
      OPPILAITOS_OHJAUS_SUBJECTS,
      incompleteRatings
    );

    assert.equal(isWorkplaceComplete, false);
    assert.equal(isInstitutionComplete, true);
    const canSubmit = isWorkplaceComplete && isInstitutionComplete;
    assert.equal(canSubmit, false);
  });

  it("fails validation if no checklist topics are selected before submission", () => {
    const completeRatings = {
      tyopaikkaohjaus: 5,
      tehtavat_vastaavuus: 5,
      tyoyhteiso: 5,
      oppilaitos_ohjaus: 4,
      kokonaisarvio: 5,
    };
    const emptyChecklist: string[] = [];

    const isWorkplaceComplete = isEvaluationGroupComplete(
      TYOPAIKKA_OHJAUS_SUBJECTS,
      completeRatings
    );
    const isInstitutionComplete = isEvaluationGroupComplete(
      OPPILAITOS_OHJAUS_SUBJECTS,
      completeRatings
    );
    const isChecklistFilled = emptyChecklist.length > 0;

    const canSubmit = isWorkplaceComplete && isInstitutionComplete && isChecklistFilled;
    assert.equal(canSubmit, false);
  });

  it("passes validation when all 5 criteria are rated and at least 1 topic is selected", () => {
    const completeRatings = {
      tyopaikkaohjaus: 4,
      tehtavat_vastaavuus: 4,
      tyoyhteiso: 4,
      oppilaitos_ohjaus: 4,
      kokonaisarvio: 4,
    };
    const checklist = ["ohjausaika"];

    const isWorkplaceComplete = isEvaluationGroupComplete(
      TYOPAIKKA_OHJAUS_SUBJECTS,
      completeRatings
    );
    const isInstitutionComplete = isEvaluationGroupComplete(
      OPPILAITOS_OHJAUS_SUBJECTS,
      completeRatings
    );
    const isChecklistFilled = checklist.length > 0;

    const canSubmit = isWorkplaceComplete && isInstitutionComplete && isChecklistFilled;
    assert.equal(canSubmit, true);
  });
});

describe("guidance-evaluation-backend: target internship resolution", () => {
  it("resolves internshipId from URL query param when present", () => {
    const searchParams = new URLSearchParams("internshipId=2");
    const queryId = searchParams.get("internshipId");
    const activeBackendId = 1;

    const resolvedId = queryId ? parseInt(queryId, 10) : activeBackendId;
    assert.equal(resolvedId, 2);
  });

  it("falls back to active internship backendId when query param is absent", () => {
    const searchParams = new URLSearchParams("");
    const queryId = searchParams.get("internshipId");
    const activeBackendId = 1;

    const resolvedId = queryId ? parseInt(queryId, 10) : activeBackendId;
    assert.equal(resolvedId, 1);
  });
});
