"use client";

import React from "react";

export type StepStatusBannerVariant =
  | "review"
  | "feedback"
  | "approved"
  | "changes_requested"
  | "info";

export interface StepStatusBannerProps {
  /** The state variant determining color theme and icon */
  variant?: StepStatusBannerVariant;
  /** Process step identifier for intelligent default titles & badges */
  step?: "plan" | "report" | "evaluation";
  /** Current step status (e.g. 'draft' | 'submitted' | 'approved' | 'changes_requested') */
  status?: string;
  /** Main heading text */
  title?: string;
  /** Subtitle or contextual message */
  description?: string;
  /** Badge text shown in the pill */
  badge?: string;
  /** Custom badge class override if needed */
  badgeClassName?: string;
  /** Teacher feedback text to display */
  feedback?: string;
  /** Label above feedback text, e.g. "Teacher feedback:" */
  feedbackLabel?: string;
  /** Teacher name to interpolate into default title */
  feedbackAuthor?: string;
  /** Submission timestamp for default review descriptions */
  submittedAt?: string | null;
  /** Optional status dot indicator */
  showDot?: boolean;
  /** Optional action element on the right */
  action?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

export function resolveStepStatusBannerConfig(props: StepStatusBannerProps): {
  variant: StepStatusBannerVariant;
  title: string;
  description?: string;
  badge: string;
  badgeClass: string;
  containerClass: string;
  titleClass: string;
  dotClass: string;
  feedback?: string;
} | null {
  const {
    variant: explicitVariant,
    step,
    status,
    title: explicitTitle,
    description: explicitDescription,
    badge: explicitBadge,
    badgeClassName: explicitBadgeClass,
    feedback,
    feedbackAuthor,
    submittedAt,
  } = props;

  // Determine effective variant
  let variant: StepStatusBannerVariant = explicitVariant || "info";

  if (!explicitVariant && status) {
    if (status === "approved") {
      variant = "feedback";
    } else if (status === "submitted" || status === "under_review" || status === "needs_review") {
      variant = "review";
    } else if (status === "changes_requested") {
      variant = "changes_requested";
    } else if (status === "draft") {
      // Drafts do not display a step status banner
      return null;
    }
  }

  // Calculate default title based on step and variant
  let title = explicitTitle;
  if (!title) {
    if (step === "plan") {
      if (variant === "feedback" || variant === "approved") {
        title = "Plan approved by your teacher";
      } else if (variant === "review") {
        title = "Plan is waiting for teacher approval";
      } else if (variant === "changes_requested") {
        title = "Changes requested for your plan";
      } else {
        title = "Plan status";
      }
    } else if (step === "report") {
      if (variant === "feedback" || variant === "approved") {
        title = feedbackAuthor
          ? `Report approved by ${feedbackAuthor}`
          : "Report approved by teacher";
      } else if (variant === "review") {
        title = "Report is under teacher review";
      } else if (variant === "changes_requested") {
        title = "Changes requested for your report";
      } else {
        title = "Report status";
      }
    } else if (step === "evaluation") {
      if (variant === "feedback" || variant === "approved") {
        title = "Harjoitteluraportti hyväksytty · Lomake auki";
      } else if (variant === "review") {
        title = "Ohjaavan opettajan näkymä (Read-only review)";
      } else {
        title = "Arvioinnin tila";
      }
    } else {
      title =
        variant === "feedback" || variant === "approved"
          ? "Approved"
          : variant === "review"
            ? "Under review"
            : variant === "changes_requested"
              ? "Changes requested"
              : "Status update";
    }
  }

  // Calculate default description based on step and variant
  let description = explicitDescription;
  if (!description && !feedback) {
    if (step === "plan" && variant === "review") {
      description = `Submitted on ${submittedAt || "recently"}. You can still update your plan below.`;
    } else if (step === "report" && variant === "review") {
      description = `Submitted on ${submittedAt || "recently"}. You can still review your report details below.`;
    }
  }

  // Theme styling based on resolved variant
  let containerClass = "rounded-control p-4 text-sm transition-all";
  let titleClass = "font-semibold text-base";
  let defaultBadge = "Info";
  let defaultBadgeClass = "pill-neutral";
  let dotClass = "bg-ink-muted";

  switch (variant) {
    case "feedback":
    case "approved":
      containerClass += " bg-success-soft border border-success/20 text-success";
      titleClass += " text-success";
      defaultBadge = "Approved";
      defaultBadgeClass = "pill-success";
      dotClass = "bg-success";
      break;
    case "review":
      containerClass += " bg-info-soft border border-info/20 text-info";
      titleClass += " text-info";
      defaultBadge = "Submitted";
      defaultBadgeClass = "pill-info";
      dotClass = "bg-info";
      break;
    case "changes_requested":
      containerClass += " bg-danger-soft border border-danger/20 text-danger";
      titleClass += " text-danger";
      defaultBadge = "Changes requested";
      defaultBadgeClass = "pill-danger";
      dotClass = "bg-danger";
      break;
    case "info":
    default:
      containerClass += " bg-info-soft border border-info/20 text-info";
      titleClass += " text-info";
      defaultBadge = "Info";
      defaultBadgeClass = "pill-info";
      dotClass = "bg-info";
      break;
  }

  return {
    variant,
    title,
    description,
    badge: explicitBadge || defaultBadge,
    badgeClass: explicitBadgeClass || defaultBadgeClass,
    containerClass,
    titleClass,
    dotClass,
    feedback,
  };
}

export default function StepStatusBanner(props: StepStatusBannerProps) {
  const config = resolveStepStatusBannerConfig(props);
  if (!config) return null;

  const {
    title,
    description,
    badge,
    badgeClass,
    containerClass,
    titleClass,
    dotClass,
    feedback,
  } = config;
  const { feedbackLabel, showDot, action, className } = props;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${containerClass} flex flex-col gap-1.5 ${className || ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {showDot && (
              <span
                className={`size-2.5 rounded-full shrink-0 ${dotClass}`}
                aria-hidden="true"
              />
            )}
            <p className={titleClass}>{title}</p>
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {action}
          </div>
        )}
      </div>

      {feedback && (
        <div className="mt-1 pt-1 border-t border-current/10">
          {feedbackLabel && (
            <span className="text-xs font-semibold text-ink-muted block mb-0.5">
              {feedbackLabel}
            </span>
          )}
          <p className="text-ink leading-relaxed text-sm">{feedback}</p>
        </div>
      )}
    </div>
  );
}
