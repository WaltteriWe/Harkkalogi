"use client";

import React, { useMemo } from "react";
import ReportingProgress from "@/components/reportingProgress";
import { useReport } from "@/context/ReportContext";
import { formatPeriod } from "@/lib/dates";

const contacts = [
  { name: "Laura Nieminen", role: "Workplace supervisor" },
  { name: "Mikko Laine", role: "Supervising teacher" },
];

export default function Home() {
  const { report } = useReport();

  const hoursTotal = useMemo(() => {
    const parsed = Number(report.totalHours);
    return isNaN(parsed) || parsed <= 0 ? 800 : parsed;
  }, [report.totalHours]);

  const hoursLogged = useMemo(() => {
    return report.status === "submitted" ? hoursTotal : 640;
  }, [report.status, hoursTotal]);

  const remainingHours = Math.max(0, hoursTotal - hoursLogged);
  const progressPercent = Math.min(
    100,
    Math.round((hoursLogged / hoursTotal) * 100),
  );

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1>My internship</h1>
          <p className="meta mt-2 text-base">
            Practical training · Frontend developer at{" "}
            {report.company || "Nordic Pixel Oy"} ·{" "}
            {formatPeriod(report.startDate, report.endDate) || "1.6.–30.11.2026"}
          </p>
        </div>
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
              <span className="tabular text-4xl">{hoursLogged}</span>{" "}
              <span className="meta tabular text-base">/ {hoursTotal} h</span>
            </p>
            <div
              className="progress-track mt-3"
              role="progressbar"
              aria-valuenow={hoursLogged}
              aria-valuemax={hoursTotal}
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
    </>
  );
}
