"use client";

import React, { useState } from "react";
import { useReport } from "@/context/ReportContext";

interface QueueItem {
  id: string;
  student: string;
  programme: string;
  title: string;
  company: string;
  submittedDate: string;
  hours: number;
  status: "needs_review" | "approved" | "changes_requested";
  feedback?: string;
}

const INITIAL_QUEUE_ITEMS: QueueItem[] = [
  {
    id: "q-1",
    student: "Aino Korhonen",
    programme: "Information Technology",
    title: "Final internship report",
    company: "Nordic Pixel Oy",
    submittedDate: "1.10.2026",
    hours: 800,
    status: "needs_review",
  },
  {
    id: "q-2",
    student: "Linnea Berg",
    programme: "Media Engineering",
    title: "Final internship report",
    company: "Reaktor",
    submittedDate: "18.9.2026",
    hours: 800,
    status: "needs_review",
  },
  {
    id: "q-3",
    student: "Eetu Mäkinen",
    programme: "Information Technology",
    title: "Mid-term progress report",
    company: "Futurice",
    submittedDate: "23.9.2026",
    hours: 400,
    status: "needs_review",
  },
  {
    id: "q-4",
    student: "Sofia Mäkinen",
    programme: "Information Technology",
    title: "Final internship report",
    company: "KONE Oyj",
    submittedDate: "6.10.2026",
    hours: 800,
    status: "approved",
    feedback: "Approved by Mikko Laine: Learning reflection and hours verified.",
  },
];

export default function TeacherReviewQueuePage() {
  const { reports } = useReport();
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
  const [selectedReport, setSelectedReport] = useState<QueueItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Check if Aino submitted her final report from the ReportContext
  const ainoFinal = reports.find((r) => r.id === "report-final");
  const ainoStatus = ainoFinal?.status === "submitted" ? "needs_review" : "needs_review";

  const handleApprove = (id: string, studentName: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "approved" } : item
      )
    );
    setActionNotice(`Report approved for ${studentName}.`);
    setTimeout(() => setActionNotice(null), 3000);
    setSelectedReport(null);
  };

  const handleRequestChanges = (id: string, studentName: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "changes_requested",
              feedback: feedbackText || "Please expand on project reflections.",
            }
          : item
      )
    );
    setActionNotice(`Revision requested from ${studentName}.`);
    setTimeout(() => setActionNotice(null), 3000);
    setSelectedReport(null);
    setFeedbackText("");
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
              {queue.map((item) => (
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
                    {getStatusBadge(item.id === "q-1" ? ainoStatus : item.status)}
                  </td>

                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(item)}
                      className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline"
                    >
                      Review report →
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
              <p className="font-semibold mb-1 text-ink">Report Excerpt:</p>
              &quot;Completed full 800 hours working on web interface components, automated tests, and design tokens. Actively participated in agile sprint planning and code reviews.&quot;
            </div>

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

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRequestChanges(selectedReport.id, selectedReport.student)}
                  className="text-xs font-semibold text-danger border border-danger/30 hover:bg-danger-soft px-3 py-2 rounded-control transition-colors"
                >
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedReport.id, selectedReport.student)}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Approve report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
