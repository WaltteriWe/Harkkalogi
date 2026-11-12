"use client";

import React, { useState, useRef, useEffect } from "react";

export interface ScaleLegendProps {
  minLabel?: string;
  maxLabel?: string;
  labels?: string[];
  className?: string;
}

export interface StarRatingProps {
  value: number; // 0 (unselected) up to maxStars
  maxStars?: number; // selectable by the page (default 5)
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
  showValueText?: boolean;
  labels?: string[] | Record<number, string>;
  className?: string;
}

export interface StarEvaluationSubject {
  id: string;
  subject: string;
  description?: string;
  minLabel?: string; // e.g. "1 = Heikko"
  maxLabel?: string; // e.g. "5 = Erinomainen"
  labels?: string[]; // e.g. ["Heikko", "Välttävä", "Tyydyttävä", "Hyvä", "Erinomainen"]
}

export interface StarEvaluationGroupProps {
  id?: string;
  heading: string;
  subject?: string;
  maxStars?: number;
  items: StarEvaluationSubject[];
  values: Record<string, number>;
  onChange?: (id: string, rating: number) => void;
  readOnly?: boolean;
  disabled?: boolean;
  scaleLegend?: ScaleLegendProps;
  showLegend?: boolean;
  collapsibleOnComplete?: boolean;
  defaultExpanded?: boolean;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
}

/**
 * Pure helper to check if all items in an evaluation group have a selected rating > 0.
 */
export function isEvaluationGroupComplete(
  items: StarEvaluationSubject[],
  values: Record<string, number>
): boolean {
  if (!items || items.length === 0) return false;
  return items.every((item) => (values[item.id] ?? 0) > 0);
}

/**
 * Pure helper to generate array of 1..maxStars (clamped between 1 and 20).
 */
