"use client";

import React, { useState, useEffect, Suspense, type ChangeEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "../../components/sidebar";
import { useReport } from "../../context/ReportContext";

function ReportEditor() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const {
    report,
    reports,
    activeReportId,
    setActiveReportId,
    updateField,
    addAttachment,
    removeAttachment,
    toggleSupervisorFeedback,
    saveDraft,
    submitReport,
    wordCount,
    checklist,
  } = useReport();

  // If a specific report id was passed in the URL, switch to it
  useEffect(() => {
    if (queryId && queryId !== activeReportId && reports.some((r) => r.id === queryId)) {
      setActiveReportId(queryId);
    }
  }, [queryId, activeReportId, reports, setActiveReportId]);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleSaveDraft = () => {
    saveDraft();
    showNotification("info", "Draft saved successfully.");
  };

  const handleSubmit = () => {
    const res = submitReport();
    if (res.success) {
      showNotification(
        "success",
        "Report submitted successfully! Your teacher has been notified."
      );
    } else {
      showNotification("error", res.message || "Please complete all requirements.");
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      addAttachment(file.name, sizeStr);
      showNotification("success", `Attached "${file.name}"`);
      e.target.value = "";
    }
  };

  const isApproved = report.status === "approved";
  const isSubmitted = report.status === "submitted";

  return (
    <div className="app-shell">
      <Sidebar role="student" userName="Aino Korhonen" />

      <main className="main flex flex-col gap-6">
        {/* Header section */}
        <div>
          <Link href="/reports" className="link-quiet inline-flex items-center gap-1.5 text-sm">
            ← Back to reports
          </Link>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {report.title}
            </h1>

            <div>
              {isApproved ? (
                <span className="pill-success text-sm px-3 py-1">Approved</span>
              ) : isSubmitted ? (
                <span className="pill-info text-sm px-3 py-1">Submitted</span>
              ) : (
                <span className="pill-neutral text-sm px-3 py-1">Draft</span>
              )}
            </div>
          </div>

          <p className="meta mt-1 text-sm text-ink-muted">
            {isApproved
              ? `Approved on ${report.approvedAt || "earlier"}`
              : isSubmitted
                ? `Submitted on ${report.submittedAt || "recently"}`
                : `Draft saved automatically · last saved ${report.lastSavedAt}`}
          </p>
        </div>

        {/* Feedback message banner if present */}
        {notification && (
          <div
            className={`rounded-control px-4 py-3 text-sm transition-all ${
              notification.type === "success"
                ? "bg-success-soft text-success border border-success/20"
                : notification.type === "error"
                  ? "bg-danger-soft text-danger border border-danger/20"
                  : "bg-surface-muted text-ink border border-border"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Approved banner with teacher feedback */}
        {isApproved && (
          <div className="rounded-control bg-success-soft border border-success/20 p-4 text-sm text-success flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-base">
                Report approved by Mikko Laine
              </p>
              <span className="pill-success">Approved</span>
            </div>
            {report.teacherFeedback && (
              <p className="text-ink leading-relaxed mt-1">
                {report.teacherFeedback}
              </p>
            )}
          </div>
        )}

        {/* Submission banner if under review */}
        {isSubmitted && !isApproved && (
          <div className="rounded-control bg-info-soft border border-info/20 p-4 text-sm text-info flex items-center justify-between">
            <div>
              <p className="font-semibold">Report is under teacher review</p>
              <p className="mt-0.5">
                Submitted on {report.submittedAt || "recently"}. You can still review your report details below.
              </p>
            </div>
            <span className="pill-info">Submitted</span>
          </div>
        )}

        {/* Main 2-column content layout */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_21rem]">
          {/* Left Column: Form Sections */}
          <div className="flex flex-col gap-6">
            <section className="card flex flex-col gap-8">
              {/* Report title field */}
              <div>
                <label className="field-label" htmlFor="report-title-input">
                  Report title
                </label>
                <input
                  id="report-title-input"
                  type="text"
                  className="input font-semibold"
                  value={report.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Final internship report"
                  disabled={isApproved}
                />
              </div>

              {/* 1. Workplace and period */}
              <div>
                <h2 className="text-base font-semibold text-ink">
                  1. Workplace and period
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="field-label" htmlFor="company-input">
                      Company
                    </label>
                    <input
                      id="company-input"
                      type="text"
                      className="input"
                      value={report.company}
                      onChange={(e) => updateField("company", e.target.value)}
                      placeholder="e.g. Nordic Pixel Oy"
                      disabled={isApproved}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="period-input">
                      Period
                    </label>
                    <input
                      id="period-input"
                      type="text"
                      className="input"
                      value={report.period}
                      onChange={(e) => updateField("period", e.target.value)}
                      placeholder="e.g. 1.6.2026 – 30.11.2026"
                      disabled={isApproved}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="hours-input">
                      Total hours
                    </label>
                    <input
                      id="hours-input"
                      type="text"
                      className="input"
                      value={report.totalHours}
                      onChange={(e) => updateField("totalHours", e.target.value)}
                      placeholder="800"
                      disabled={isApproved}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Tasks and learning */}
              <div>
                <h2 className="text-base font-semibold text-ink">
                  2. Tasks and learning
                </h2>
                <div className="mt-3">
                  <label className="field-label" htmlFor="tasks-input">
                    What did you work on, and what did you learn?
                  </label>
                  <textarea
                    id="tasks-input"
                    className="textarea min-h-48"
                    value={report.tasksAndLearning}
                    onChange={(e) =>
                      updateField("tasksAndLearning", e.target.value)
                    }
                    placeholder="Describe your internship tasks and key learnings..."
                    disabled={isApproved}
                  />
                  {!isApproved && (
                    <p className="hint">
                      Tip: connect your tasks to the learning goals in your internship plan.
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Attachments */}
              <div>
                <h2 className="text-base font-semibold text-ink">
                  3. Attachments
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {report.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="group flex items-center justify-between gap-4 rounded-control border border-border bg-surface-muted px-4 py-2.5 min-w-[280px]"
                    >
                      <span className="text-sm font-medium text-ink truncate max-w-[220px]">
                        {att.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="pill-success">{att.status}</span>
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-subtle hover:text-danger text-sm px-1 transition-opacity"
                            title="Remove attachment"
                            aria-label={`Remove ${att.name}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {!isApproved && (
                    <label className="btn-dashed cursor-pointer">
                      <span>+ Add file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.png,.jpg"
                      />
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* Action buttons aligned right */}
            {!isApproved ? (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="btn-secondary"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary"
                >
                  {isSubmitted ? "Update submission" : "Submit for review"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end">
                <Link href="/reports" className="btn-secondary">
                  Back to reports
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Submission Checklist */}
          <aside className="card flex flex-col gap-5">
            <h2 className="text-base font-semibold text-ink">
              {isApproved ? "Report status" : "Before you submit"}
            </h2>

            <ul className="flex flex-col gap-3.5 text-sm">
              {/* Item 1 */}
              <li className="flex items-center gap-3">
                {checklist.isWorkplaceFilled ? (
                  <span className="step-icon-done shrink-0" aria-label="Completed">
                    <svg
                      className="size-3.5 stroke-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <span className="step-icon-todo shrink-0" aria-label="To do" />
                )}
                <span className="text-ink">Workplace and period filled in</span>
              </li>

              {/* Item 2 */}
              <li className="flex items-center gap-3">
                {checklist.hasWorkCertificate ? (
                  <span className="step-icon-done shrink-0" aria-label="Completed">
                    <svg
                      className="size-3.5 stroke-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <span className="step-icon-todo shrink-0" aria-label="To do" />
                )}
                <span className="text-ink">Work certificate attached</span>
              </li>

              {/* Item 3 */}
              <li className="flex items-center gap-3">
                {checklist.isWordCountMet ? (
                  <span className="step-icon-done shrink-0" aria-label="Completed">
                    <svg
                      className="size-3.5 stroke-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <span className="step-icon-todo shrink-0" aria-label="To do" />
                )}
                <span className="text-ink">
                  Learning section at least 300 words{" "}
                  <span className="text-ink-muted">(now {wordCount})</span>
                </span>
              </li>

              {/* Item 4 */}
              <li className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={!isApproved ? toggleSupervisorFeedback : undefined}
                  disabled={isApproved}
                  className={`flex items-center gap-3 text-left w-full transition-opacity ${
                    !isApproved ? "hover:opacity-85" : "cursor-default"
                  }`}
                  title={!isApproved ? "Click to toggle supervisor feedback status" : undefined}
                >
                  {checklist.isSupervisorFeedbackRequested ? (
                    <span className="step-icon-done shrink-0" aria-label="Completed">
                      <svg
                        className="size-3.5 stroke-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  ) : (
                    <span className="step-icon-todo shrink-0" aria-label="To do" />
                  )}
                  <span className="text-ink">Supervisor feedback requested</span>
                </button>
              </li>
            </ul>

            {/* Orange deadline banner */}
            {!isApproved && (
              <div className="mt-1 rounded-control bg-brand-soft p-4 text-sm text-brand-ink leading-relaxed">
                <p>Deadline 15.12.2026. Your teacher is notified when you submit.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <Sidebar role="student" userName="Aino Korhonen" />
          <main className="main flex flex-col gap-6">
            <div className="p-8 text-center text-ink-muted">
              Loading report...
            </div>
          </main>
        </div>
      }
    >
      <ReportEditor />
    </Suspense>
  );
}
