"use client";

import React from "react";
import Link from "next/link";

interface LockedNoticeCardProps {
  title?: string;
  badge?: string;
  message?: string;
  timelineHref?: string;
  timelineLabel?: string;
  currentStepHref: string;
  currentStepLabel: string;
}

export default function LockedNoticeCard({
  title = "Lomake on lukittu",
  badge = "Esikatselutila",
  message = "Tämä arviointi aukeaa, kun ohjaava opettaja on hyväksynyt loppuraporttisi.",
  timelineHref = "/",
  timelineLabel = "Katso aikajana yleisnäkymässä",
  currentStepHref = "/reports",
  currentStepLabel = "Siirry nykyiseen vaiheeseen: Raportointi",
}: LockedNoticeCardProps) {
  return (
    <section className="rounded-card border border-border bg-surface-muted/60 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface border border-border text-base shadow-2xs"
            aria-hidden="true"
          >
            🔒
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              <span className="pill-warning text-[11px] py-0.5 px-2">{badge}</span>
            </div>
            <p className="meta mt-1 text-xs text-ink-muted leading-relaxed">
              {message}{" "}
              <Link
                href={timelineHref}
                className="link-quiet font-medium underline underline-offset-2 hover:text-brand"
              >
                {timelineLabel}
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <Link
            href={currentStepHref}
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <span>{currentStepLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