export function getStarNumbers(maxStars: number = 5): number[] {
  const count = Math.max(1, Math.min(20, Math.floor(Number.isFinite(maxStars) ? maxStars : 5)));
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Pure helper to resolve a human-readable label for a given star index.
 */
export function resolveStarLabel(
  star: number,
  labels?: string[] | Record<number, string>,
  minLabel?: string,
  maxLabel?: string,
  maxStars: number = 5
): string | undefined {
  if (star <= 0) return undefined;

  if (labels) {
    if (Array.isArray(labels)) {
      const match = labels[star - 1];
      if (match) return match;
    } else if (labels[star]) {
      return labels[star];
    }
  }

  // Fallback to min/max labels if exact 1..maxStars array is not provided
  if (star === 1 && minLabel) {
    return minLabel.replace(/^1\s*=\s*/, "").trim();
  }
  if (star === maxStars && maxLabel) {
    return maxLabel.replace(/^[0-9]+\s*=\s*/, "").trim();
  }

  return undefined;
}

/**
 * Scale Legend subcomponent that renders the rating explanation under or next to the section heading.
 */
export function ScaleLegend({
  minLabel = "1 = Heikko",
  maxLabel = "5 = Erinomainen",
  labels,
  className = "",
}: ScaleLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-control border border-border bg-surface-muted px-3.5 py-2 text-xs text-ink-muted ${className}`}
    >
      <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
        Asteikko
      </span>
      <span className="text-border-strong hidden sm:inline">|</span>

      {labels && labels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {labels.map((lbl, idx) => (
            <span key={idx} className="inline-flex items-center gap-1">
              <span className="font-mono text-ink font-semibold">{idx + 1}</span>
              <span>=</span>
              <span>{lbl}</span>
              {idx < labels.length - 1 && (
                <span className="text-ink-subtle/50 ml-1.5">·</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span>{minLabel}</span>
          <span className="text-ink-subtle">...</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Star SVG icon with smooth geometry and configurable fill/stroke.
 */
function StarIcon({
  filled,
  sizeClass = "size-5",
  interactive = false,
}: {
  filled: boolean;
  sizeClass?: string;
  interactive?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${
        filled
          ? "fill-amber-400 text-amber-500 drop-shadow-[0_1px_2px_rgba(245,158,11,0.25)]"
          : interactive
          ? "fill-transparent text-border-strong hover:text-amber-300"
          : "fill-transparent text-border-strong"
      } transition-colors`}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeWidth={filled ? "1.25" : "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

/**
 * Standalone star rating bar with configurable maxStars, hover preview, on-hover explanation, and keyboard access.
 */
export function StarRating({
  value,
  maxStars = 5,
  onChange,
  readOnly = false,
  disabled = false,
  size = "md",
  ariaLabel = "Rating",
  showValueText = false,
  labels,
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const isInteractive = !readOnly && !disabled && Boolean(onChange);
  const starNumbers = getStarNumbers(maxStars);

  const displayRating = hoverRating !== null ? hoverRating : value;
  const activeLabel = resolveStarLabel(displayRating, labels, undefined, undefined, maxStars);

  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  }[size];

  const handleClick = (star: number) => {
    if (!isInteractive || !onChange) return;
    onChange(star === value ? 0 : star);
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {/* Stationary stars container (never shifts horizontally) */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onMouseLeave={() => isInteractive && setHoverRating(null)}
      >
        {starNumbers.map((star) => {
          const isFilled = star <= displayRating;
          const isSelected = star === value;

          if (!isInteractive) {
            return (
              <span
                key={star}
                className="inline-flex p-0.5"
                title={`${star} / ${maxStars}${activeLabel ? ` · ${activeLabel}` : ""}`}
              >
                <StarIcon filled={isFilled} sizeClass={sizeClasses} interactive={false} />
              </span>
            );
          }

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${star} / ${maxStars} tähteä${
                labels ? ` (${resolveStarLabel(star, labels, undefined, undefined, maxStars) ?? ""})` : ""
              }`}
              className="group rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => handleClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              onFocus={() => setHoverRating(star)}
              onBlur={() => setHoverRating(null)}
            >
              <StarIcon filled={isFilled} sizeClass={sizeClasses} interactive={true} />
            </button>
          );
        })}
      </div>

      {/* Numerical score & live on-hover label badge */}
      {(showValueText || Boolean(labels)) && (
        <div className="flex items-center gap-1.5 min-w-[6.5rem] sm:min-w-[8.5rem] justify-start text-xs shrink-0">
          <span className="font-mono text-ink-muted tabular shrink-0">
            {displayRating > 0 ? `${displayRating} / ${maxStars}` : `– / ${maxStars}`}
          </span>
          {activeLabel && (
            <span
              className={`truncate transition-colors ${
                hoverRating !== null
                  ? "font-medium text-brand"
                  : value > 0
                  ? "text-ink font-medium"
                  : "text-ink-muted"
              }`}
              title={activeLabel}
            >
              · {activeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Higher-level component that dynamically maps evaluation subjects with a top scale legend and vertically aligned stars.
 * Supports auto-collapsing into a compact format when all items in this group have been rated and user is not editing.
 */
export function StarEvaluationGroup({
  id,
  heading,
  subject,
  maxStars = 5,
  items,
  values,
  onChange,
  readOnly = false,
  disabled = false,
  scaleLegend,
  showLegend = true,
  collapsibleOnComplete = true,
  defaultExpanded = true,
  isCollapsed: controlledCollapsed,
  onCollapseChange,
  className = "",
}: StarEvaluationGroupProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(defaultExpanded);

  const isComplete = isEvaluationGroupComplete(items, values);

  // If controlled, use that; otherwise calculate from complete & editing status
  const shouldCollapse =
    controlledCollapsed !== undefined
      ? controlledCollapsed
      : collapsibleOnComplete && isComplete && !isEditing;

  // When clicking outside this group: if it is complete, collapse it!
  useEffect(() => {
    if (!isEditing || !isComplete || !collapsibleOnComplete) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
        onCollapseChange?.(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isEditing, isComplete, collapsibleOnComplete, onCollapseChange]);

  const handleCardClick = () => {
    if (shouldCollapse) {
      setIsEditing(true);
      onCollapseChange?.(false);
    }
  };

  const handleFocus = () => {
    if (shouldCollapse) {
      setIsEditing(true);
      onCollapseChange?.(false);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (
      isComplete &&
      collapsibleOnComplete &&
      containerRef.current &&
      !containerRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsEditing(false);
      onCollapseChange?.(true);
    }
  };

  return (
    <section
      id={id}
      ref={containerRef}
      onClick={handleCardClick}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      className={`card flex flex-col border border-border bg-surface transition-all duration-200 ${
        shouldCollapse
          ? "gap-3 p-4 sm:p-5 cursor-pointer hover:border-border-strong hover:shadow-xs"
          : "gap-5 p-5 sm:p-6"
      } ${className}`}
    >
      {/* Header section */}
      {shouldCollapse ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <h3 className="text-base font-semibold text-ink leading-snug">
              {heading}
            </h3>
            <span className="pill-success text-xs py-0.5 px-2">
              ✓ {items.length}/{items.length} arvioitu
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              onCollapseChange?.(false);
            }}
            className="link-quiet inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover shrink-0 rounded p-1"
            aria-label={`Avaa lisätiedot: ${heading}`}
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
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-ink">{heading}</h3>
              {subject && (
                <p className="text-sm text-ink-muted leading-relaxed">
                  {subject}
                </p>
              )}
            </div>

            {isComplete && collapsibleOnComplete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                  onCollapseChange?.(true);
                }}
                className="link-quiet inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink shrink-0 rounded p-1"
                title="Tiivistä osio"
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
            )}
          </div>

          {showLegend && (
            <ScaleLegend
              minLabel={scaleLegend?.minLabel}
              maxLabel={scaleLegend?.maxLabel}
              labels={
                scaleLegend?.labels ?? [
                  "Heikko / Ei vastannut",
                  "Välttävä",
                  "Tyydyttävä",
                  "Hyvä",
                  "Erinomainen / Vastasi täysin",
                ]
              }
            />
          )}
        </div>
      )}

      {/* Dynamically mapped subjects */}
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const currentRating = values[item.id] ?? 0;

          // Merge item min/max labels into labels array if item.labels not explicitly passed
          const itemLabels =
            item.labels ??
            (item.minLabel || item.maxLabel
              ? [
                  item.minLabel?.replace(/^1\s*=\s*/, "") ?? "Heikko",
                  "Välttävä",
                  "Tyydyttävä",
                  "Hyvä",
                  item.maxLabel?.replace(/^[0-9]+\s*=\s*/, "") ?? "Erinomainen",
                ]
              : undefined);

          return (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
                shouldCollapse ? "py-2 gap-2" : "py-4 gap-3 sm:gap-6"
              } first:pt-0 last:pb-0`}
            >
              <div className="min-w-0 flex-1">
                <h4
                  className={`font-semibold text-ink leading-snug ${
                    shouldCollapse ? "text-sm font-medium" : "text-sm"
                  }`}
                >
                  {item.subject}
                </h4>
                {!shouldCollapse && item.description && (
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Stationary Star Rating column with on-hover explanation */}
              <div className="flex items-center justify-start sm:justify-end shrink-0 sm:min-w-[280px]">
                <StarRating
                  value={currentRating}
                  maxStars={maxStars}
                  onChange={(rating) => onChange?.(item.id, rating)}
                  readOnly={readOnly || shouldCollapse}
                  disabled={disabled}
                  ariaLabel={`${item.subject} arviointi`}
                  showValueText
                  labels={itemLabels}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
