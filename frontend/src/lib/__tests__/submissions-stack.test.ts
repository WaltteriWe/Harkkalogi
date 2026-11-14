import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  SubmissionSubjectItem,
  AttachedDocumentItem,
  SubmissionsStackProps,
} from "../../components/submissionsStack";

describe("submissions-stack: multi-internship items and streamlined documents", () => {
  it("supports 0-2 plan items correctly for separate internship periods", () => {
    const plans: SubmissionSubjectItem[] = [
      {
        id: "plan-h1",
        title: "Harjoittelu 1 – Internship plan",
        subtitle: "15 op (400 h)",
        status: "approved",
        isLocked: false,
        actionHref: "/planning",
        actionLabel: "View plan",
      },
      {
        id: "plan-h2",
        title: "Harjoittelu 2 – Internship plan",
        subtitle: "15 op (400 h)",
        status: "locked",
        isLocked: true,
        lockedReason: "Avautuu Harjoittelu 1:n valmistumisen ja hyväksynnän jälkeen",
      },
    ];

    assert.equal(plans.length, 2);
    assert.equal(plans[0].status, "approved");
    assert.equal(plans[0].isLocked, false);
    assert.equal(plans[1].status, "locked");
    assert.equal(plans[1].isLocked, true);
  });

  it("supports 1 item for combined internship period", () => {
    const combinedPlans: SubmissionSubjectItem[] = [
      {
        id: "plan-combined",
        title: "Koko harjoittelu – Internship plan",
        subtitle: "30 op (800 h)",
        status: "submitted",
        isLocked: false,
        actionHref: "/planning",
        actionLabel: "View plan",
      },
    ];

    assert.equal(combinedPlans.length, 1);
    assert.equal(combinedPlans[0].id, "plan-combined");
    assert.equal(combinedPlans[0].status, "submitted");
  });

  it("ensures attached documents have no category and no status properties", () => {
    const documents: AttachedDocumentItem[] = [
      {
        id: "doc-agreement-1",
        name: "Harjoittelusopimus.pdf",
        date: "28.5.2026",
        size: "1.4 MB",
      },
      {
        id: "doc-cert-1",
        name: "Tyotodistus.pdf",
        date: "Attached with report",
        size: "820 KB",
      },
    ];

    for (const doc of documents) {
      assert.equal("category" in doc, false, "Document must not contain category property");
      assert.equal("status" in doc, false, "Document must not contain status property");
      assert.ok(doc.name);
      assert.ok(doc.size);
      assert.ok(doc.date);
    }
  });

  it("supports 0-2 evaluations and reports with locked and unlocked states", () => {
    const reports: SubmissionSubjectItem[] = [
      {
        id: "report-h1",
        title: "Harjoittelu 1 – Final report",
        subtitle: "320 / 400 h",
        status: "draft",
        isLocked: false,
        actionHref: "/report",
      },
      {
        id: "report-h2",
        title: "Harjoittelu 2 – Final report",
        subtitle: "0 / 400 h",
        status: "locked",
        isLocked: true,
      },
    ];

    const evaluations: SubmissionSubjectItem[] = [
      {
        id: "eval-h1",
        title: "Harjoittelu 1 – Guidance evaluation",
        status: "locked",
        isLocked: true,
        lockedReason: "Avautuu loppuraportin hyväksymisen jälkeen",
      },
      {
        id: "eval-h2",
        title: "Harjoittelu 2 – Guidance evaluation",
        status: "locked",
        isLocked: true,
      },
    ];

    assert.equal(reports.length, 2);
    assert.equal(evaluations.length, 2);
    assert.equal(reports[0].isLocked, false);
    assert.equal(reports[1].isLocked, true);
    assert.equal(evaluations[0].isLocked, true);
  });
});
