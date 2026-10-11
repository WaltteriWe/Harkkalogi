"use client";

import React, { useMemo } from "react";
import ReportingProgress from "@/components/reportingProgress";
import { useReport } from "@/context/ReportContext";

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
            {report.period || "1.6.–30.11.2026"}
          </p>
        </div>
      </header>

      <ReportingProgress />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Hours Logged Tile */}
        <section className="card">
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
        </section>

        {/* Contacts Tile */}
        <section className="card">
          <p className="label">Contacts</p>
          <ul className="mt-2 flex flex-col gap-3">
            {contacts.map(({ name, role }) => (
              <li key={name}>
                <p className="font-semibold">{name}</p>
                <p className="meta text-base">{role}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
