import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { InternshipItem } from "../../context/InternshipContext.js";
import {
  buildSubmissionsPlans,
  buildSubmissionsReports,
  buildSubmissionsDocuments,
  buildSubmissionsEvaluations,
} from "../submissions-helpers.js";

describe("Submissions page multi-internship independence", () => {
  const eetuH1: InternshipItem = {
    id: "internship-1",
    backendId: 1,
    order: 1,
    title: "Harjoittelu 1",
    scope: "h1",
    company: "Reaktor",
    targetHours: 400,
    loggedHours: 400,
    credits: 15,
    status: "completed",
    isLocked: false,
    startDate: "2025-05-05",
    endDate: "2025-08-29",
    isPlanApproved: true,
    isPlanSubmitted: true,
    isReportApproved: true,
    isReportSubmitted: true,
    isEvaluationSubmitted: true,
    isEvaluationLocked: false,
    plan: {
      status: "approved",
      submittedAt: "2025-04-20",
      approvedAt: "2025-04-24",
      company: "Reaktor",
      jobTitle: "Junior Software Developer Trainee",
    },
    report: {
      id: "report-1",
      status: "approved",
      submittedAt: "2025-08-28",
      approvedAt: "2025-08-30",
      totalHours: 400,
      attachments: [
        { id: "att-1", name: "Tyotodistus_Reaktor.pdf", size: "1.2 MB", uploadedAt: "2025-08-28" },
      ],
    },
    evaluation: {
      status: "SUBMITTED",
      submittedAt: "2025-08-31T10:00:00Z",
    },
  };

  const eetuH2: InternshipItem = {
    id: "internship-2",
    backendId: 2,
    order: 2,
    title: "Harjoittelu 2",
    scope: "h2",
    company: "Futurice",
    targetHours: 400,
    loggedHours: 400,
    credits: 15,
    status: "ongoing",
    isLocked: false,
    startDate: "2026-05-04",
    endDate: "2026-10-16",
    isPlanApproved: true,
    isPlanSubmitted: true,
    isReportApproved: false,
    isReportSubmitted: false,
    isEvaluationSubmitted: false,
    isEvaluationLocked: true,
    plan: {
      status: "approved",
      submittedAt: "2026-04-25",
      approvedAt: "2026-04-28",
      company: "Futurice",
      jobTitle: "Software Developer Intern",
    },
    report: {
      id: "report-draft-h2",
      status: "draft",
      totalHours: 400,
      attachments: [],
    },
    evaluation: {
      status: "DRAFT",
    },
  };

  const twoInternships = [eetuH1, eetuH2];

  it("builds plans for all internships independently of activeInternshipId", () => {
    // 1. With Harjoittelu 1 active
    const plansWithH1 = buildSubmissionsPlans(twoInternships, "internship-1");
    assert.equal(plansWithH1.length, 2);
    assert.equal(plansWithH1[0].id, "plan-h1");
    assert.equal(plansWithH1[0].title, "Harjoittelu 1 – Internship plan");
    assert.ok(plansWithH1[0].subtitle?.includes("Reaktor"));
    assert.equal(plansWithH1[0].status, "approved");
    assert.equal(plansWithH1[0].metaDate, "Approved on 2025-04-24");

    assert.equal(plansWithH1[1].id, "plan-h2");
    assert.equal(plansWithH1[1].title, "Harjoittelu 2 – Internship plan");
    assert.ok(plansWithH1[1].subtitle?.includes("Futurice"));
    assert.equal(plansWithH1[1].status, "approved");
    assert.equal(plansWithH1[1].metaDate, "Approved on 2026-04-28");

    // 2. With Harjoittelu 2 active
    const plansWithH2 = buildSubmissionsPlans(twoInternships, "internship-2");
    assert.equal(plansWithH2.length, 2);
    // H1 still points to Reaktor
    assert.equal(plansWithH2[0].id, "plan-h1");
    assert.equal(plansWithH2[0].title, "Harjoittelu 1 – Internship plan");
    assert.ok(plansWithH2[0].subtitle?.includes("Reaktor"));
    assert.equal(plansWithH2[0].status, "approved");
    assert.equal(plansWithH2[0].metaDate, "Approved on 2025-04-24");

    // H2 still points to Futurice
    assert.equal(plansWithH2[1].id, "plan-h2");
    assert.equal(plansWithH2[1].title, "Harjoittelu 2 – Internship plan");
    assert.ok(plansWithH2[1].subtitle?.includes("Futurice"));
    assert.equal(plansWithH2[1].status, "approved");
    assert.equal(plansWithH2[1].metaDate, "Approved on 2026-04-28");
  });

  it("builds reports for all internships independently of activeInternshipId", () => {
    // 1. With Harjoittelu 1 active
    const reportsWithH1 = buildSubmissionsReports(twoInternships, "internship-1");
    assert.equal(reportsWithH1.length, 2);
    assert.equal(reportsWithH1[0].id, "report-h1");
    assert.equal(reportsWithH1[0].title, "Harjoittelu 1 – Final report");
    assert.equal(reportsWithH1[0].status, "approved");
    assert.equal(reportsWithH1[0].subtitle, "400 / 400 h");

    assert.equal(reportsWithH1[1].id, "report-h2");
    assert.equal(reportsWithH1[1].title, "Harjoittelu 2 – Final report");
    assert.equal(reportsWithH1[1].status, "draft");
    assert.equal(reportsWithH1[1].subtitle, "400 / 400 h");

    // 2. With Harjoittelu 2 active
    const reportsWithH2 = buildSubmissionsReports(twoInternships, "internship-2");
    assert.equal(reportsWithH2.length, 2);
    // H1 does NOT get overwritten with H2 draft
    assert.equal(reportsWithH2[0].id, "report-h1");
    assert.equal(reportsWithH2[0].title, "Harjoittelu 1 – Final report");
    assert.equal(reportsWithH2[0].status, "approved");

    // H2 remains Harjoittelu 2
    assert.equal(reportsWithH2[1].id, "report-h2");
    assert.equal(reportsWithH2[1].title, "Harjoittelu 2 – Final report");
    assert.equal(reportsWithH2[1].status, "draft");
  });

  it("aggregates documents from all internships and preserves default agreement", () => {
    const docs = buildSubmissionsDocuments(twoInternships);
    assert.equal(docs.length, 2);
    assert.ok(docs.some((d) => d.name === "Harjoittelusopimus.pdf"));
    assert.ok(docs.some((d) => d.name === "Tyotodistus_Reaktor.pdf"));

    // Ensure documents do not contain category or status
    for (const doc of docs) {
      assert.equal("category" in doc, false);
      assert.equal("status" in doc, false);
    }
  });

  it("builds evaluations for all internships accurately", () => {
    const evals = buildSubmissionsEvaluations(twoInternships);
    assert.equal(evals.length, 2);

    // H1 evaluation was submitted
    assert.equal(evals[0].id, "eval-h1");
    assert.equal(evals[0].title, "Harjoittelu 1 – Guidance evaluation");
    assert.equal(evals[0].status, "completed");
    assert.equal(evals[0].isLocked, false);
    assert.equal(evals[0].actionLabel, "View evaluation");
    assert.equal(evals[0].metaDate, "Completed on 2025-08-31");

    // H2 evaluation is locked (report not yet approved)
    assert.equal(evals[1].id, "eval-h2");
    assert.equal(evals[1].title, "Harjoittelu 2 – Guidance evaluation");
    assert.equal(evals[1].status, "locked");
    assert.equal(evals[1].isLocked, true);
    assert.equal(evals[1].actionLabel, "View preview");
    assert.ok(evals[1].lockedReason?.includes("Harjoittelu 2"));
  });

  it("handles a single combined 30 op internship period correctly", () => {
    const combinedInternship: InternshipItem = {
      id: "internship-combined",
      order: 1,
      title: "Koko harjoittelu",
      scope: "combined",
      company: "Nordic Pixel Oy",
      targetHours: 800,
      loggedHours: 640,
      credits: 30,
      status: "ongoing",
      isPlanApproved: true,
      isPlanSubmitted: true,
      isReportApproved: false,
      isReportSubmitted: false,
      isEvaluationSubmitted: false,
      isEvaluationLocked: true,
      plan: {
        status: "approved",
        company: "Nordic Pixel Oy",
        submittedAt: "2026-04-10",
        approvedAt: "2026-04-15",
      },
      report: {
        status: "draft",
        totalHours: 800,
        attachments: [{ id: "att-combined", name: "Valiraportti.pdf", size: "900 KB" }],
      },
    };

    const plans = buildSubmissionsPlans([combinedInternship], "internship-combined");
    assert.equal(plans.length, 1);
    assert.equal(plans[0].id, "plan-combined");
    assert.equal(plans[0].title, "Koko harjoittelu – Internship plan");
    assert.ok(plans[0].subtitle?.includes("30 op (800 h)"));

    const reports = buildSubmissionsReports([combinedInternship], "internship-combined");
    assert.equal(reports.length, 1);
    assert.equal(reports[0].id, "report-combined");
    assert.equal(reports[0].title, "Koko harjoittelu – Final report");

    const docs = buildSubmissionsDocuments([combinedInternship]);
    assert.equal(docs.length, 2);
    assert.ok(docs.some((d) => d.name === "Harjoittelusopimus.pdf"));
    assert.ok(docs.some((d) => d.name === "Valiraportti.pdf"));

    const evals = buildSubmissionsEvaluations([combinedInternship]);
    assert.equal(evals.length, 1);
    assert.equal(evals[0].id, "eval-combined");
    assert.equal(evals[0].title, "Koko harjoittelu – Guidance evaluation");
  });

  it("invokes onSelectInternship callback when action is triggered", () => {
    let selectedId: string | null = null;
    const selectHandler = (id: string) => {
      selectedId = id;
    };

    const plans = buildSubmissionsPlans(twoInternships, "internship-1", null, selectHandler);
    assert.ok(plans[1].onAction);
    plans[1].onAction!();
    assert.equal(selectedId, "internship-2");

    const reports = buildSubmissionsReports(twoInternships, "internship-1", null, [], selectHandler);
    assert.ok(reports[0].onAction);
    reports[0].onAction!();
    assert.equal(selectedId, "internship-1");
  });
});
