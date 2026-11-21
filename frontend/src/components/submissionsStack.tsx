"use client";

import React from "react";
import Link from "next/link";

export interface SubmissionSubjectItem {
  id: string;
  title: string;
  subtitle?: string;
  metaDate?: string;
  status: "draft" | "submitted" | "approved" | "completed" | "not_started" | "locked" | "ready";
  isLocked?: boolean;
  lockedReason?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AttachedDocumentItem {
  id: string;
  name: string;
  date: string;
  size: string;
}

export interface SubmissionsStackProps {
  plans: SubmissionSubjectItem[];
  reports: SubmissionSubjectItem[];
  documents: AttachedDocumentItem[];
  evaluations: SubmissionSubjectItem[];
  onDownloadDocument?: (fileName: string) => void;
}

function getStatusPill(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "completed") {
    return <span className="pill-success text-[11px] py-0.5 px-2 capitalize">{status}</span>;
  }
  if (normalized === "submitted" || normalized === "under review" || normalized === "ready") {
    return <span className="pill-info text-[11px] py-0.5 px-2 capitalize">{status}</span>;
  }
  if (normalized === "locked") {
    return <span className="pill-neutral text-[11px] py-0.5 px-2 capitalize">Locked</span>;
  }
  if (normalized === "not_started") {
    return <span className="pill-neutral text-[11px] py-0.5 px-2">Not started</span>;
  }
  return <span className="pill-neutral text-[11px] py-0.5 px-2 capitalize">{status}</span>;
}

function countActiveSubmissions(items: SubmissionSubjectItem[]): number {
  return items.filter(
    (item) => item.status === "submitted" || item.status === "approved" || item.status === "completed"
  ).length;
}

