import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeInternshipWorkflow } from "../internship-workflow.service.ts";

describe("Internship Workflow Service (computeInternshipWorkflow)", () => {
  it("Step 1 is the ONLY current step when plan is in draft", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "DRAFT" },
      reports: [],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 1);
    assert.equal(wf.steps[0].status, "current");
    assert.equal(wf.steps[1].status, "upcoming");
    assert.equal(wf.steps[2].status, "upcoming");
    assert.equal(wf.steps[3].status, "upcoming");
    assert.equal(wf.steps[4].status, "upcoming");
    assert.equal(wf.steps[5].status, "upcoming");
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 1);
    assert.equal(wf.loggedHours, 0);
    assert.equal(wf.nextAction.title, "Step 1: Täytä harjoittelusuunnitelma");
  });

  it("Prevents multiple current steps and premature progression if plan is draft even if report was submitted", () => {
    // Regression test for the issue where plan is draft but a submitted report exists
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "DRAFT" },
      reports: [{ status: "SUBMITTED", totalHours: 400, submittedAt: new Date() }],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 1);
    assert.equal(wf.steps[0].status, "current");
    assert.equal(wf.steps[1].status, "upcoming");
    assert.equal(wf.steps[2].status, "upcoming");
    assert.equal(wf.steps[3].status, "upcoming");
    assert.equal(wf.steps[4].status, "upcoming");
    assert.equal(wf.steps[5].status, "upcoming");
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 1);
    assert.equal(wf.loggedHours, 0);
    assert.equal(wf.isReportSubmitted, false, "Report cannot be considered submitted before plan approval");
    assert.equal(wf.nextAction.title, "Step 1: Täytä harjoittelusuunnitelma");
  });

  it("Step 2 is current when plan is submitted and waiting for review", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "SUBMITTED", submittedAt: new Date() },
      reports: [],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 2);
    assert.equal(wf.steps[0].status, "done");
    assert.equal(wf.steps[1].status, "current");
    assert.equal(wf.steps[2].status, "upcoming");
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 1);
    assert.equal(wf.nextAction.title, "Step 2: Suunnitelma odottaa hyväksyntää");
  });

  it("Step 3 is current when plan is approved and internship is active", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() },
      reports: [],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 3);
    assert.equal(wf.steps[0].status, "done");
    assert.equal(wf.steps[1].status, "done");
    assert.equal(wf.steps[2].status, "current");
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 1);
    assert.equal(wf.nextAction.title, "Step 3: Harjoittelu käynnissä");
  });

  it("Step 5 is current when plan is approved and report is submitted", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() },
      reports: [{ status: "SUBMITTED", totalHours: 400, submittedAt: new Date() }],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 5);
    assert.equal(wf.steps[0].status, "done");
    assert.equal(wf.steps[1].status, "done");
    assert.equal(wf.steps[2].status, "done");
    assert.equal(wf.steps[3].status, "done");
    assert.equal(wf.steps[4].status, "current");
    assert.equal(wf.steps[5].status, "upcoming");
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 1);
    assert.equal(wf.loggedHours, 400);
    assert.equal(wf.nextAction.title, "Step 5: Ohjaajan tarkistus käynnissä");
  });

  it("Step 6 is current when teacher has approved report", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() },
      reports: [{ status: "APPROVED", totalHours: 400, submittedAt: new Date() }],
      guidanceEvaluation: null,
    });

    assert.equal(wf.currentStepNumber, 6);
    assert.equal(wf.steps[4].status, "done");
    assert.equal(wf.steps[5].status, "current");
    assert.equal(wf.isEvaluationLocked, false);
    assert.equal(wf.nextAction.title, "Step 6: Harjoittelun ohjauksen arviointi");
  });

  it("All 6 steps are done when guidance evaluation is submitted", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() },
      reports: [{ status: "APPROVED", totalHours: 400, submittedAt: new Date() }],
      guidanceEvaluation: { status: "SUBMITTED" },
    });

    assert.equal(wf.currentStepNumber, 6);
    assert.ok(wf.steps.every((s) => s.status === "done"));
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 0);
  });
});
