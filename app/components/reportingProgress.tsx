"use client";

import { type StepStatus, useInternshipSteps } from "../hooks/steps";

const barColor: Record<StepStatus, string> = {
  done: "bg-success",
  current: "bg-brand",
  upcoming: "bg-progress-track",
};

export default function ReportingProgress() {
  const { steps } = useInternshipSteps();

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
