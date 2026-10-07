"use client";

import { useMemo } from "react";
import { type StepStatus, type Step, useInternshipSteps } from "../hooks/steps";
import { useReport } from "../context/ReportContext";

const barColor: Record<StepStatus, string> = {
  done: "bg-success",
  current: "bg-brand",
  upcoming: "bg-progress-track",
};

export default function ReportingProgress() {
  const { report } = useReport();

  const dynamicSteps = useMemo<Step[]>(() => {
    if (report.status === "submitted") {
      return [
        { title: "Plan approved", detail: "Done 12.5.2026", status: "done" },
        { title: "Agreement signed", detail: "Done 28.5.2026", status: "done" },
        { title: "Internship in progress", detail: "Completed", status: "done" },
        {
          title: "Final report",
          detail: report.submittedAt ? `Submitted ${report.submittedAt}` : "Submitted",
          status: "done",
        },
        { title: "Teacher assessment", detail: "Under review", status: "current" },
      ];
    }

    return [
      { title: "Plan approved", detail: "Done 12.5.2026", status: "done" },
      { title: "Agreement signed", detail: "Done 28.5.2026", status: "done" },
      { title: "Internship in progress", detail: "Current step", status: "current" },
      { title: "Final report", detail: "Due 15.12.2026", status: "upcoming" },
      { title: "Teacher assessment", detail: "After report", status: "upcoming" },
    ];
  }, [report.status, report.submittedAt]);

  const { steps } = useInternshipSteps(dynamicSteps);

  return (
    <section className="card">
      <h2>Progress</h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-5">
        {steps.map(({ title, detail, status }) => (
          <li key={title}>
            <div className={`mb-3 h-1 rounded-full ${barColor[status]}`} />
            <p className="font-semibold">{title}</p>
            <p
              className={`meta mt-1 ${status === "current" ? "font-semibold text-brand-ink" : ""}`}
            >
              {detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
