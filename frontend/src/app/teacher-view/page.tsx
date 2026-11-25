"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  deriveStudentReportStatus,
  mapStudyType,
  type StudyMode,
  type TeacherStudentStatus,
} from "@/lib/teacher-view-helpers";

interface QueueItem {
  id: number;
  internshipId: number;
  internshipTitle: string;
  student: string;
  studyMode: StudyMode;
  title: string;
  company: string;
  submittedDate: string;
  hours: number;
  credits: number;
  creditsPutToOma: boolean;
  status: Exclude<TeacherStudentStatus, "in_progress">;
  generalSummary: string;
  feedback?: string;
}

interface ApiReport {
  id: number;
  internshipId: number;
  title?: string;
  company?: string;
  submittedAt?: string | null;
  realizedHours?: number;
  totalHours?: number;
  generalSummary?: string;
  status: string;
  reviews?: Array<{
    decision?: string;
    comment?: string;
    createdAt?: string;
  }>;
  internship?: {
    id?: number;
    title?: string;
    company?: string;
    credits?: number;
    creditsPutToOma?: boolean;
    student?: {
      name?: string;
      studyType?: string | null;
    };
  };
}

function mapReportToQueueItem(report: ApiReport): QueueItem | null {
  const derived = deriveStudentReportStatus([report]);
  if (derived === "in_progress") return null;

  const internship = report.internship || {};
  const student = internship.student || {};
  const latestReview =
    Array.isArray(report.reviews) && report.reviews.length > 0
      ? report.reviews[0]
      : null;

  return {
    id: report.id,
    internshipId: internship.id ?? report.internshipId,
    internshipTitle: internship.title || "Harjoittelu",
    student: student.name || "Unknown student",
    studyMode: mapStudyType(student.studyType),
    title: report.title || "Harjoitteluraportti",
    company: report.company || internship.company || "",
    submittedDate: report.submittedAt
      ? new Date(report.submittedAt).toLocaleDateString("fi-FI")
      : "",
    hours: report.realizedHours ?? report.totalHours ?? 0,
    credits: internship.credits ?? 15,
    creditsPutToOma: Boolean(internship.creditsPutToOma),
    status: derived,
    generalSummary: report.generalSummary || "",
    feedback: latestReview?.comment || "",
  };
}

