"use client";

import React from "react";
import Link from "next/link";

export interface ProcessPageHeaderProps {
  /** Page title, e.g. "Internship plan", report.title, "Harjoittelun ohjauksen arviointi" */
  title: string;
  /** Back navigation target link, defaults to "/" */
  backHref?: string;
  /** Back navigation link label, defaults to "← Back to overview" */
  backLabel?: string;
  /** Subtitle or autosave metadata (e.g. "Draft saved automatically · last saved 14:20") */
  subtitle?: React.ReactNode;
  /** Lifecycle status string: 'draft' | 'submitted' | 'approved' | 'changes_requested' */
  status?: string;
  /** Custom status badge override (e.g. for Evaluation's "Teacher view" or "Ready for submission") */
  statusBadge?: React.ReactNode;
  /** Optional custom CSS classes for the outer header */
  className?: string;
}

export function getStatusPill(status?: string, customBadge?: React.ReactNode) {
  if (customBadge) {
    if (typeof customBadge === "string") {
      return <span className="pill-neutral text-sm px-3 py-1">{customBadge}</span>;
    }
    return customBadge;
  }

  switch (status?.toLowerCase()) {
    case "approved":
      return <span className="pill-success text-sm px-3 py-1">Approved</span>;
    case "submitted":
    case "under_review":
    case "needs_review":
      return <span className="pill-info text-sm px-3 py-1">Submitted</span>;
    case "changes_requested":
      return <span className="pill-danger text-sm px-3 py-1">Changes requested</span>;
    case "draft":
      return <span className="pill-neutral text-sm px-3 py-1">Draft</span>;
    default:
      return null;
  }
}

export default function ProcessPageHeader({
  title,
  backHref = "/",
  backLabel = "← Back to overview",
  subtitle,
  status,
  statusBadge,
  className = "",
}: ProcessPageHeaderProps) {
  const pill = getStatusPill(status, statusBadge);

  return (
    <div className={`flex flex-col gap-0.5 ${className}`.trim()}>
      <Link
        href={backHref}
        className="link-quiet inline-flex items-center gap-1.5 text-sm"
      >
        {backLabel}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {pill && <div>{pill}</div>}
      </div>

      {subtitle && (
        typeof subtitle === "string" ? (
          <p className="meta mt-1 text-sm text-ink-muted">{subtitle}</p>
        ) : (
          subtitle
        )
      )}
    </div>
  );
}
