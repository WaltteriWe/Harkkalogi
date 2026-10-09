"use client";

import React, { useState } from "react";

export default function AdminSettingsPage() {
  const [academicYear, setAcademicYear] = useState("2026–2027");
  const [autumnDeadline, setAutumnDeadline] = useState("2026-12-15");
  const [springDeadline, setSpringDeadline] = useState("2027-05-15");
  const [minHours, setMinHours] = useState(800);
  const [requireSupervisorFirst, setRequireSupervisorFirst] = useState(true);
  const [autoReminders, setAutoReminders] = useState(true);
  const [notifyTeachersOnSubmit, setNotifyTeachersOnSubmit] = useState(true);
  const [escalateOverdue, setEscalateOverdue] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice("System settings saved successfully.");
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleResetStorage = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("harkkalogi_report_store_v2");
        localStorage.removeItem("harkkalogi_auth_user");
        localStorage.removeItem("harkkalogi_auth_token");
      } catch {
        // Ignore
      }
    }
    setSaveNotice("Prototype browser storage reset. Refreshing page...");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Settings
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Global configuration, reporting guidelines, academic calendars, and notifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveNotice && (
            <span className="text-xs font-semibold text-success animate-fade-in">
              {saveNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-sm py-2 px-5 font-semibold shadow-xs"
          >
            Save changes
          </button>
        </div>
      </header>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Section 1: Academic Periods */}
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Academic Calendar &amp; Deadlines
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Set deadlines for report submissions across all degree programmes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label htmlFor="academic-year" className="field-label">
                Current Academic Year
              </label>
              <input
                id="academic-year"
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="input text-sm"
              />
            </div>

            <div>
              <label htmlFor="autumn-deadline" className="field-label">
                Autumn Term Deadline
              </label>
              <input
                id="autumn-deadline"
                type="date"
                value={autumnDeadline}
                onChange={(e) => setAutumnDeadline(e.target.value)}
                className="input text-sm"
              />
            </div>

            <div>
              <label htmlFor="spring-deadline" className="field-label">
                Spring Term Deadline
              </label>
              <input
                id="spring-deadline"
                type="date"
                value={springDeadline}
                onChange={(e) => setSpringDeadline(e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Reporting Rules */}
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Internship Verification &amp; Submission Rules
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Controls when students are allowed to submit reports and approval prerequisites.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="min-hours" className="field-label">
                Minimum Required Hours for Final Report
              </label>
              <input
                id="min-hours"
                type="number"
                value={minHours}
                onChange={(e) => setMinHours(Number(e.target.value))}
                className="input text-sm"
              />
              <p className="hint text-xs">Standard is 800 hours for 30 ECTS practical training.</p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={requireSupervisorFirst}
                  onChange={(e) => setRequireSupervisorFirst(e.target.checked)}
                  className="mt-1 size-4 accent-brand rounded"
                />
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    Require workplace supervisor sign-off before teacher review
                  </span>
                  <span className="text-xs text-ink-muted block mt-0.5">
                    Teachers only receive report notification after company mentor signs off.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Automation */}
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Automated Reminders &amp; Email Notifications
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Manage automatic alerts to students and supervising teachers.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoReminders}
                onChange={(e) => setAutoReminders(e.target.checked)}
                className="mt-1 size-4 accent-brand rounded"
              />
              <div>
                <span className="text-sm font-semibold text-ink block">
                  Send reminder to students with draft reports 14 days before deadline
                </span>
                <span className="text-xs text-ink-muted block mt-0.5">
                  Sends email reminder to students with incomplete reports.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyTeachersOnSubmit}
                onChange={(e) => setNotifyTeachersOnSubmit(e.target.checked)}
                className="mt-1 size-4 accent-brand rounded"
              />
              <div>
                <span className="text-sm font-semibold text-ink block">
                  Notify supervising teacher immediately when report is submitted
                </span>
                <span className="text-xs text-ink-muted block mt-0.5">
                  Sends notification email to assigned supervising teacher.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={escalateOverdue}
                onChange={(e) => setEscalateOverdue(e.target.checked)}
                className="mt-1 size-4 accent-brand rounded"
              />
              <div>
                <span className="text-sm font-semibold text-ink block">
                  Flag reviews awaiting teacher action for more than 14 days as overdue
                </span>
                <span className="text-xs text-ink-muted block mt-0.5">
                  Appears on Admin Overview under &quot;Reviews overdue&quot;.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Prototype Maintenance */}
        <div className="card p-6 flex flex-col gap-4 border-dashed">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Prototype Maintenance &amp; Storage
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Reset browser localStorage if you want to restore all mock reports and authentication to defaults.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetStorage}
              className="btn-secondary text-xs font-semibold py-2 px-4 text-danger border-danger/30 hover:bg-danger-soft"
            >
              Reset prototype browser storage
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

