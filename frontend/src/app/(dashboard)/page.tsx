"use client";

import React from "react";
import ReportingProgress from "@/components/reportingProgress";
import InternshipSelector from "@/components/internshipSelector";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import { formatPeriod } from "@/lib/dates";

const contacts = [
  { name: "Laura Nieminen", role: "Workplace supervisor" },
  { name: "Mikko Laine", role: "Supervising teacher" },
];

export default function Home() {
  const { report } = useReport();
  const {
    activeInternship,
    targetHours,
    loggedHours,
    remainingHours,
    isPlanSubmitted,
  } = useInternship();

  const progressPercent = Math.min(
    100,
    Math.round((loggedHours / targetHours) * 100)
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1>My internship</h1>
          <p className="meta mt-1 text-base">
            Practical training
            {isPlanSubmitted ? (
              <>
                {" "}· {activeInternship.title}
                {activeInternship.company && ` · ${activeInternship.company}`}
                {report.startDate && report.endDate && (
                  <> · {formatPeriod(report.startDate, report.endDate)}</>
                )}
              </>
            ) : (
              <> · Tutkintovaatimus: 30 op (800 h) · Suunnitelma kesken</>
            )}
          </p>
        </div>

        {/* Internship Switcher (Harjoittelu 1 & 2 or Combined) */}
        <InternshipSelector />
      </header>

      {/* 2-Column Balanced Dashboard Layout */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_21rem]">
        {/* Left Column: Vertical Progress Timeline */}
        <ReportingProgress />

        {/* Right Column: Unified Metric & Contacts Card */}
        <section className="card flex flex-col justify-between gap-6">
          {/* Hours Logged Section */}
          <div>
            <p className="label">Hours logged</p>
            <p className="mt-2">
              <span className="tabular text-4xl">{loggedHours}</span>{" "}
              <span className="meta tabular text-base">/ {targetHours} h</span>
            </p>
            <div
              className="progress-track mt-3"
              role="progressbar"
              aria-valuenow={loggedHours}
              aria-valuemax={targetHours}
              aria-label="Hours logged"
            >
              <div
                className="progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="meta mt-3 text-base">
              {remainingHours === 0
                ? "Requirement fulfilled"
                : `${remainingHours} h remaining`}
            </p>
          </div>

          <hr className="border-border" />

          {/* Contacts Section */}
          <div>
            <p className="label">Contacts</p>
            <ul className="mt-3 flex flex-col gap-3">
              {contacts.map(({ name, role }) => (
                <li key={name}>
                  <p className="font-semibold text-ink">{name}</p>
                  <p className="meta text-sm">{role}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