function TeacherReviewQueueContent() {
  const searchParams = useSearchParams();
  const targetInternshipIdParam = searchParams.get("internshipId");

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<QueueItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [creditsPutToOma, setCreditsPutToOma] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pendingOmaIds, setPendingOmaIds] = useState<Record<number, boolean>>({});
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showNotice = (type: "success" | "error", text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const loadQueueData = async (): Promise<QueueItem[]> => {
    const data = await apiFetch<{ reports: ApiReport[] }>("/reports");
    return (data.reports || [])
      .map(mapReportToQueueItem)
      .filter((item): item is QueueItem => item !== null);
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const mapped = await loadQueueData();
      setQueue(mapped);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load review queue."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadQueueData()
      .then((mapped) => {
        if (!active) return;
        setQueue(mapped);
        if (targetInternshipIdParam) {
          const targetId = Number(targetInternshipIdParam);
          const match = mapped.find((item) => item.internshipId === targetId);
          if (match) {
            setSelectedReport(match);
            setFeedbackText(match.feedback || "");
            setCreditsPutToOma(match.creditsPutToOma);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load review queue."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenReview = (item: QueueItem) => {
    setSelectedReport(item);
    setFeedbackText(item.feedback || "");
    setCreditsPutToOma(item.creditsPutToOma);
    setModalError(null);
  };

  const handleReviewDecision = async (decision: "APPROVED" | "NEEDS_CHANGES") => {
    if (!selectedReport) return;
    if (decision === "NEEDS_CHANGES" && !feedbackText.trim()) {
      setModalError("Please write feedback before requesting changes.");
      return;
    }

    setIsSubmittingReview(true);
    setModalError(null);
    try {
      const res = await apiFetch<{ report: ApiReport }>(
        `/reports/${selectedReport.id}/reviews`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            comment: feedbackText.trim(),
            ...(decision === "APPROVED" ? { creditsPutToOma } : {}),
          }),
        }
      );

      const updatedItem = mapReportToQueueItem(res.report);
      if (updatedItem) {
        setQueue((prev) =>
          prev.map((q) => (q.id === updatedItem.id ? updatedItem : q))
        );
      }

      if (decision === "APPROVED") {
        showNotice(
          "success",
          `Report approved for ${selectedReport.student}.${
            creditsPutToOma ? " Credits marked put to OMA." : ""
          }`
        );
      } else {
        showNotice("success", `Revision requested from ${selectedReport.student}.`);
      }
      setSelectedReport(null);
      setFeedbackText("");
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to submit review."
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleCreditsPutToOma = async (item: QueueItem) => {
    const next = !item.creditsPutToOma;
    setPendingOmaIds((prev) => ({ ...prev, [item.internshipId]: true }));
    setQueue((prev) =>
      prev.map((q) =>
        q.internshipId === item.internshipId ? { ...q, creditsPutToOma: next } : q
      )
    );

    try {
      const res = await apiFetch<{ internship: { creditsPutToOma: boolean } }>(
        `/internships/${item.internshipId}/credits`,
        {
          method: "PATCH",
          body: JSON.stringify({ creditsPutToOma: next }),
        }
      );
      const confirmed = Boolean(res.internship?.creditsPutToOma);
      setQueue((prev) =>
        prev.map((q) =>
          q.internshipId === item.internshipId
            ? { ...q, creditsPutToOma: confirmed }
            : q
        )
      );
      showNotice(
        "success",
        confirmed
          ? `Credits marked put to OMA for ${item.student}.`
          : `Credits unmarked from OMA for ${item.student}.`
      );
    } catch (err) {
      setQueue((prev) =>
        prev.map((q) =>
          q.internshipId === item.internshipId
            ? { ...q, creditsPutToOma: !next }
            : q
        )
      );
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to update OMA credits."
      );
    } finally {
      setPendingOmaIds((prev) => ({ ...prev, [item.internshipId]: false }));
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
    }
  };

  const getStudyModeLabel = (mode: StudyMode) => {
    if (mode === "päivätoteutus") return "Päivätoteutus";
    if (mode === "monimuoto") return "Monimuoto";
    return "Unspecified";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Review queue
          </h1>
        </div>

        {actionNotice && (
          <div
            className={`rounded-control px-3 py-1.5 text-xs font-semibold border ${
              actionNotice.type === "error"
                ? "bg-danger-soft text-danger border-danger/20"
                : "bg-success-soft text-success border-success/20"
            }`}
          >
            {actionNotice.text}
          </div>
        )}
      </header>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      {loadError && (
        <div className="card p-4 border-danger/30 bg-danger-soft flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-danger">{loadError}</p>
          <button
            type="button"
            onClick={fetchQueue}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Review Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/4">Student</th>
                <th className="w-28">Status</th>
                <th className="w-32">Credits in OMA</th>
                <th className="w-40 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-ink-muted"
                  >
                    Loading review queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-ink-muted"
                  >
                    No reports in the review queue.
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-muted/30 transition-colors"
                  >
                    <td>
                      <p className="font-bold text-ink">{item.student}</p>
                      <p className="text-xs text-ink-muted">
                        {item.internshipTitle}
                        {item.company ? ` · ${item.company}` : ""} ·{" "}
                        {getStudyModeLabel(item.studyMode)}
                      </p>
                    </td>

                    <td>{getStatusBadge(item.status)}</td>

                    <td>
                      {item.status === "approved" ? (
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={Boolean(pendingOmaIds[item.internshipId])}
                            checked={item.creditsPutToOma}
                            onChange={() => toggleCreditsPutToOma(item)}
                            className="h-3.5 w-3.5 rounded text-brand cursor-pointer disabled:opacity-50"
                          />
                          <span
                            className={
                              item.creditsPutToOma
                                ? "text-success font-semibold"
                                : "text-ink-muted"
                            }
                          >
                            {item.creditsPutToOma ? "OMAssa ✓" : "Ei OMAssa"}
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-ink-muted/50">—</span>
                      )}
                    </td>

                    <td className="text-center">
                      <div className="flex items-center justify-center gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className="text-brand hover:text-brand-hover hover:underline"
                        >
                          Review report →
                        </button>
                        <Link
                          href={`/guidance-evaluation?internshipId=${item.internshipId}`}
                          className="text-ink-muted hover:text-ink hover:underline"
                        >
                          Evaluation
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                <span className="pill-neutral text-xs">
                  {getStudyModeLabel(selectedReport.studyMode)}
                </span>
                <span className="text-xs text-ink-muted">
                  {selectedReport.hours} h · {selectedReport.credits} op
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink mt-2">
                {selectedReport.title}
              </h2>
              <p className="text-sm text-ink-muted">
                Student:{" "}
                <span className="font-semibold text-ink">
                  {selectedReport.student}
                </span>{" "}
                · {selectedReport.internshipTitle}
                {selectedReport.company ? ` (${selectedReport.company})` : ""}
              </p>
            </div>

            <div className="bg-surface-muted p-4 rounded-control text-xs text-ink leading-relaxed border border-border max-h-40 overflow-y-auto">
              <p className="font-semibold mb-1 text-ink">Report Summary:</p>
              {selectedReport.generalSummary || "No summary provided."}
            </div>

            <div>
              <label htmlFor="feedback-comment" className="field-label">
                Teacher Assessment / Feedback
              </label>
              <textarea
                id="feedback-comment"
                rows={3}
                placeholder="Write feedback for the student..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="input text-xs py-2"
              />
            </div>

            {/* Manual OMA Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-control bg-surface-muted border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                id="modal-oma-checkbox"
                checked={creditsPutToOma}
                onChange={(e) => setCreditsPutToOma(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-brand cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-ink">
                  Credits put to OMA ({selectedReport.credits} op)
                </span>
                <span className="text-[11px] text-ink-muted">
                  Check this once you have entered the credits into Metropolia
                  OMA / Peppi.
                </span>
              </div>
            </label>

            {modalError && (
              <p className="text-xs font-semibold text-danger">{modalError}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => setSelectedReport(null)}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>

              {selectedReport.status === "needs_review" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDecision("NEEDS_CHANGES")}
                    className="text-xs font-semibold text-danger border border-danger/30 hover:bg-danger-soft px-3 py-2 rounded-control transition-colors disabled:opacity-50"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDecision("APPROVED")}
                    className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
                  >
                    {isSubmittingReview ? "Saving..." : "Approve report"}
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

export default function TeacherReviewQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-ink-muted">Loading review queue...</div>
      }
    >
      <TeacherReviewQueueContent />
    </Suspense>
  );
}
