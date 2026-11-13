"use client";

import React from "react";
import { useInternship } from "@/context/InternshipContext";

export default function InternshipSelector() {
  const {
    internships,
    activeInternshipId,
    setActiveInternshipId,
    scope,
    targetHours,
    loggedHours,
    isPlanSubmitted,
  } = useInternship();

  // If student hasn't submitted/confirmed their plan yet, do not display premature period switcher
  if (!isPlanSubmitted) {
    return null;
  }

  if (scope === "combined" || internships.length <= 1) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-ink text-xs font-bold">
            30
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Koko harjoittelu · 30 op
            </p>
            <p className="meta text-xs text-ink-muted">
              Yhdistetty harjoittelujakso ({loggedHours} / {targetHours} h)
            </p>
          </div>
        </div>
        <span className="pill-brand text-xs">Yhdistetty jakso</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label text-xs">Valitse harjoittelujakso</span>
        <span className="meta text-xs">Tutkintovaatimus: 2 × 15 op (800 h)</span>
      </div>

      <div
        role="tablist"
        aria-label="Harjoittelujaksot"
        className="grid grid-cols-2 gap-2 sm:gap-3"
      >
        {internships.map((internship) => {
          const isActive = internship.id === activeInternshipId;
          const isDone = internship.status === "completed";
          const isLocked = Boolean(internship.isLocked);

          if (isLocked) {
            return (
              <div
                key={internship.id}
                role="tab"
                aria-selected={false}
                aria-disabled="true"
                className="flex flex-col text-left rounded-card border border-dashed border-border bg-surface-muted/40 p-3 opacity-60 cursor-not-allowed select-none"
                title="Avautuu Harjoittelu 1:n suorittamisen jälkeen"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-muted">
                    {internship.title}
                  </span>
                  <span className="pill-neutral text-[11px] py-0.5 px-1.5 flex items-center gap-1">
                    Lukittu
                  </span>
                </div>
                <p className="meta mt-1 text-xs text-ink-muted line-clamp-1">
                  Avautuu Harjoittelu 1:n jälkeen · {internship.credits} op ({internship.targetHours} h)
                </p>
              </div>
            );
          }

          return (
            <button
              key={internship.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveInternshipId(internship.id)}
              className={`flex flex-col text-left rounded-card border p-3 transition-all cursor-pointer ${
                isActive
                  ? "border-brand bg-brand-soft/30 ring-2 ring-brand-soft"
                  : "border-border bg-surface hover:bg-surface-muted/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isActive ? "text-brand-ink" : "text-ink"
                  }`}
                >
                  {internship.title}
                </span>
                <span
                  className={
                    isDone
                      ? "pill-success text-[11px] py-0.5 px-1.5"
                      : isActive
                      ? "pill-brand text-[11px] py-0.5 px-1.5"
                      : "pill-neutral text-[11px] py-0.5 px-1.5"
                  }
                >
                  {isDone ? "Valmis ✓" : isActive ? "Aktiivinen" : "Ei aloitettu"}
                </span>
              </div>
              <p className="meta mt-1 text-xs text-ink-muted line-clamp-1">
                {internship.company || "Työpaikka ei määritelty"} · {internship.credits} op ({internship.targetHours} h)
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
