"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  usePlan,
  MIN_DESCRIPTION_WORDS,
  MIN_LEARNING_GOALS,
} from "@/context/PlanContext";
import DateInput from "@/components/dateInput";

function ChecklistIcon({ done }: { done: boolean }) {
  return done ? (
    <span className="step-icon-done shrink-0" aria-label="Completed">
      <svg
        className="size-3.5 stroke-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  ) : (
    <span className="step-icon-todo shrink-0" aria-label="To do" />
  );
}

export default function PlanningPage() {
  const {
    plan,
    updateField,
    addGoal,
    updateGoal,
    removeGoal,
    saveDraft,
    submitPlan,
    wordCount,
    checklist,
  } = usePlan();

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleSaveDraft = () => {
    saveDraft();
    showNotification("info", "Draft saved successfully.");
  };

  const handleSubmit = () => {
    const res = submitPlan();
    if (res.success) {
      showNotification(
        "success",
        "Plan submitted for approval! Your teacher has been notified."
      );
    } else {
      showNotification("error", res.message || "Please complete all requirements.");
    }
  };

  const isApproved = plan.status === "approved";
  const isSubmitted = plan.status === "submitted";

  return (
    <>
      {/* Header section */}
      <div>
        <Link href="/" className="link-quiet inline-flex items-center gap-1.5 text-sm">
          ← Back to overview
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Internship plan
          </h1>

          <div>
            {isApproved ? (
              <span className="pill-success text-sm px-3 py-1">Approved</span>
            ) : isSubmitted ? (
              <span className="pill-info text-sm px-3 py-1">Submitted</span>
            ) : (
              <span className="pill-neutral text-sm px-3 py-1">Draft</span>
            )}
          </div>
        </div>

        <p className="meta mt-1 text-sm text-ink-muted">
          {isApproved
            ? `Approved on ${plan.approvedAt || "earlier"}`
            : isSubmitted
              ? `Submitted on ${plan.submittedAt || "recently"}`
              : `Draft saved automatically · last saved ${plan.lastSavedAt}`}
        </p>
      </div>

      {/* Feedback message banner if present */}
      {notification && (
        <div
          className={`rounded-control px-4 py-3 text-sm transition-all ${
            notification.type === "success"
              ? "bg-success-soft text-success border border-success/20"
              : notification.type === "error"
                ? "bg-danger-soft text-danger border border-danger/20"
                : "bg-surface-muted text-ink border border-border"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Approved banner with teacher feedback */}
      {isApproved && (
        <div className="rounded-control bg-success-soft border border-success/20 p-4 text-sm text-success flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-base">Plan approved by your teacher</p>
            <span className="pill-success">Approved</span>
          </div>
          {plan.teacherFeedback && (
            <p className="text-ink leading-relaxed mt-1">{plan.teacherFeedback}</p>
          )}
        </div>
      )}

      {/* Submission banner if under review */}
      {isSubmitted && !isApproved && (
        <div className="rounded-control bg-info-soft border border-info/20 p-4 text-sm text-info flex items-center justify-between">
          <div>
            <p className="font-semibold">Plan is waiting for teacher approval</p>
            <p className="mt-0.5">
              Submitted on {plan.submittedAt || "recently"}. You can still update your plan below.
            </p>
          </div>
          <span className="pill-info">Submitted</span>
        </div>
      )}

      {/* Main 2-column content layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_21rem]">
        {/* Left Column: Form Sections */}
        <div className="flex flex-col gap-6">
          <section className="card flex flex-col gap-8">
            {/* 1. Workplace and supervisor */}
            <div>
              <h2 className="text-base font-semibold text-ink">
                1. Workplace and supervisor
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="plan-company-input">
                    Company
                  </label>
                  <input
                    id="plan-company-input"
                    type="text"
                    className="input"
                    value={plan.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="e.g. Nordic Pixel Oy"
                    disabled={isApproved}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="plan-job-title-input">
                    Job title
                  </label>
                  <input
                    id="plan-job-title-input"
                    type="text"
                    className="input"
                    value={plan.jobTitle}
                    onChange={(e) => updateField("jobTitle", e.target.value)}
                    placeholder="e.g. Frontend developer trainee"
                    disabled={isApproved}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="plan-supervisor-input">
                    Workplace supervisor
                  </label>
                  <input
                    id="plan-supervisor-input"
                    type="text"
                    className="input"
                    value={plan.supervisorName}
                    onChange={(e) => updateField("supervisorName", e.target.value)}
                    placeholder="e.g. Laura Nieminen"
                    disabled={isApproved}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="plan-supervisor-contact-input">
                    Supervisor email or phone
                  </label>
                  <input
                    id="plan-supervisor-contact-input"
                    type="text"
                    className="input"
                    value={plan.supervisorContact}
                    onChange={(e) => updateField("supervisorContact", e.target.value)}
                    placeholder="e.g. laura.nieminen@nordicpixel.fi"
                    disabled={isApproved}
                  />
                </div>
              </div>
            </div>

            {/* 2. Period and hours */}
            <div>
              <h2 className="text-base font-semibold text-ink">
                2. Period and hours
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DateInput
                  id="plan-start-input"
                  label="Start date"
                  value={plan.startDate}
                  onChange={(value) => updateField("startDate", value)}
                  max={plan.endDate}
                  disabled={isApproved}
                />

                <DateInput
                  id="plan-end-input"
                  label="End date"
                  value={plan.endDate}
                  onChange={(value) => updateField("endDate", value)}
                  min={plan.startDate}
                  disabled={isApproved}
                />

                <div>
                  <label className="field-label" htmlFor="plan-hours-input">
                    Planned total hours
                  </label>
                  <input
                    id="plan-hours-input"
                    type="text"
                    inputMode="numeric"
                    className="input tabular"
                    value={plan.plannedHours}
                    onChange={(e) => updateField("plannedHours", e.target.value)}
                    placeholder="800"
                    disabled={isApproved}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="plan-weekly-input">
                    Hours per week
                  </label>
                  <input
                    id="plan-weekly-input"
                    type="text"
                    inputMode="numeric"
                    className="input tabular"
                    value={plan.hoursPerWeek}
                    onChange={(e) => updateField("hoursPerWeek", e.target.value)}
                    placeholder="37.5"
                    disabled={isApproved}
                  />
                </div>
              </div>
            </div>

            {/* 3. Job description */}
            <div>
              <h2 className="text-base font-semibold text-ink">
                3. Job description
              </h2>
              <div className="mt-3">
                <label className="field-label" htmlFor="plan-description-input">
                  What tasks and responsibilities will you have?
                </label>
                <textarea
                  id="plan-description-input"
                  className="textarea min-h-48"
                  value={plan.jobDescription}
                  onChange={(e) => updateField("jobDescription", e.target.value)}
                  placeholder="Describe the team you'll join, the tools you'll use and the kind of work you'll be doing..."
                  disabled={isApproved}
                />
                {!isApproved && (
                  <p className="hint">
                    At least {MIN_DESCRIPTION_WORDS} words. Agree on the tasks with your workplace supervisor.
                  </p>
                )}
              </div>
            </div>

            {/* 4. Learning goals */}
            <div>
              <h2 className="text-base font-semibold text-ink">
                4. Learning goals
              </h2>
              <p className="hint mt-1">
                What do you want to learn? Connect each goal to the competences in your degree programme.
              </p>
              <ol className="mt-3 flex flex-col gap-3">
                {plan.learningGoals.map((goal, index) => (
                  <li key={goal.id} className="flex items-center gap-3">
                    <span className="tabular w-6 shrink-0 text-sm text-ink-muted">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      className="input"
                      value={goal.text}
                      onChange={(e) => updateGoal(goal.id, e.target.value)}
                      placeholder="e.g. Learn to write automated tests for React components"
                      aria-label={`Learning goal ${index + 1}`}
                      disabled={isApproved}
                    />
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="text-ink-subtle hover:text-danger text-sm px-1 transition-colors shrink-0"
                        title="Remove goal"
                        aria-label={`Remove learning goal ${index + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {!isApproved && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="btn-dashed mt-3"
                >
                  + Add goal
                </button>
              )}
            </div>

            {/* 5. Assessment and follow-up */}
            <div>
              <h2 className="text-base font-semibold text-ink">
                5. Assessment and follow-up
              </h2>
              <div className="mt-3">
                <label className="field-label" htmlFor="plan-assessment-input">
                  How will your progress be followed up?
                </label>
                <textarea
                  id="plan-assessment-input"
                  className="textarea"
                  value={plan.assessment}
                  onChange={(e) => updateField("assessment", e.target.value)}
                  placeholder="e.g. Weekly check-ins with my supervisor, a mid-term review in August..."
                  disabled={isApproved}
                />
              </div>
            </div>
          </section>

          {/* Action buttons aligned right */}
          {!isApproved ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-secondary"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
              >
                {isSubmitted ? "Update submission" : "Submit for approval"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <Link href="/" className="btn-secondary">
                Back to overview
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Submission Checklist */}
        <aside className="card flex flex-col gap-5">
          <h2 className="text-base font-semibold text-ink">
            {isApproved ? "Plan status" : "Before you submit"}
          </h2>

          <ul className="flex flex-col gap-3.5 text-sm">
            <li className="flex items-center gap-3">
              <ChecklistIcon done={checklist.isWorkplaceFilled} />
              <span className="text-ink">Workplace and supervisor filled in</span>
            </li>

            <li className="flex items-center gap-3">
              <ChecklistIcon done={checklist.isPeriodFilled} />
              <span className="text-ink">Period and hours filled in</span>
            </li>

            <li className="flex items-center gap-3">
              <ChecklistIcon done={checklist.isWordCountMet} />
              <span className="text-ink">
                Job description at least {MIN_DESCRIPTION_WORDS} words{" "}
                <span className="text-ink-muted">(now {wordCount})</span>
              </span>
            </li>

            <li className="flex items-center gap-3">
              <ChecklistIcon done={checklist.hasEnoughGoals} />
              <span className="text-ink">
                At least {MIN_LEARNING_GOALS} learning goals
              </span>
            </li>
          </ul>

          {/* Orange note banner */}
          {!isApproved && (
            <div className="mt-1 rounded-control bg-brand-soft p-4 text-sm text-brand-ink leading-relaxed">
              <p>
                Your plan must be approved before the internship starts. Your teacher is notified when you submit.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
