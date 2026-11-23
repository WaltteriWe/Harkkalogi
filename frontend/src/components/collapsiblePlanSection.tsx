"use client";

import React from "react";

export interface CollapsiblePlanSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  isComplete?: boolean;
  statusBadge?: React.ReactNode;
  summaryPreview?: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: "plain" | "card";
  className?: string;
}

export function CollapsiblePlanSection({
  id,
  title,
  subtitle,
  isComplete = false,
  statusBadge,
  summaryPreview,
  isCollapsed,
  onToggle,
  children,
  variant = "plain",
  className = "",
}: CollapsiblePlanSectionProps) {
  const contentId = `${id}-content`;

  if (isCollapsed) {
    const collapsedClass =
      variant === "card"
        ? `card flex flex-col gap-2 p-4 sm:p-5 cursor-pointer hover:border-border-strong hover:shadow-xs transition-all duration-200 bg-surface ${className}`
        : `flex flex-col gap-2 p-3.5 sm:p-4 rounded-control border border-border bg-surface-muted/60 cursor-pointer hover:border-border-strong hover:bg-surface-muted transition-all duration-200 ${className}`;

    return (
      <section
        id={id}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="region"
        aria-label={title}
        aria-expanded={false}
        className={collapsedClass}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <h2 className="text-base font-semibold text-ink leading-snug">{title}</h2>
            {statusBadge ? (
              statusBadge
            ) : isComplete ? (
              <span className="pill-success text-xs py-0.5 px-2">✓ Valmis</span>
            ) : (
              <span className="pill-neutral text-xs py-0.5 px-2">Keskeneräinen</span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="link-quiet inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover shrink-0 rounded p-1"
            aria-label={`Avaa lisätiedot: ${title}`}
          >
            <span>Muokkaa</span>
            <svg
              className="size-3.5 stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {summaryPreview && (
          <div className="text-xs text-ink-muted truncate pt-1 border-t border-border/50">
            {summaryPreview}
          </div>
        )}
      </section>
    );
  }

  const expandedClass =
    variant === "card"
      ? `card flex flex-col gap-4 p-5 sm:p-6 transition-all duration-200 bg-surface ${className}`
      : `flex flex-col gap-4 transition-all duration-200 ${className}`;

  return (
    <section
      id={id}
      role="region"
      aria-label={title}
      aria-expanded={true}
      className={expandedClass}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {statusBadge ? (
              statusBadge
            ) : isComplete ? (
              <span className="pill-success text-xs py-0.5 px-2">✓ Valmis</span>
            ) : (
              <span className="pill-neutral text-xs py-0.5 px-2">Keskeneräinen</span>
            )}
          </div>
          {subtitle && (
            <p className="meta text-xs text-ink-muted leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="link-quiet inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink shrink-0 rounded p-1"
          title="Tiivistä osio"
          aria-label={`Tiivistä osio: ${title}`}
          aria-controls={contentId}
        >
          <span>Tiivistä</span>
          <svg
            className="size-3.5 stroke-current"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      <div id={contentId} className="pt-1">
        {children}
      </div>
    </section>
  );
}
