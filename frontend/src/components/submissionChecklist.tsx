"use client";

import React from "react";

export interface SubmissionChecklistItem {
  id?: string;
  label: React.ReactNode;
  done: boolean;
}

export interface SubmissionChecklistNote {
  title?: string;
  text: string;
}

export interface SubmissionChecklistProps {
  /** Heading above the checklist, e.g. "Before you submit" or "Plan status" */
  title: string;
  /** Array of checklist items to display */
  items: SubmissionChecklistItem[];
  /** Optional contextual note banner at the bottom (orange brand-soft box) */
  note?: SubmissionChecklistNote | string | null;
  /** Optional sticky positioning (e.g. sticky top-6) */
  sticky?: boolean;
  /** Optional custom CSS classes for the aside container */
  className?: string;
}

export function ChecklistIcon({ done }: { done: boolean }) {
  return done ? (
    <span className="step-icon-done shrink-0" aria-label="Completed">
      <svg
        className="size-3.5 stroke-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  ) : (
    <span className="step-icon-todo shrink-0" aria-label="To do" />
  );
}

export default function SubmissionChecklist({
  title,
  items,
  note,
  sticky = false,
  className = "",
}: SubmissionChecklistProps) {
  return (
    <aside
      className={`card flex flex-col gap-5 ${
        sticky ? "sticky top-6" : ""
      } ${className}`.trim()}
    >
      <h2 className="text-base font-semibold text-ink">{title}</h2>

      <ul className="flex flex-col gap-3.5 text-sm">
        {items.map((item, index) => {
          const key = item.id || `checklist-item-${index}`;

          return (
            <li key={key} className="flex items-center gap-3">
              <ChecklistIcon done={item.done} />
              <span className="text-ink">{item.label}</span>
            </li>
          );
        })}
      </ul>

      {note && (
        <div className="mt-1 rounded-control bg-brand-soft p-4 text-sm text-brand-ink leading-relaxed">
          {typeof note === "string" ? (
            <p>{note}</p>
          ) : (
            <>
              {note.title && (
                <p className="font-semibold text-xs tracking-wider uppercase mb-1">
                  {note.title}
                </p>
              )}
              <p>{note.text}</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
