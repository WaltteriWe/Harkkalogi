"use client";

import React, { useState, useEffect, Suspense, type ChangeEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import DateInput from "@/components/dateInput";
import StepStatusBanner from "@/components/stepStatusBanner";
import SubmissionChecklist from "@/components/submissionChecklist";
import ProcessPageHeader from "@/components/processPageHeader";

function ReportEditor() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const { targetHours } = useInternship();

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
    saveStatus,
    lastSavedAt,
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

  const handleSaveDraft = async () => {
    await saveDraft();
    showNotification("info", "Draft saved successfully.");
  };

  const handleSubmit = async () => {
    const res = await submitReport();
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
    <>
      {/* Header section */}
      <ProcessPageHeader
        title={report.title || "Internship report"}
        status={report.status}
        subtitle={
          isApproved
            ? `Approved on ${report.approvedAt || "earlier"}`
            : isSubmitted
              ? `Submitted on ${report.submittedAt || "recently"}`
              : saveStatus === "saving"
                ? "Saving draft..."
                : saveStatus === "unsaved"
                  ? "Unsaved changes..."
                  : saveStatus === "error"
                    ? "Draft save failed · saved locally"
                    : `Draft saved automatically · last saved ${lastSavedAt || report.lastSavedAt}`
        }
      />

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

        {/* Step status banner (feedback or review) */}
        <StepStatusBanner
          step="report"
          status={report.status}
          submittedAt={report.submittedAt}
          feedback={report.teacherFeedback}
          feedbackAuthor="Mikko Laine"
        />

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
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                  <DateInput
                    id="start-date-input"
                    label="Start date"
                    value={report.startDate}
                    onChange={(value) => updateField("startDate", value)}
                    max={report.endDate}
                    disabled={isApproved}
                  />

                  <DateInput
                    id="end-date-input"
                    label="End date"
                    value={report.endDate}
                    onChange={(value) => updateField("endDate", value)}
                    min={report.startDate}
                    disabled={isApproved}
                  />

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
                      placeholder={String(targetHours || 400)}
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

              {/* 4. Supervisor feedback */}
              <div>
                <h2 className="text-base font-semibold text-ink">
                  4. Supervisor feedback
                </h2>
                <div className="mt-3">
                  <label
                    htmlFor="supervisor-feedback-checkbox"
                    className={`flex items-start gap-3 rounded-control border border-border p-4 transition-all ${
                      !isApproved
                        ? "cursor-pointer bg-surface hover:bg-surface-muted/50"
                        : "cursor-default bg-surface-muted/30"
                    }`}
                  >
                    <input
                      id="supervisor-feedback-checkbox"
                      type="checkbox"
                      checked={report.supervisorFeedbackRequested}
                      onChange={!isApproved ? toggleSupervisorFeedback : undefined}
                      disabled={isApproved}
                      className="checkbox mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink">
                        Supervisor feedback requested / completed
                      </span>
                      <span className="text-xs text-ink-muted leading-relaxed">
                        I have discussed feedback with my workplace supervisor regarding my internship performance.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Action buttons aligned right */}
            {!isApproved ? (
              <div className="flex items-center justify-end gap-3">
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
                <Link href="/" className="btn-secondary">
                  Back to overview
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Submission Checklist */}
          <SubmissionChecklist
            title={isApproved ? "Report status" : "Before you submit"}
            items={[
              {
                id: "workplace",
                done: checklist.isWorkplaceFilled,
                label: "Workplace and period filled in",
              },
              {
                id: "certificate",
                done: checklist.hasWorkCertificate,
                label: "Work certificate attached",
              },
              {
                id: "word-count",
                done: checklist.isWordCountMet,
                label: (
                  <>
                    Learning section at least 300 words{" "}
                    <span className="text-ink-muted">(now {wordCount})</span>
                  </>
                ),
              },
              {
                id: "supervisor-feedback",
                done: checklist.isSupervisorFeedbackRequested,
                label: "Supervisor feedback requested",
              },
            ]}
            note={
              !isApproved
                ? "Deadline 15.12.2026. Your teacher is notified when you submit."
                : null
            }
          />
        </div>
    </>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-ink-muted">
          Loading report...
        </div>
      }
    >
      <ReportEditor />
    </Suspense>
  );
}
