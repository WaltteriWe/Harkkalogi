"use client";

import React, { useMemo } from "react";
import ReportButton from "../components/reportButton";
import ReportingProgress from "../components/reportingProgress";
import Sidebar from "../components/sidebar";
import Link from "next/link";
import { useReport } from "../context/ReportContext";

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

  const activityList = useMemo(() => {
    const list = [];
    if (report.status === "submitted") {
      list.push({
        text: 'You submitted your final report for review',
        date: report.submittedAt || "Today",
      });
    } else if (report.lastSavedAt) {
      list.push({
        text: `Final report draft auto-saved (${report.lastSavedAt})`,
        date: "Today",
      });
    }

    list.push(
      { text: "Teacher approved your internship agreement", date: "28.5.2026" },
      { text: 'You uploaded "Harjoittelusopimus.pdf"', date: "24.5.2026" }
    );
    return list;
  }, [report.status, report.submittedAt, report.lastSavedAt]);

  const remainingHours = Math.max(0, hoursTotal - hoursLogged);
  const progressPercent = Math.min(100, Math.round((hoursLogged / hoursTotal) * 100));

  return (
    <div className="app-shell">
      <Sidebar role="student" userName="Aino Korhonen" />

      <main className="main flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1>My internship</h1>
            <p className="meta mt-2 text-base">
              Practical training · Frontend developer at {report.company || "Nordic Pixel Oy"} ·{" "}
              {report.period || "1.6.–30.11.2026"}
            </p>
          </div>
          <ReportButton />
        </header>

        <ReportingProgress />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Next Step Tile */}
          <section className="card">
            <div className="flex items-center justify-between">
              <p className="label">Next step</p>
              {report.status === "submitted" && (
                <span className="pill-info">Under review</span>
              )}
            </div>

            {report.status === "submitted" ? (
              <>
                <h2 className="mt-2">Teacher assessment</h2>
                <p className="meta mt-2 text-base">
                  Your final report is submitted and waiting for review by Mikko Laine.
                </p>
                <Link href="/reporting" className="link mt-4 inline-block">
                  Review submitted report →
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-2">Submit your final report</h2>
                <p className="meta mt-2 text-base">
                  Include your tasks, what you learned and the supervisor&apos;s
                  work certificate.
                </p>
                <Link href="/reporting" className="link mt-4 inline-block">
                  Continue report →
                </Link>
              </>
            )}
          </section>

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

        {/* Recent Activity Tile */}
        <section className="card">
          <h2>Recent activity</h2>
          <ul className="mt-3">
            {activityList.map(({ text, date }) => (
              <li
                key={text}
                className="flex justify-between gap-4 border-t border-border py-3 first:border-t-0"
              >
                <span>{text}</span>
                <span className="meta shrink-0">{date}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
