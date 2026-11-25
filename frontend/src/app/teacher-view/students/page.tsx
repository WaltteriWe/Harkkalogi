"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  deriveStudentReportStatus,
  filterSupervisedStudents,
  mapStudyType,
  type StudyMode,
  type SupervisedStudent,
  type TeacherStudentStatus,
} from "@/lib/teacher-view-helpers";

const STATUS_LABELS: Record<TeacherStudentStatus, string> = {
  in_progress: "In progress",
  needs_review: "Needs review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

interface ApiInternship {
  id: number;
  title?: string;
  company?: string;
  loggedHours?: number;
  requiredHours?: number;
  credits?: number;
  creditsPutToOma?: boolean;
  student?: {
    name?: string;
    email?: string;
    studyType?: string | null;
  };
  reports?: Array<{
    id: number;
    status: string;
    reviews?: Array<{
      decision?: string;
      comment?: string;
      createdAt?: string;
    }>;
  }>;
}

function mapInternshipToStudent(i: ApiInternship): SupervisedStudent {
  return {
    id: String(i.id),
    internshipId: i.id,
    internshipTitle: i.title || "Harjoittelu",
    name: i.student?.name || "Unknown student",
    email: i.student?.email || "",
    studyMode: mapStudyType(i.student?.studyType),
    company: i.company || "",
    hoursLogged: i.loggedHours ?? 0,
    hoursRequired: i.requiredHours && i.requiredHours > 0 ? i.requiredHours : 400,
    credits: i.credits ?? 15,
    reportStatus: deriveStudentReportStatus(i.reports),
    creditsPutToOma: Boolean(i.creditsPutToOma),
  };
}

export default function MyStudentsPage() {
  const [students, setStudents] = useState<SupervisedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingOmaIds, setPendingOmaIds] = useState<Record<number, boolean>>(
    {}
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [studyTypeFilter, setStudyTypeFilter] = useState<
    "all" | "päivätoteutus" | "monimuoto"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | TeacherStudentStatus
  >("all");

  const showNotice = (type: "success" | "error", text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ internships: ApiInternship[] }>(
        "/internships"
      );
      setStudents((data.internships || []).map(mapInternshipToStudent));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load students."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    apiFetch<{ internships: ApiInternship[] }>("/internships")
      .then((data) => {
        if (!active) return;
        setStudents((data.internships || []).map(mapInternshipToStudent));
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load students."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleStudentCreditsPutToOma = async (student: SupervisedStudent) => {
    const next = !student.creditsPutToOma;
    setPendingOmaIds((prev) => ({ ...prev, [student.internshipId]: true }));
    setStudents((prev) =>
      prev.map((s) =>
        s.internshipId === student.internshipId
          ? { ...s, creditsPutToOma: next }
          : s
      )
    );

    try {
      const res = await apiFetch<{ internship: { creditsPutToOma: boolean } }>(
        `/internships/${student.internshipId}/credits`,
        {
          method: "PATCH",
          body: JSON.stringify({ creditsPutToOma: next }),
        }
      );
      const confirmed = Boolean(res.internship?.creditsPutToOma);
      setStudents((prev) =>
        prev.map((s) =>
          s.internshipId === student.internshipId
            ? { ...s, creditsPutToOma: confirmed }
            : s
        )
      );
      showNotice(
        "success",
        confirmed
          ? `Credits marked put to OMA for ${student.name}.`
          : `Credits unmarked from OMA for ${student.name}.`
      );
    } catch (err) {
      setStudents((prev) =>
        prev.map((s) =>
          s.internshipId === student.internshipId
            ? { ...s, creditsPutToOma: !next }
            : s
        )
      );
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to update OMA credits."
      );
    } finally {
      setPendingOmaIds((prev) => ({ ...prev, [student.internshipId]: false }));
    }
  };

  const filteredStudents = useMemo(
    () =>
      filterSupervisedStudents(students, {
        studyTypeFilter,
        statusFilter,
        searchQuery,
      }),
    [students, studyTypeFilter, statusFilter, searchQuery]
  );

  const hasActiveFilters =
    studyTypeFilter !== "all" || statusFilter !== "all";

  const clearAllFilters = () => {
    setStudyTypeFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const getStatusBadge = (status: TeacherStudentStatus) => {
    switch (status) {
      case "needs_review":
        return <span className="pill-warning">Needs review</span>;
      case "approved":
        return <span className="pill-success">Approved</span>;
      case "changes_requested":
        return <span className="pill-danger">Changes requested</span>;
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
    if (mode === "monimuoto") {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] font-medium border border-purple-200">
          Monimuoto
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-surface-muted text-ink-muted px-2 py-0.5 text-[11px] font-medium border border-border">
        Unspecified
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
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="search-students"
            className="text-xs font-semibold text-ink"
          >
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

      {actionNotice && (
        <div
          className={`rounded-control px-3 py-2 text-xs font-semibold border ${
            actionNotice.type === "error"
              ? "bg-danger-soft text-danger border-danger/20"
              : "bg-success-soft text-success border-success/20"
          }`}
        >
          {actionNotice.text}
        </div>
      )}

      {loadError && (
        <div className="card p-4 border-danger/30 bg-danger-soft flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-danger">{loadError}</p>
          <button
            type="button"
            onClick={fetchStudents}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Selectable Expandable Filter Bar */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            aria-expanded={isFiltersOpen}
            className="flex items-center gap-2 text-xs font-semibold text-ink hover:text-brand transition-colors"
          >
            <span>Filters</span>
            <span className="text-ink-muted">
              {isFiltersOpen ? "▲" : "▼"}
            </span>
            {studyTypeFilter !== "all" && (
              <span className="pill-neutral text-[11px]">
                Study type:{" "}
                {studyTypeFilter === "päivätoteutus"
                  ? "Päivätoteutus"
                  : "Monimuoto"}
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="pill-neutral text-[11px]">
                Status: {STATUS_LABELS[statusFilter]}
              </span>
            )}
          </button>

          {(hasActiveFilters || searchQuery.trim()) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {isFiltersOpen && (
          <div className="flex flex-col gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted w-24">
                Study type:
              </span>
              <button
                type="button"
                onClick={() => setStudyTypeFilter("all")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  studyTypeFilter === "all"
                    ? "bg-brand text-white font-semibold"
                    : "bg-surface border border-border text-ink hover:bg-surface-muted"
                }`}
              >
                All ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setStudyTypeFilter("päivätoteutus")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  studyTypeFilter === "päivätoteutus"
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-surface border border-border text-ink hover:bg-surface-muted"
                }`}
              >
                Päivätoteutus (
                {students.filter((s) => s.studyMode === "päivätoteutus").length}
                )
              </button>
              <button
                type="button"
                onClick={() => setStudyTypeFilter("monimuoto")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  studyTypeFilter === "monimuoto"
                    ? "bg-purple-600 text-white font-semibold"
                    : "bg-surface border border-border text-ink hover:bg-surface-muted"
                }`}
              >
                Monimuoto (
                {students.filter((s) => s.studyMode === "monimuoto").length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted w-24">
                Status:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-brand text-white font-semibold"
                    : "bg-surface border border-border text-ink hover:bg-surface-muted"
                }`}
              >
                All ({students.length})
              </button>
              {(
                [
                  "in_progress",
                  "needs_review",
                  "changes_requested",
                  "approved",
                ] as TeacherStudentStatus[]
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    statusFilter === st
                      ? "bg-brand-ink text-white font-semibold"
                      : "bg-surface border border-border text-ink hover:bg-surface-muted"
                  }`}
                >
                  {STATUS_LABELS[st]} (
                  {students.filter((s) => s.reportStatus === st).length})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/3">Student</th>
                <th className="w-28">Status</th>
                <th className="w-32">Credits in OMA</th>
                <th className="w-44 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-ink-muted"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-ink-muted"
                  >
                    No students matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
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
                          {student.internshipTitle}
                          {student.company ? ` · ${student.company}` : ""} ·{" "}
                          {student.email}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(student.reportStatus)}</td>

                    {/* OMA Credit Checkbox */}
                    <td>
                      {student.reportStatus === "approved" ? (
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={Boolean(
                              pendingOmaIds[student.internshipId]
                            )}
                            checked={student.creditsPutToOma}
                            onChange={() =>
                              toggleStudentCreditsPutToOma(student)
                            }
                            className="h-3.5 w-3.5 rounded text-brand cursor-pointer disabled:opacity-50"
                          />
                          <span
                            className={
                              student.creditsPutToOma
                                ? "text-success font-semibold"
                                : "text-ink-muted"
                            }
                          >
                            {student.creditsPutToOma
                              ? "OMAssa ✓"
                              : "Ei OMAssa"}
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-ink-muted/50">—</span>
                      )}
                    </td>

                    {/* Centered Actions */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-3 text-xs font-semibold">
                        <Link
                          href={`/teacher-view?internshipId=${student.internshipId}`}
                          className="text-brand hover:text-brand-hover hover:underline"
                        >
                          Review
                        </Link>
                        <Link
                          href={`/guidance-evaluation?internshipId=${student.internshipId}`}
                          className="text-ink-muted hover:text-ink hover:underline"
                          title="View guidance evaluation"
                        >
                          Evaluation
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
