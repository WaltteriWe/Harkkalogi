"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { type StepStatus, type Step, useInternshipSteps } from "../hooks/steps";
import { useReport } from "../context/ReportContext";
import { usePlan } from "../context/PlanContext";
import { useInternship } from "../context/InternshipContext";
import { formatDate } from "../lib/dates";

export default function ReportingProgress() {
  const { report } = useReport();
  const { plan } = usePlan();
  const { activeInternship, targetHours, loggedHours } = useInternship();

  const isPlanApproved = plan.status === "approved";
  const isPlanSubmitted = plan.status === "submitted" || isPlanApproved;
  // Crucial: Report submission/approval is strictly gated on plan approval!
  const isReportApproved = isPlanApproved && report.status === "approved";
  const isReportSubmitted = isPlanApproved && (report.status === "submitted" || isReportApproved);

  const dynamicSteps = useMemo<Step[]>(() => {
    // 1. Plan submitted
    const step1Status: StepStatus = isPlanSubmitted ? "done" : "current";
    const step1Detail = isPlanSubmitted
      ? plan.submittedAt
        ? `Submitted ${formatDate(plan.submittedAt) || plan.submittedAt}`
        : "Done 12.5.2026"
      : "Draft in progress";

    // 2. Plan approved
    const step2Status: StepStatus = !isPlanSubmitted
      ? "upcoming"
      : isPlanApproved
        ? "done"
        : "current";
    const step2Detail = isPlanApproved
      ? plan.approvedAt
        ? `Approved ${formatDate(plan.approvedAt) || plan.approvedAt}`
        : "Approved 28.5.2026"
      : isPlanSubmitted
        ? "Awaiting review"
        : "After submission";

    // 3. Internship in progress
    const isHoursDone = loggedHours >= targetHours && targetHours > 0;
    const step3Status: StepStatus = !isPlanApproved
      ? "upcoming"
      : (isReportSubmitted || isHoursDone)
        ? "done"
        : "current";
    const step3Detail = !isPlanApproved
      ? "Starts after plan approval"
      : (isReportSubmitted || isHoursDone)
        ? `${targetHours} h completed`
        : `Active · ${loggedHours} / ${targetHours} h`;

    // 4. Report & work certificate
    const step4Status: StepStatus = !isPlanApproved
      ? "upcoming"
      : isReportSubmitted
        ? "done"
        : isHoursDone
          ? "current"
          : "upcoming";
    const step4Detail = !isPlanApproved
      ? "Due at end of internship"
      : isReportSubmitted
        ? report.submittedAt
          ? `Submitted ${formatDate(report.submittedAt) || report.submittedAt}`
          : "Submitted with certificate"
        : "Due at end of internship";

    // 5. Teacher approval & credits
    const step5Status: StepStatus = !isReportSubmitted
      ? "upcoming"
      : isReportApproved
        ? "done"
        : "current";
    const step5Detail = !isReportSubmitted
      ? "After report submission"
      : isReportApproved
        ? report.approvedAt
          ? `Approved ${formatDate(report.approvedAt) || report.approvedAt}`
          : "Approved · Credits to OMA"
        : "Under teacher review";

    // 6. Guidance evaluation
    const step6Status: StepStatus = !isReportApproved ? "upcoming" : "current";
    const step6Detail = !isReportApproved
      ? "Unlocks after approval"
      : "Ready to fill";

    return [
      {
        stepNumber: 1,
        title: "Plan submitted",
        detail: step1Detail,
        status: step1Status,
        href: "/planning",
      },
      {
        stepNumber: 2,
        title: "Plan approved",
        detail: step2Detail,
        status: step2Status,
        href: "/planning",
      },
      {
        stepNumber: 3,
        title: "Internship in progress",
        detail: step3Detail,
        status: step3Status,
        href: "/",
      },
      {
        stepNumber: 4,
        title: "Report & work certificate",
        detail: step4Detail,
        status: step4Status,
        href: "/reports",
      },
      {
        stepNumber: 5,
        title: "Teacher approval",
        detail: step5Detail,
        status: step5Status,
        href: "/reports",
      },
      {
        stepNumber: 6,
        title: "Guidance evaluation",
        detail: step6Detail,
        status: step6Status,
        href: "/guidance-evaluation",
      },
    ];
  }, [
    isPlanSubmitted,
    isPlanApproved,
    isReportSubmitted,
    isReportApproved,
    plan.submittedAt,
    plan.approvedAt,
    report.submittedAt,
    report.approvedAt,
    targetHours,
    loggedHours,
  ]);

  const { steps, progress } = useInternshipSteps(dynamicSteps);

  const nextAction = useMemo(() => {
    if (!isPlanSubmitted) {
      return {
        title: "Step 1: Täytä harjoittelusuunnitelma",
        description:
          "Aloita täyttämällä harjoittelupaikkasi tiedot, työtehtävät ja oppimistavoitteet suunnitelmalomakkeeseen.",
        actionLabel: "Täytä suunnitelma →",
        actionHref: "/planning",
      };
    }
    if (!isPlanApproved) {
      return {
        title: "Step 2: Suunnitelma odottaa hyväksyntää",
        description:
          "Harjoittelupaikkailmoitus ja -suunnitelma on toimitettu. Ohjaava opettaja vahvistaa sen ennen jakson aloitusta.",
        actionLabel: "Tarkastele suunnitelmaa →",
        actionHref: "/planning",
      };
    }
    if (!isReportSubmitted) {
      return {
        title: "Step 3: Harjoittelu käynnissä",
        description:
          "Harjoittelusuunnitelma on hyväksytty. Muista seurata työtuntejasi ja valmistella harjoitteluraporttia.",
        actionLabel: "Siirry raportteihin →",
        actionHref: "/reports",
      };
    }
    if (!isReportApproved) {
      return {
        title: "Step 5: Ohjaajan tarkistus käynnissä",
        description:
          "Harjoitteluraporttisi ja työtodistuksesi on toimitettu ohjaavalle opettajalle tarkistettavaksi.",
        actionLabel: "Tarkastele raporttia →",
        actionHref: "/reports",
      };
    }
    return {
      title: "Step 6: Harjoittelun ohjauksen arviointi",
      description:
        "Harjoitteluraporttisi on hyväksytty! Täytä vielä harjoittelun ohjauksen arviointi suoritusprosessin viimeistelemiseksi.",
      actionLabel: "Avaa ohjauksen arviointi →",
      actionHref: "/guidance-evaluation",
    };
  }, [isPlanSubmitted, isPlanApproved, isReportSubmitted, isReportApproved]);

  return (
    <section className="card flex flex-col justify-between gap-5 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2>Progress timeline</h2>
          <p className="meta mt-0.5 text-xs">
            6 steps to internship completion
          </p>
        </div>
        <div>
          <Link
            href={nextAction.actionHref}
            className="btn-primary text-xs py-2 sm:py-1.5 px-3.5 w-full sm:w-auto text-center justify-center whitespace-nowrap inline-flex items-center shadow-xs"
          >
            {nextAction.actionLabel}
          </Link>
        </div>
      </div>

      {/* Vertical Connected Stepper (Fluid Compact Stacked Layout) */}
      <ol className="relative flex flex-col">
        {steps.map(({ stepNumber, title, detail, status, href }, index) => {
          const isDone = status === "done";
          const isCurrent = status === "current";
          const isLast = index === steps.length - 1;

          return (
            <li
              key={title}
              className="relative flex items-start gap-3 pb-2.5 last:pb-0"
            >
              {/* Connector line between steps */}
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 bottom-0 w-0.5 transition-colors ${
                    isDone ? "bg-success" : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Node marker */}
              <span
                className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  isDone
                    ? "bg-success text-white shadow-xs"
                    : isCurrent
                      ? "bg-brand text-white ring-3 ring-brand-soft shadow-xs"
                      : "bg-surface border-2 border-border-strong text-ink-subtle"
                }`}
                aria-hidden="true"
              >
                {isDone ? "✓" : stepNumber}
              </span>

              {/* Step Link & Content: Adaptive (Stacked on 4:3/mobile <1280px, Inline on wide screens >=1280px) */}
              <Link
                href={href}
                className="group flex flex-col xl:flex-row xl:items-baseline xl:justify-between xl:gap-6 flex-1 min-w-0 pt-0.5"
                title={`Go to ${title}`}
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    className={`text-sm font-semibold transition-colors group-hover:text-brand ${
                      isCurrent ? "text-brand-ink" : "text-ink"
                    }`}
                  >
                    {title}
                  </span>
                  {isCurrent && (
                    <span className="pill-warning text-[10px] py-0.5 px-1.5 shrink-0">
                      Current
                    </span>
                  )}
                </div>
                {/* Detail: Stacked on small/4:3 screens, pushed right on wide laptop screens */}
                <span className="text-xs text-ink-muted leading-tight mt-0.5 xl:mt-0 xl:text-right shrink-0">
                  {detail}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
