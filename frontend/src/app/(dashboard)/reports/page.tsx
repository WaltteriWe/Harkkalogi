"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReport } from "@/context/ReportContext";
import { formatPeriod } from "@/lib/dates";

export default function ReportsPage() {
  const router = useRouter();
  const { reports, createReport, deleteReport } = useReport();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const oldReports = useMemo(
    () => reports.filter((r) => r.status === "approved"),
    [reports],
  );

  // Counts
  const approvedCount = oldReports.length;
  const submittedCount = reports.filter((r) => r.status === "submitted").length;
  const draftCount = reports.filter((r) => r.status === "draft").length;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const titleToUse = newReportTitle.trim() || "New report";
    const newId = createReport(titleToUse);
    setShowCreateModal(false);
    setNewReportTitle("");
    router.push(`/report?id=${newId}`);
  };

  const handleDelete = (id: string, title: string) => {
    deleteReport(id);
    showToast(`Removed "${title}".`);
  };

  return (
    <>
      {/* Header Section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Reports</h1>
          <p className="meta mt-1 text-base">
            Submit your internship reports, create new drafts and review
            feedback on completed reports
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg
              className="size-4 stroke-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Create new report</span>
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="rounded-control bg-surface-muted border border-border px-4 py-3 text-sm text-ink transition-all">
          {notification}
        </div>
      )}

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="label">Total reports</p>
          <p className="mt-1 text-2xl font-bold tabular text-ink">
            {reports.length}
          </p>
        </div>

        <div className="card p-4">
          <p className="label">Approved</p>
          <p className="mt-1 text-2xl font-bold tabular text-success">
            {approvedCount}
          </p>
        </div>

        <div className="card p-4">
          <p className="label">Under review</p>
          <p className="mt-1 text-2xl font-bold tabular text-info">
            {submittedCount}
          </p>
        </div>

        <div className="card p-4">
          <p className="label">Drafts</p>
          <p className="mt-1 text-2xl font-bold tabular text-ink-muted">
            {draftCount}
          </p>
        </div>
      </div>

      {/* Reports Table / List */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>Reports</h2>
          <span className="meta text-xs">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-ink-muted">No reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Report title</th>
                  <th>Period</th>
                  <th>Hours</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => {
                  const isItemApproved = item.status === "approved";
                  const isItemSubmitted = item.status === "submitted";

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-muted border border-border text-ink-muted">
                            <svg
                              className="size-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-ink text-sm">
                              {item.title}
                            </p>
                            <p className="meta text-xs">{item.company}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="text-sm text-ink tabular">
                          {formatPeriod(item.startDate, item.endDate)}
                        </span>
                      </td>

                      <td>
                        <span className="text-sm font-medium text-ink tabular">
                          {item.totalHours} h
                        </span>
                      </td>

                      <td>
                        <span className="meta tabular text-sm">
                          {isItemApproved
                            ? item.approvedAt || item.submittedAt
                            : isItemSubmitted
                              ? item.submittedAt || "Recently"
                              : `Draft (${item.lastSavedAt})`}
                        </span>
                      </td>

                      <td>
                        {isItemApproved ? (
                          <span className="pill-success">Approved</span>
                        ) : isItemSubmitted ? (
                          <span className="pill-info">Under review</span>
                        ) : (
                          <span className="pill-neutral">Draft</span>
                        )}
                      </td>

                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/report?id=${item.id}`}
                            className="btn-secondary py-1.5 px-3 text-xs font-semibold"
                          >
                            {isItemApproved
                              ? "View report →"
                              : isItemSubmitted
                                ? "View submission →"
                                : "Edit draft →"}
                          </Link>

                          {item.status === "draft" &&
                            item.id !== "report-final" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(item.id, item.title)
                                }
                                className="text-ink-subtle hover:text-danger text-sm px-1.5 py-1 transition-colors"
                                title="Delete draft"
                                aria-label={`Delete ${item.title}`}
                              >
                                ✕
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Old Reports Highlight Card (if viewing all or old reports and approved reports exist) */}
      {oldReports.length > 0 && (
        <section className="card flex flex-col gap-4">
          <div>
            <h2>Supervisor and teacher review notes</h2>
            <p className="meta mt-1 text-sm">
              Feedback recorded from your previous completed report submissions
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {oldReports.map((old) => (
              <div
                key={`feedback-${old.id}`}
                className="flex flex-col justify-between rounded-control border border-border bg-surface-muted/40 p-4 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-ink">
                      {old.title}
                    </span>
                    <span className="pill-success">Approved</span>
                  </div>

                  <p className="meta text-xs tabular mt-1">
                    Period: {formatPeriod(old.startDate, old.endDate)} · {old.totalHours} hours
                  </p>

                  {old.teacherFeedback && (
                    <p className="mt-3 text-xs text-ink-muted leading-relaxed bg-surface border border-border rounded-control p-3">
                      {old.teacherFeedback}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <Link
                    href={`/report?id=${old.id}`}
                    className="link text-xs font-semibold"
                  >
                    View full report →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal for creating a new report */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-ink">Create new report</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-subtle hover:text-ink text-sm p-1 leading-none"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateNew}
              className="mt-4 flex flex-col gap-4"
            >
              <div>
                <label htmlFor="modal-report-title" className="field-label">
                  Report title
                </label>
                <input
                  id="modal-report-title"
                  type="text"
                  required
                  value={newReportTitle}
                  onChange={(e) => setNewReportTitle(e.target.value)}
                  placeholder="e.g. Monthly reflection report, Final report..."
                  className="input"
                  autoFocus
                />
                <p className="hint">
                  Give your report an identifiable title. You can fill details
                  and attachments in the editor.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm">
                  Create &amp; open editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
