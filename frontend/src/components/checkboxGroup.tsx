"use client";

import React from "react";

export interface CheckboxItem {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  heading: string;
  subject?: string;
  items: CheckboxItem[];
  selectedIds: string[];
  onChange?: (selectedIds: string[]) => void;
  readOnly?: boolean;
  disabled?: boolean;
  columns?: 1 | 2;
  idPrefix?: string;
  className?: string;
}

/**
 * Pure helper to toggle an item id within a selection array.
 */
export function toggleItemInSelection(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
}

export function CheckboxGroup({
  heading,
  subject,
  items,
  selectedIds,
  onChange,
  readOnly = false,
  disabled = false,
  columns = 1,
  idPrefix = "cg",
  className = "",
}: CheckboxGroupProps) {
  const isInteractive = !readOnly && !disabled;

  const handleToggle = (id: string) => {
    if (!isInteractive || !onChange) return;
    onChange(toggleItemInSelection(selectedIds, id));
  };

  const gridClass =
    columns === 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-3"
      : "flex flex-col gap-2.5";

  return (
    <fieldset
      className={`card flex flex-col gap-4 border border-border bg-surface p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-base font-semibold text-ink">{heading}</legend>
          {selectedIds.length > 0 && (
            <span className="pill-neutral text-xs tabular font-mono">
              {selectedIds.length} / {items.length} valittu
            </span>
          )}
        </div>
        {subject && (
          <p className="text-sm text-ink-muted leading-relaxed">{subject}</p>
        )}
      </div>

      <div className={gridClass}>
        {items.map((item) => {
          const isChecked = selectedIds.includes(item.id);
          const itemDisabled = disabled || item.disabled || readOnly;
          const inputId = `${idPrefix}-${item.id}`;

          return (
            <label
              key={item.id}
              htmlFor={inputId}
              className={`flex items-start gap-3 rounded-control border p-3 transition-colors ${
                isChecked
                  ? "border-brand/40 bg-brand-soft/20 text-ink"
                  : "border-border bg-surface text-ink hover:bg-surface-muted"
              } ${
                itemDisabled
                  ? "cursor-default opacity-85"
                  : "cursor-pointer hover:border-border-strong"
              }`}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={isChecked}
                disabled={itemDisabled}
                onChange={() => handleToggle(item.id)}
                className="mt-0.5 size-4 rounded accent-brand shrink-0 cursor-pointer disabled:cursor-default"
                aria-label={item.label}
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink block leading-snug">
                  {item.label}
                </span>
                {item.description && (
                  <span className="text-xs text-ink-muted block mt-1 leading-relaxed">
                    {item.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
