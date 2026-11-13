import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Workflow & Step-Gated Flow", () => {
  // Helper simulating the backend/context workflow calculation
  function calculateWorkflow(planStatus: string, reportStatus: string, evaluationStatus = "DRAFT", scope = "h1", loggedHoursInput?: number) {
    const isPlanApproved = planStatus.toUpperCase() === "APPROVED";
    const isPlanSubmitted = planStatus.toUpperCase() === "SUBMITTED" || isPlanApproved;
    // Report submission/approval strictly gated on plan approval
    const isReportApproved = isPlanApproved && (reportStatus.toUpperCase() === "APPROVED" || reportStatus.toUpperCase() === "REVIEWED");
    const isReportSubmitted = isPlanApproved && (reportStatus.toUpperCase() === "SUBMITTED" || isReportApproved);
    const isEvaluationSubmitted = isReportApproved && evaluationStatus.toUpperCase() === "SUBMITTED";
    const isEvaluationLocked = !isReportApproved;

    const targetHours = scope === "combined" ? 800 : 400;
    const loggedHours = loggedHoursInput !== undefined ? loggedHoursInput : (isReportSubmitted ? targetHours : isPlanApproved ? Math.round(targetHours * 0.8) : 0);
    const isHoursDone = loggedHours >= targetHours && targetHours > 0;

    const step1Status = isPlanSubmitted ? "done" : "current";
    const step2Status = !isPlanSubmitted ? "upcoming" : isPlanApproved ? "done" : "current";
    const step3Status = !isPlanApproved ? "upcoming" : (isReportSubmitted || isHoursDone) ? "done" : "current";
    const step4Status = !isPlanApproved ? "upcoming" : isReportSubmitted ? "done" : isHoursDone ? "current" : "upcoming";
    const step5Status = !isReportSubmitted ? "upcoming" : isReportApproved ? "done" : "current";
    const step6Status = !isReportApproved ? "upcoming" : isEvaluationSubmitted ? "done" : "current";

    return {
      targetHours,
      loggedHours,
      isPlanApproved,
      isPlanSubmitted,
      isReportApproved,
      isReportSubmitted,
      isEvaluationLocked,
      steps: [
        { stepNumber: 1, title: "Plan submitted", status: step1Status },
        { stepNumber: 2, title: "Plan approved", status: step2Status },
        { stepNumber: 3, title: "Internship in progress", status: step3Status },
        { stepNumber: 4, title: "Report & work certificate", status: step4Status },
        { stepNumber: 5, title: "Teacher approval", status: step5Status },
        { stepNumber: 6, title: "Guidance evaluation", status: step6Status, isLocked: isEvaluationLocked },
      ],
    };
  }

  describe("Scope sets target hours correctly", () => {
    it("sets target hours to 400 for Harjoittelu 1", () => {
      const wf = calculateWorkflow("draft", "draft", "draft", "h1");
      assert.equal(wf.targetHours, 400);
    });

    it("sets target hours to 400 for Harjoittelu 2", () => {
      const wf = calculateWorkflow("draft", "draft", "draft", "h2");
      assert.equal(wf.targetHours, 400);
    });

    it("sets target hours to 800 for Koko harjoittelu (combined 30 op)", () => {
      const wf = calculateWorkflow("draft", "draft", "draft", "combined");
      assert.equal(wf.targetHours, 800);
    });
  });

  describe("Step progression matching ReportingProgress 6 steps", () => {
    it("Step 1 is current when plan is in draft", () => {
      const wf = calculateWorkflow("draft", "draft");
      assert.equal(wf.steps[0].status, "current");
      assert.equal(wf.steps[1].status, "upcoming");
      assert.equal(wf.isEvaluationLocked, true);
    });

    it("Step 2 is current when plan is submitted and waiting for approval", () => {
      const wf = calculateWorkflow("submitted", "draft");
      assert.equal(wf.steps[0].status, "done");
      assert.equal(wf.steps[1].status, "current");
      assert.equal(wf.steps[2].status, "upcoming");
      assert.equal(wf.isEvaluationLocked, true);
    });

    it("Step 3 is current when plan is approved and internship is active", () => {
      const wf = calculateWorkflow("approved", "draft");
      assert.equal(wf.steps[0].status, "done");
      assert.equal(wf.steps[1].status, "done");
      assert.equal(wf.steps[2].status, "current");
      assert.equal(wf.isEvaluationLocked, true, "Evaluation must remain locked while in progress");
    });

    it("Step 5 is current when report & certificate are submitted for teacher review", () => {
      const wf = calculateWorkflow("approved", "submitted");
      assert.equal(wf.steps[0].status, "done");
      assert.equal(wf.steps[1].status, "done");
      assert.equal(wf.steps[2].status, "done");
      assert.equal(wf.steps[3].status, "done");
      assert.equal(wf.steps[4].status, "current");
      assert.equal(wf.isEvaluationLocked, true, "Evaluation must remain locked until teacher approves");
    });

    it("Step 6 unlocks as current only after report is approved by teacher", () => {
      const wf = calculateWorkflow("approved", "approved");
      assert.equal(wf.steps[0].status, "done");
      assert.equal(wf.steps[1].status, "done");
      assert.equal(wf.steps[2].status, "done");
      assert.equal(wf.steps[3].status, "done");
      assert.equal(wf.steps[4].status, "done");
      assert.equal(wf.steps[5].status, "current");
      assert.equal(wf.isEvaluationLocked, false, "Evaluation unlocks when teacher approval is complete");
    });

    it("All 6 steps are done when guidance evaluation is submitted", () => {
      const wf = calculateWorkflow("approved", "approved", "submitted");
      assert.ok(wf.steps.every((s) => s.status === "done"));
    });

    it("prevents multiple current steps and premature progression if plan is draft even when report is submitted", () => {
      // Regression test: Stale report or orphan submitted report must NOT mark step 3/4 done or step 5 current!
      const wf = calculateWorkflow("draft", "submitted");
      assert.equal(wf.steps[0].status, "current");
      assert.equal(wf.steps[1].status, "upcoming");
      assert.equal(wf.steps[2].status, "upcoming");
      assert.equal(wf.steps[3].status, "upcoming");
      assert.equal(wf.steps[4].status, "upcoming");
      assert.equal(wf.steps[5].status, "upcoming");
      const currentSteps = wf.steps.filter((s) => s.status === "current");
      assert.equal(currentSteps.length, 1);
    });

    it("prevents multiple current steps if plan is submitted but not approved even when report is submitted", () => {
      const wf = calculateWorkflow("submitted", "submitted");
      assert.equal(wf.steps[0].status, "done");
      assert.equal(wf.steps[1].status, "current");
      assert.equal(wf.steps[2].status, "upcoming");
      assert.equal(wf.steps[3].status, "upcoming");
      assert.equal(wf.steps[4].status, "upcoming");
      assert.equal(wf.steps[5].status, "upcoming");
      const currentSteps = wf.steps.filter((s) => s.status === "current");
      assert.equal(currentSteps.length, 1);
    });
  });

  describe("InternshipSelector & Multi-Period Gating", () => {
    function computeInternshipList(scope: "h1" | "h2" | "combined", isPlanSubmitted: boolean, isReportApproved: boolean) {
      if (scope === "combined") {
        return [
          {
            id: "internship-1",
            title: "Koko harjoittelu",
            scope: "combined",
            targetHours: 800,
            status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
            isLocked: false,
          },
        ];
      }
      return [
        {
          id: "internship-1",
          title: "Harjoittelu 1",
          scope: "h1",
          targetHours: 400,
          status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
          isLocked: false,
        },
        {
          id: "internship-2",
          title: "Harjoittelu 2",
          scope: "h2",
          targetHours: 400,
          status: "not_started",
          isLocked: !isReportApproved,
        },
      ];
    }

    it("treats Harjoittelu 1 as not_started before plan is submitted", () => {
      const list = computeInternshipList("h1", false, false);
      assert.equal(list[0].status, "not_started");
      assert.equal(list[1].isLocked, true);
    });

    it("locks Harjoittelu 2 while Harjoittelu 1 is in progress", () => {
      const list = computeInternshipList("h1", true, false);
      assert.equal(list[0].status, "ongoing");
      assert.equal(list[1].isLocked, true, "Harjoittelu 2 must be locked until Harjoittelu 1 report is approved");
    });

    it("unlocks Harjoittelu 2 when Harjoittelu 1 report is approved", () => {
      const list = computeInternshipList("h1", true, true);
      assert.equal(list[0].status, "completed");
      assert.equal(list[1].isLocked, false, "Harjoittelu 2 unlocks after Harjoittelu 1 is completed");
    });

    it("contains only 1 combined period when scope is combined", () => {
      const list = computeInternshipList("combined", true, false);
      assert.equal(list.length, 1);
      assert.equal(list[0].targetHours, 800);
      assert.equal(list[0].title, "Koko harjoittelu");
    });
  });
});
