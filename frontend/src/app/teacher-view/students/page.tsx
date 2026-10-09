"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export type StudyMode = "päivätoteutus" | "monimuoto";

export interface SupervisedStudent {
  id: string;
  name: string;
  email: string;
  studyMode: StudyMode;
  programme: string;
  company: string;
  role: string;
  hoursLogged: number;
  hoursRequired: number;
  reportStatus: "needs_review" | "in_progress" | "approved";
  lastActive: string;
}

const SUPERVISED_STUDENTS: SupervisedStudent[] = [
  {
    id: "stu-1",
    name: "Aino Korhonen",
    email: "aino.korhonen@example.fi",
    studyMode: "päivätoteutus",
    programme: "Information Technology (TIK21)",
    company: "Nordic Pixel Oy",
    role: "Frontend Developer",
    hoursLogged: 640,
    hoursRequired: 800,
    reportStatus: "in_progress",
    lastActive: "Today 10:20",
  },
  {
    id: "stu-2",
    name: "Eetu Mäkinen",
    email: "eetu.makinen@example.fi",
    studyMode: "päivätoteutus",
    programme: "Information Technology (TIK21)",
    company: "Futurice",
    role: "Software Intern",
    hoursLogged: 800,
    hoursRequired: 800,
    reportStatus: "needs_review",
    lastActive: "16 days ago",
  },
  {
    id: "stu-3",
    name: "Linnea Berg",
    email: "linnea.berg@example.fi",
    studyMode: "monimuoto",
    programme: "Media Engineering (MED22)",
    company: "Reaktor",
    role: "UI/UX Developer",
    hoursLogged: 800,
    hoursRequired: 800,
    reportStatus: "needs_review",
    lastActive: "21 days ago",
  },
  {
    id: "stu-4",
    name: "Oskari Nurmi",
    email: "oskari.nurmi@example.fi",
    studyMode: "monimuoto",
    programme: "Health Technology (TER23)",
    company: "Wolt",
    role: "Data Analyst Trainee",
    hoursLogged: 420,
    hoursRequired: 800,
    reportStatus: "in_progress",
    lastActive: "Yesterday",
  },
  {
    id: "stu-5",
    name: "Sofia Mäkinen",
    email: "sofia.makinen@example.fi",
    studyMode: "päivätoteutus",
    programme: "Information Technology (TIK21)",
    company: "KONE Oyj",
    role: "Cloud Specialist Trainee",
    hoursLogged: 800,
    hoursRequired: 800,
    reportStatus: "approved",
    lastActive: "3 days ago",
  },
  {
    id: "stu-6",
    name: "Valtteri Laitinen",
    email: "valtteri.laitinen@example.fi",
    studyMode: "monimuoto",
    programme: "Industrial Management (TUT20)",
    company: "ABB",
    role: "Process Developer",
    hoursLogged: 240,
    hoursRequired: 800,
    reportStatus: "in_progress",
    lastActive: "5 days ago",
  },
];

export default function MyStudentsPage() {
  const [students] = useState<SupervisedStudent[]>(SUPERVISED_STUDENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | StudyMode | "needs_review">("all");

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.programme.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Mode filter
      if (filterMode === "päivätoteutus") return s.studyMode === "päivätoteutus";
      if (filterMode === "monimuoto") return s.studyMode === "monimuoto";
      if (filterMode === "needs_review") return s.reportStatus === "needs_review";
      return true;
    });
  }, [students, searchQuery, filterMode]);

  const getStatusBadge = (status: SupervisedStudent["reportStatus"]) => {
    switch (status) {
      case "needs_review":
        return <span className="pill-warning">Needs review</span>;
      case "approved":
        return <span className="pill-success">Approved</span>;
      case "in_progress":
      default:
        return <span className="pill-neutral">In progress</span>;
    }
  };

  const getStudyModeBadge = (mode: StudyMode) => {
    if (mode === "päivätoteutus") {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium border border-blue-200">
          Päivätoteutus
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] font-medium border border-purple-200">
        Monimuoto
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Search */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            My students
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Students assigned to your supervision and their report progress
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="search-students" className="text-xs font-semibold text-ink">
            Search students
          </label>
          <input
            id="search-students"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name or company"
            className="input py-2 text-sm w-56 sm:w-64"
          />
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterMode === "all"
              ? "bg-brand text-white font-semibold"
              : "bg-surface border border-border text-ink hover:bg-surface-muted"
          }`}
        >
          All ({students.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("päivätoteutus")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterMode === "päivätoteutus"
              ? "bg-blue-600 text-white font-semibold"
              : "bg-surface border border-border text-ink hover:bg-surface-muted"
          }`}
        >
          Päivätoteutus ({students.filter((s) => s.studyMode === "päivätoteutus").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("monimuoto")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterMode === "monimuoto"
              ? "bg-purple-600 text-white font-semibold"
              : "bg-surface border border-border text-ink hover:bg-surface-muted"
          }`}
        >
          Monimuoto ({students.filter((s) => s.studyMode === "monimuoto").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("needs_review")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterMode === "needs_review"
              ? "bg-brand-ink text-white font-semibold"
              : "bg-surface border border-border text-ink hover:bg-surface-muted"
          }`}
        >
          Needs review ({students.filter((s) => s.reportStatus === "needs_review").length})
        </button>
      </div>

      {/* Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/4">Student</th>
                <th className="w-1/4">Company &amp; Role</th>
                <th className="w-1/6">Hours Logged</th>
                <th className="w-1/6">Status</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ink-muted">
                    No students matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const percent = Math.min(
                    100,
                    Math.round((student.hoursLogged / student.hoursRequired) * 100)
                  );
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-surface-muted/30 transition-colors"
                    >
                      {/* Student info with Study Mode badge */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {student.name}
                            </span>
                            {getStudyModeBadge(student.studyMode)}
                          </div>
                          <p className="text-xs text-ink-muted">
                            {student.email} · {student.programme}
                          </p>
                        </div>
                      </td>

                      {/* Company & Role */}
                      <td>
                        <p className="font-semibold text-sm text-ink">
                          {student.company}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {student.role}
                        </p>
                      </td>

                      {/* Hours Logged & Progress Track */}
                      <td>
                        <div className="flex flex-col gap-1.5 max-w-36">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono tabular font-semibold text-ink">
                              {student.hoursLogged} / {student.hoursRequired} h
                            </span>
                            <span className="text-[11px] text-ink-muted">
                              {percent}%
                            </span>
                          </div>
                          <div className="progress-track h-1.5">
                            <div
                              className="progress-bar"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {getStatusBadge(student.reportStatus)}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                          <Link
                            href="/teacher-view"
                            className="text-brand hover:text-brand-hover hover:underline"
                          >
                            Review
                          </Link>
                          <Link
                            href="/messages"
                            className="text-ink-muted hover:text-ink hover:underline"
                          >
                            Message
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

