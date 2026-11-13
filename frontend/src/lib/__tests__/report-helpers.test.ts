import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeTasksAndLearning,
  createReportState,
  createAttachment,
  toReportPayload,
  mapBackendReport,
  calculateReportWordCount,
  calculateReportChecklist,
  EMPTY_STORE,
  EMPTY_REPORT,
} from "../report-helpers";

describe("report-helpers: sanitizeTasksAndLearning", () => {
  it("returns plain text unchanged", () => {
    const text = "Working on frontend components";
    assert.equal(sanitizeTasksAndLearning(text), text);
  });

  it("unwraps JSON string wrapping gracefully", () => {
    const wrapped = '{"tasksAndLearning": "Clean text inside JSON"}';
    assert.equal(sanitizeTasksAndLearning(wrapped), "Clean text inside JSON");
  });

  it("handles non-string or empty inputs", () => {
    assert.equal(sanitizeTasksAndLearning(""), "");
    assert.equal(sanitizeTasksAndLearning(null), "");
    assert.equal(sanitizeTasksAndLearning(undefined), "");
  });

  it("falls back to raw string if JSON is malformed", () => {
    const malformed = '{"tasksAndLearning": incomplete';
    assert.equal(sanitizeTasksAndLearning(malformed), malformed);
  });
});

describe("report-helpers: createReportState & createAttachment", () => {
  it("creates a report with clean empty defaults and 400 hours", () => {
    const report = createReportState();
    assert.equal(report.status, "draft");
    assert.equal(report.company, "");
    assert.equal(report.totalHours, 400);
    assert.equal(report.startDate, "");
    assert.equal(report.endDate, "");
    assert.equal(Array.isArray(report.attachments), true);
    assert.equal(report.attachments.length, 0);
  });

  it("respects overrides", () => {
    const report = createReportState({
      id: "custom-id",
      company: "Acme Corp",
      totalHours: 800,
    });
    assert.equal(report.id, "custom-id");
    assert.equal(report.company, "Acme Corp");
    assert.equal(report.totalHours, 800);
  });

  it("provides valid EMPTY_STORE and EMPTY_REPORT with empty company and 400 hours", () => {
    assert.ok(EMPTY_STORE.reports.length > 0);
    assert.equal(EMPTY_STORE.reports[0].company, "");
    assert.equal(EMPTY_STORE.reports[0].totalHours, 400);
    assert.equal(EMPTY_REPORT.id, "report-draft-1");
    assert.equal(EMPTY_REPORT.company, "");
    assert.equal(EMPTY_REPORT.totalHours, 400);
  });

  it("creates an attachment with generated id and default status", () => {
    const attachment = createAttachment("certificate.pdf", "1.2 MB");
    assert.ok(attachment.id.startsWith("att-"));
    assert.equal(attachment.name, "certificate.pdf");
    assert.equal(attachment.size, "1.2 MB");
    assert.equal(attachment.status, "Uploaded");
  });
});

describe("report-helpers: toReportPayload", () => {
  it("formats report data into backend payload", () => {
    const report = createReportState({
      title: "My Report",
      company: "Tech Co",
      startDate: "2026-06-01",
      endDate: "2026-11-30",
      totalHours: 800,
      tasksAndLearning: '{"tasksAndLearning": "Real content"}',
    });
    const payload = toReportPayload(report, "DRAFT");
    assert.equal(payload.title, "My Report");
    assert.equal(payload.company, "Tech Co");
    assert.equal(payload.tasksAndLearning, "Real content");
    assert.equal(payload.status, "DRAFT");
  });
});

describe("report-helpers: mapBackendReport", () => {
  it("maps raw backend data to ReportState", () => {
    const raw = {
      id: 123,
      title: "Backend Report",
      status: "APPROVED",
      submittedAt: "2026-11-01",
      reviews: [{ decision: "APPROVED", createdAt: "2026-11-02", comment: "Great work!" }],
      internship: {
        company: "Remote Lab",
        startDate: "2026-06-01T00:00:00Z",
        endDate: "2026-11-30T00:00:00Z",
      },
      content: JSON.stringify({ tasksAndLearning: "Mapped learning" }),
    };

    const mapped = mapBackendReport(raw);
    assert.equal(mapped.id, "123");
    assert.equal(mapped.title, "Backend Report");
    assert.equal(mapped.company, "Remote Lab");
    assert.equal(mapped.startDate, "2026-06-01");
    assert.equal(mapped.endDate, "2026-11-30");
    assert.equal(mapped.status, "approved");
    assert.equal(mapped.submittedAt, "1.11.2026");
    assert.equal(mapped.approvedAt, "2.11.2026");
    assert.equal(mapped.teacherFeedback, "Great work!");
    assert.equal(mapped.tasksAndLearning, "Mapped learning");
  });
});

describe("report-helpers: calculateReportWordCount", () => {
  it("returns 0 for empty or whitespace-only text", () => {
    assert.equal(calculateReportWordCount(""), 0);
    assert.equal(calculateReportWordCount("   \n\t  "), 0);
  });

  it("accurately counts words with mixed whitespace", () => {
    assert.equal(calculateReportWordCount("One two three four five"), 5);
    assert.equal(calculateReportWordCount("Line 1\nLine 2\t  Line 3"), 6);
  });
});

describe("report-helpers: calculateReportChecklist", () => {
  it("evaluates requirements correctly when incomplete", () => {
    const report = createReportState({
      company: "",
      attachments: [],
    });
    const checklist = calculateReportChecklist(report, 150);
    assert.equal(checklist.isWorkplaceFilled, false);
    assert.equal(checklist.hasWorkCertificate, false);
    assert.equal(checklist.isWordCountMet, false);
    assert.equal(checklist.canSubmit, false);
  });

  it("evaluates requirements correctly when complete", () => {
    const report = createReportState({
      company: "Nordic Pixel",
      startDate: "2026-06-01",
      endDate: "2026-11-30",
      totalHours: 800,
      attachments: [{ id: "1", name: "cert.pdf", status: "Uploaded" }],
    });
    const checklist = calculateReportChecklist(report, 305);
    assert.equal(checklist.isWorkplaceFilled, true);
    assert.equal(checklist.hasWorkCertificate, true);
    assert.equal(checklist.isWordCountMet, true);
    assert.equal(checklist.canSubmit, true);
  });
});
