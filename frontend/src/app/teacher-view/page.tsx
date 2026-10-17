"use client";

import React, { useEffect, useState } from "react";

interface QueueItem {
  id: string;
  student: string;
  programme: string;
  title: string;
  company: string;
  period: string;
  submittedDate: string;
  hours: number;
  content: string;
  status: "needs_review" | "approved" | "changes_requested" | "reviewed";
  feedback?: string | null;
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function isQueueItem(value: unknown): value is QueueItem {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.id === "string" &&
    typeof report.student === "string" &&
    typeof report.programme === "string" &&
    typeof report.title === "string" &&
    typeof report.company === "string" &&
    typeof report.period === "string" &&
    typeof report.submittedDate === "string" &&
    typeof report.hours === "number" &&
    typeof report.content === "string" &&
    ["needs_review", "approved", "changes_requested", "reviewed"].includes(
      String(report.status)
    ) &&
    (report.feedback === undefined ||
      report.feedback === null ||
      typeof report.feedback === "string")
  );
}

export default function TeacherReviewQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<QueueItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingReview, setIsSavingReview] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`${backendUrl}/api/teacher/reports`, { credentials: "include" })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            body && typeof body === "object" && "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Could not load the review queue.";
          throw new Error(message);
        }
        if (
          !body || typeof body !== "object" || !("reports" in body) ||
          !Array.isArray(body.reports) ||
          !body.reports.every(isQueueItem)
        ) {
          throw new Error("The server returned an invalid review queue.");
        }
        if (active) setQueue(body.reports);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the review queue."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleReview = async (
    decision: "APPROVED" | "NEEDS_CHANGES",
    item: QueueItem
  ) => {
    setError(null);
    setIsSavingReview(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/teacher/reports/${item.id}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            comment:
              feedbackText.trim() ||
              (decision === "NEEDS_CHANGES"
                ? "Please expand on your report and resubmit it."
                : ""),
          }),
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          body && typeof body === "object" && "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Could not save the review.";
        throw new Error(message);
      }
      setQueue((previous) =>
        previous.map((report) =>
          report.id === item.id
            ? {
                ...report,
                status:
                  decision === "APPROVED" ? "approved" : "changes_requested",
                feedback: feedbackText.trim() || null,
              }
            : report
        )
      );
      setActionNotice(
        decision === "APPROVED"
          ? `Report approved for ${item.student}.`
          : `Revision requested from ${item.student}.`
      );
      setTimeout(() => setActionNotice(null), 3000);
      setSelectedReport(null);
      setFeedbackText("");
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not save the review."
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  const getStatusBadge = (status: QueueItem["status"]) => {
    switch (status) {
      case "needs_review":
        return <span className="pill-warning">Needs review</span>;
      case "approved":
        return <span className="pill-success">Approved</span>;
      case "changes_requested":
        return <span className="pill-danger">Changes requested</span>;
      case "reviewed":
        return <span className="pill-neutral">Reviewed</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Review queue
          </h1>
          <p className="meta mt-1 text-sm">
            Supervising teacher · Review pending reports and student progress
          </p>
        </div>

        {actionNotice && (
          <div className="rounded-control bg-success-soft px-3 py-1.5 text-xs font-semibold text-success border border-success/20">
            {actionNotice}
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="card border-danger text-sm text-danger">
          {error}
        </p>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Awaiting your review</p>
          <p className="text-2xl font-bold font-mono text-ink mt-2">
            {queue.filter((q) => q.status === "needs_review").length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-danger font-medium">Revisions pending</p>
          <p className="text-2xl font-bold font-mono text-danger mt-2">
            {queue.filter((q) => q.status === "changes_requested").length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Approved this term</p>
          <p className="text-2xl font-bold font-mono text-ink mt-2">
            {queue.filter((q) => q.status === "approved").length}
          </p>
        </div>
      </div>

      {/* Review Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/4">Student</th>
                <th className="w-1/4">Report Title</th>
                <th className="w-1/5">Company</th>
                <th className="w-24">Hours</th>
                <th className="w-32">Status</th>
                <th className="w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-ink-muted">
                    Loading reports…
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-ink-muted">
                    No reports have been submitted by your assigned students yet.
                  </td>
                </tr>
              ) : queue.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td>
                    <p className="font-bold text-ink">{item.student}</p>
                    <p className="text-xs text-ink-muted">{item.programme}</p>
                  </td>

                  <td>
                    <p className="font-semibold text-sm text-ink">{item.title}</p>
                    <p className="text-xs text-ink-muted">Submitted {item.submittedDate}</p>
                  </td>

                  <td>
                    <p className="text-sm text-ink">{item.company}</p>
                  </td>

                  <td>
                    <span className="font-mono tabular font-semibold text-sm">
                      {item.hours} h
                    </span>
                  </td>

                  <td>
                    {getStatusBadge(item.status)}
                  </td>

                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(item)}
                      className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline"
                    >
                      {item.status === "needs_review" ? "Review report →" : "View report →"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg p-6 shadow-xl animate-fade-in flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="pill-neutral text-xs">{selectedReport.programme}</span>
                <span className="font-mono tabular text-xs text-ink-muted">{selectedReport.hours} hours</span>
              </div>
              <h2 className="text-lg font-bold text-ink mt-2">
                {selectedReport.title}
              </h2>
              <p className="text-sm text-ink-muted">
                Student: <span className="font-semibold text-ink">{selectedReport.student}</span> · {selectedReport.company}
              </p>
            </div>

            <div className="bg-surface-muted p-4 rounded-control text-xs text-ink leading-relaxed border border-border">
              <p className="font-semibold mb-1 text-ink">Student&apos;s report:</p>
              <p className="whitespace-pre-wrap">{selectedReport.content}</p>
              <p className="mt-3 text-ink-muted">
                Period: {selectedReport.period} · {selectedReport.hours} hours
              </p>
            </div>

            {selectedReport.status === "needs_review" ? (
              <div>
              <label htmlFor="feedback-comment" className="field-label">Teacher Assessment / Feedback</label>
              <textarea
                id="feedback-comment"
                rows={3}
                placeholder="Write feedback for the student..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="input text-xs py-2"
              />
              </div>
            ) : selectedReport.feedback ? (
              <div className="rounded-control border border-border bg-surface-muted p-3 text-sm">
                <p className="font-semibold text-ink">Teacher feedback</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-muted">
                  {selectedReport.feedback}
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={isSavingReview}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>

              {selectedReport.status === "needs_review" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void handleReview("NEEDS_CHANGES", selectedReport)
                    }
                    disabled={isSavingReview}
                    className="text-xs font-semibold text-danger border border-danger/30 hover:bg-danger-soft px-3 py-2 rounded-control transition-colors"
                  >
                    {isSavingReview ? "Saving…" : "Request changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReview("APPROVED", selectedReport)}
                    disabled={isSavingReview}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    {isSavingReview ? "Saving…" : "Approve report"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