export default function SubmissionsStack({
  plans,
  reports,
  documents,
  evaluations,
  onDownloadDocument,
}: SubmissionsStackProps) {
  const submittedPlansCount = countActiveSubmissions(plans);
  const submittedReportsCount = countActiveSubmissions(reports);
  const submittedEvaluationsCount = countActiveSubmissions(evaluations);

  return (
    <div className="card flex flex-col gap-4 p-4 sm:p-5">
      {/* 1. Plans (Stage 1) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">1. Internship plans</h2>
            <span className="pill-neutral text-[10px] py-0.5 px-1.5 font-medium tabular">
              {submittedPlansCount}/{plans.length} submitted
            </span>
          </div>
          <span className="meta text-xs">
            {plans.length === 1 ? "Combined period (30 op)" : "2 periods (2 × 15 op)"}
          </span>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-control bg-surface-muted/60 border border-dashed border-border p-3 text-center">
            <p className="meta text-xs">No internship plan submitted yet.</p>
            <Link href="/planning" className="link text-xs font-semibold mt-1 inline-block">
              Create plan →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-control border py-2 px-3 ${
                  item.isLocked
                    ? "border-dashed border-border bg-surface-muted/30 opacity-70"
                    : "border-border bg-surface-muted/60 hover:bg-surface-muted transition-colors"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink text-sm truncate">{item.title}</span>
                    {getStatusPill(item.isLocked ? "locked" : item.status)}
                  </div>
                  <p className="meta text-xs truncate mt-0.5">
                    {item.isLocked
                      ? item.lockedReason || "Locked until previous stage is completed"
                      : `${item.subtitle ? `${item.subtitle} · ` : ""}${item.metaDate || "Draft in progress"}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.actionHref && (
                    <Link
                      href={item.actionHref}
                      onClick={item.onAction}
                      className={
                        item.isLocked
                          ? "btn-secondary text-xs py-1 px-2.5"
                          : "btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      }
                    >
                      <span>{item.actionLabel || "View plan"}</span>
                      {!item.isLocked && <span aria-hidden="true">→</span>}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-border" />

      {/* 2. Reports & Attached Documents (Stage 2) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">2. Internship reports &amp; documents</h2>
            <span className="pill-neutral text-[10px] py-0.5 px-1.5 font-medium tabular">
              {submittedReportsCount}/{reports.length} submitted
            </span>
          </div>
          <span className="meta text-xs">
            {reports.length === 1 ? "Combined report" : "2 reports required"}
          </span>
        </div>

        {/* Report items */}
        {reports.length === 0 ? (
          <div className="rounded-control bg-surface-muted/60 border border-dashed border-border p-3 text-center">
            <p className="meta text-xs">
              Reports can be prepared and submitted once your internship plan has been approved.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-control border py-2 px-3 ${
                  item.isLocked
                    ? "border-dashed border-border bg-surface-muted/30 opacity-70"
                    : "border-border bg-surface-muted/60 hover:bg-surface-muted transition-colors"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink text-sm truncate">{item.title}</span>
                    {getStatusPill(item.isLocked ? "locked" : item.status)}
                  </div>
                  <p className="meta text-xs truncate mt-0.5">
                    {item.isLocked
                      ? item.lockedReason || "Locked until previous stage is completed"
                      : `${item.subtitle ? `${item.subtitle} · ` : ""}${item.metaDate || "Draft in progress"}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.actionHref && (
                    <Link
                      href={item.actionHref}
                      onClick={item.onAction}
                      className={
                        item.isLocked
                          ? "btn-secondary text-xs py-1 px-2.5"
                          : item.status === "approved"
                          ? "btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          : "btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      }
                    >
                      <span>{item.actionLabel || (item.status === "approved" ? "View report" : "Edit report")}</span>
                      {!item.isLocked && <span aria-hidden="true">→</span>}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attached documents subsection - Compact file rows */}
        <div className="mt-1 flex flex-col gap-1.5 rounded-control bg-surface border border-border/70 p-2.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold text-ink">
              Attached documents ({documents.length})
            </span>
            <Link href="/report" className="link-quiet text-[11px]">
              Manage in report editor →
            </Link>
          </div>

          {documents.length === 0 ? (
            <p className="meta text-xs italic px-0.5 py-1">
              No documents attached yet. Attach files when editing your report.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-surface-muted/50 border border-border/50 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg
                      className="size-3.5 shrink-0 text-ink-muted"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span className="font-medium text-ink truncate">{doc.name}</span>
                    <span className="meta text-[11px] tabular shrink-0">({doc.size})</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="meta text-[11px] hidden sm:inline">{doc.date}</span>
                    <button
                      type="button"
                      onClick={() => onDownloadDocument?.(doc.name)}
                      className="btn-secondary py-0.5 px-2 text-[11px] h-6"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="border-border" />

      {/* 3. Evaluation (Stage 3) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">3. Guidance evaluations</h2>
            <span className="pill-neutral text-[10px] py-0.5 px-1.5 font-medium tabular">
              {submittedEvaluationsCount}/{evaluations.length} submitted
            </span>
          </div>
          <span className="meta text-xs">
            {evaluations.length === 1 ? "Combined evaluation" : "2 evaluations required"}
          </span>
        </div>

        {evaluations.length === 0 ? (
          <div className="rounded-control bg-surface-muted/60 border border-dashed border-border p-3 text-center">
            <p className="meta text-xs">Evaluations open once report is approved.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {evaluations.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-control border py-2 px-3 ${
                  item.isLocked
                    ? "border-dashed border-border bg-surface-muted/30 opacity-70"
                    : "border-border bg-surface-muted/60 hover:bg-surface-muted transition-colors"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink text-sm truncate">{item.title}</span>
                    {getStatusPill(item.isLocked ? "locked" : item.status)}
                  </div>
                  <p className="meta text-xs truncate mt-0.5">
                    {item.isLocked
                      ? item.lockedReason || "Locked until final report is approved"
                      : `${item.subtitle ? `${item.subtitle} · ` : ""}${item.metaDate || "Ready to be completed"}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.actionHref && (
                    <Link
                      href={item.actionHref}
                      onClick={item.onAction}
                      className={
                        item.isLocked
                          ? "btn-secondary text-xs py-1 px-2.5"
                          : "btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      }
                    >
                      <span>{item.actionLabel || (item.isLocked ? "View preview" : "Open evaluation")}</span>
                      {!item.isLocked && <span aria-hidden="true">→</span>}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
