"use client";

import React, { useState } from "react";
import Link from "next/link";

interface OverdueReview {
  id: string;
  student: string;
  teacher: string;
  waitingDays: number;
}

const INITIAL_OVERDUE_REVIEWS: OverdueReview[] = [
  {
    id: "rev-1",
    student: "Eetu Mäkinen",
    teacher: "Mikko Laine",
    waitingDays: 16,
  },
  {
    id: "rev-2",
    student: "Linnea Berg",
    teacher: "Hanna Peltonen",
    waitingDays: 21,
  },
  {
    id: "rev-3",
    student: "Oskari Nurmi",
    teacher: "Hanna Peltonen",
    waitingDays: 15,
  },
];

export default function AdminOverviewPage() {
  const [overdueReviews] = useState<OverdueReview[]>(INITIAL_OVERDUE_REVIEWS);
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleSendReminder = (id: string) => {
    setRemindedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleExportReport = () => {
    setExportNotice("Report exported: autumn-2026-internship-summary.csv");
    setTimeout(() => {
      setExportNotice(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Overview</h1>
          <p className="text-sm text-ink-muted mt-1">
            Autumn term 2026 · all programmes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {exportNotice && (
            <span className="text-xs text-success font-medium animate-fade-in">
              {exportNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleExportReport}
            className="btn-secondary text-sm font-semibold py-2 px-4 shadow-xs"
          >
            Export report
          </button>
        </div>
      </header>

      {/* KPI Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active internships */}
        <div className="card p-5">
          <p className="text-xs text-ink-muted">Active internships</p>
          <p className="text-3xl font-bold font-mono text-ink mt-3">142</p>
        </div>

        {/* Awaiting review */}
        <div className="card p-5">
          <p className="text-xs text-ink-muted">Awaiting review</p>
          <p className="text-3xl font-bold font-mono text-ink mt-3">18</p>
        </div>

        {/* Reviews overdue (>14 days) */}
        <div className="card p-5">
          <p className="text-xs text-danger font-medium">Reviews overdue (&gt;14 days)</p>
          <p className="text-3xl font-bold font-mono text-danger mt-3">3</p>
        </div>

        {/* Approved this term */}
        <div className="card p-5">
          <p className="text-xs text-ink-muted">Approved this term</p>
          <p className="text-3xl font-bold font-mono text-ink mt-3">36</p>
        </div>
      </div>

      {/* Main Content: Overdue reviews (left) and Needs attention (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Overdue reviews */}
        <div className="card lg:col-span-8 p-6">
          <h2 className="text-base font-semibold text-ink mb-4">
            Overdue reviews
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                    Student
                  </th>
                  <th className="pb-3 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                    Teacher
                  </th>
                  <th className="pb-3 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                    Waiting
                  </th>
                  <th className="pb-3 text-xs font-semibold tracking-wider text-ink-muted uppercase text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdueReviews.map((item) => {
                  const isReminded = remindedIds[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-4 font-semibold text-ink">
                        {item.student}
                      </td>
                      <td className="py-4 text-ink-muted">
                        {item.teacher}
                      </td>
                      <td className="py-4 font-semibold text-danger">
                        {item.waitingDays} days
                      </td>
                      <td className="py-4 text-right">
                        {isReminded ? (
                          <span className="text-xs font-medium text-success">
                            Reminder sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(item.id)}
                            className="text-xs font-semibold text-brand hover:underline inline-flex flex-col items-end leading-tight text-right"
                          >
                            <span>Send</span>
                            <span>reminder</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: Needs attention */}
        <div className="card lg:col-span-4 p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink">
            Needs attention
          </h2>

          {/* Alert 1: Unassigned teachers */}
          <div className="rounded-control bg-[#fbe8dd] border border-[#f5cbbe] p-4 text-sm text-[#9a3a0c] font-medium leading-relaxed">
            5 students have no supervising teacher assigned.
          </div>

          {/* Alert 2: Report template */}
          <div className="rounded-control bg-[#e3eaf7] border border-[#cbd9f2] p-4 text-sm text-[#1f4fa3] font-medium leading-relaxed">
            Report template for spring 2027 is not published yet.
          </div>

          {/* Action Link */}
          <div className="pt-2">
            <Link
              href="/admin/users"
              className="text-sm font-semibold text-brand hover:underline inline-flex items-center gap-1"
            >
              Assign teachers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
