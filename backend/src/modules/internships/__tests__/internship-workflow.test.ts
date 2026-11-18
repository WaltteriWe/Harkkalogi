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

    assert.equal(wf.stage, "PLAN_DRAFT");
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

    assert.equal(wf.stage, "PLAN_DRAFT");
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

    assert.equal(wf.stage, "PLAN_SUBMITTED");
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

    assert.equal(wf.stage, "IN_PROGRESS");
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

    assert.equal(wf.stage, "REPORT_SUBMITTED");
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

    assert.equal(wf.stage, "EVALUATION_PENDING");
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

    assert.equal(wf.stage, "COMPLETED");
    assert.equal(wf.currentStepNumber, 6);
    assert.equal(wf.isEvaluationSubmitted, true);
    assert.ok(wf.steps.every((s) => s.status === "done"));
    assert.equal(wf.steps.filter((s) => s.status === "current").length, 0);
    assert.equal(wf.nextAction.title, "Harjoittelu suoritettu");
    assert.equal(wf.nextAction.actionHref, "/report");
  });

  it("Step 4 is current when plan is approved and time/hours have elapsed (Eetu H2 scenario)", () => {
    const wf = computeInternshipWorkflow({
      id: 2,
      title: "Harjoittelu 2",
      requiredHours: 400,
      plan: {
        scope: "h2",
        status: "APPROVED",
        submittedAt: new Date("2026-04-25"),
        approvedAt: new Date("2026-04-28"),
      },
      reports: [{ totalHours: 400, status: "DRAFT" }], // 400 h elapsed, report ready to write
      guidanceEvaluation: null,
    });

    assert.equal(wf.stage, "REPORT_READY");
    assert.equal(wf.currentStepNumber, 4);
    assert.equal(wf.isPlanApproved, true);
    assert.equal(wf.isReportSubmitted, false);
    assert.equal(wf.isEvaluationSubmitted, false);
    assert.equal(wf.steps[0].status, "done"); // Plan submitted
    assert.equal(wf.steps[1].status, "done"); // Plan approved
    assert.equal(wf.steps[2].status, "done"); // Internship in progress (400 h reached)
    assert.equal(wf.steps[3].status, "current"); // Report & work certificate ready to write!
    assert.equal(wf.steps[4].status, "upcoming"); // Teacher approval
    assert.equal(wf.steps[5].status, "upcoming"); // Guidance evaluation
    assert.equal(wf.nextAction.actionHref, "/report");
    assert.equal(wf.nextAction.title, "Step 4: Harjoittelun loppuraportti");
  });

  it("Directly uses pre-persisted stage when present on the internship record", () => {
    const wf = computeInternshipWorkflow({
      id: 1,
      stage: "IN_PROGRESS",
      requiredHours: 400,
      creditsPutToOma: false,
    });

    assert.equal(wf.stage, "IN_PROGRESS");
    assert.equal(wf.currentStepNumber, 3);
    assert.equal(wf.steps[2].status, "current");
    assert.equal(wf.nextAction.title, "Step 3: Harjoittelu käynnissä");
  });

  it("Reflects teacher's manual OMA credit confirmation checkbox (creditsPutToOma)", () => {
    // When credits are not yet confirmed in OMA
    const wfPending = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED" },
      reports: [{ status: "APPROVED", totalHours: 400 }],
      guidanceEvaluation: null,
      creditsPutToOma: false,
    });

    assert.equal(wfPending.creditsPutToOma, false);
    assert.equal(wfPending.steps[4].detail, "Approved · Awaiting OMA entry");

    // When teacher clicks [✓] Credits put to OMA
    const wfDone = computeInternshipWorkflow({
      id: 1,
      requiredHours: 400,
      plan: { status: "APPROVED" },
      reports: [{ status: "APPROVED", totalHours: 400 }],
      guidanceEvaluation: { status: "SUBMITTED" },
      creditsPutToOma: true,
      creditsPutToOmaAt: new Date("2025-08-30"),
    });

    assert.equal(wfDone.creditsPutToOma, true);
    assert.equal(wfDone.steps[4].detail, "Approved · Credits in OMA");
    assert.ok(wfDone.nextAction.description.includes("opintopisteet kirjattu OMAan"));
  });
});
