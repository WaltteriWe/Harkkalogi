"use client";

import React from "react";

export interface DocumentTemplate {
  name: string;
  category?: string;
  description: string;
  format: string;
  size: string;
}

export interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  onDownload?: (fileName: string) => void;
  downloadLabel?: string;
}

export default function DocumentTemplateCard({
  template,
  onDownload,
  downloadLabel = "Download template",
}: DocumentTemplateCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-control border border-border bg-surface-muted/40 p-4 transition-colors hover:border-border-strong">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="pill-neutral text-[10px] uppercase tracking-wider">
            {template.format}
          </span>
          <span className="meta tabular text-xs">{template.size}</span>
        </div>

        <h3 className="mt-2 text-sm font-semibold text-ink">
          {template.name}
        </h3>
        <p className="meta mt-1 text-xs leading-relaxed">
          {template.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => onDownload?.(template.name)}
          className="btn-secondary w-full py-1.5 text-xs font-semibold"
        >
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}

