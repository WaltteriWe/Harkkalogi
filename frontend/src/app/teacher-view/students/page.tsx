"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SupervisedStudent = {
  id: number;
  name: string;
  title: string;
  email: string;
  company: string | null;
  reportStatus: "needs_review" | "reviewed" | "in_progress";
};

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function isSupervisedStudent(value: unknown): value is SupervisedStudent {
  if (!value || typeof value !== "object") return false;
  const student = value as Record<string, unknown>;
  return (
    typeof student.id === "number" &&
    typeof student.name === "string" &&
    typeof student.title === "string" &&
    typeof student.email === "string" &&
    (typeof student.company === "string" || student.company === null) &&
    ["needs_review", "reviewed", "in_progress"].includes(
      String(student.reportStatus)
    )
  );
}

export default function MyStudentsPage() {
  const [students, setStudents] = useState<SupervisedStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`${backendUrl}/api/teacher/students`, {
      credentials: "include",
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            body && typeof body === "object" && "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Could not load your students.";
          throw new Error(message);
        }
        if (
          !body || typeof body !== "object" || !("students" in body) ||
          !Array.isArray(body.students) ||
          !body.students.every(isSupervisedStudent)
        ) {
          throw new Error("The server returned an invalid student list.");
        }
        if (active) setStudents(body.students);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load your students."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.company?.toLowerCase().includes(query) ?? false)
    );
  }, [students, searchQuery]);

  const getStatusBadge = (status: SupervisedStudent["reportStatus"]) => {
    switch (status) {
      case "needs_review":
        return <span className="pill-warning">Needs review</span>;
      case "reviewed":
        return <span className="pill-success">Reviewed</span>;
      default:
        return <span className="pill-neutral">In progress</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">My students</h1>
          <p className="text-sm text-ink-muted mt-1">
            Students assigned to your supervision and their report status
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
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Name, email or company"
            className="input py-2 text-sm w-56 sm:w-64"
          />
        </div>
      </header>

      {error && (
        <p role="alert" className="card border-danger text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/3">Student</th>
                <th className="w-1/3">Internship</th>
                <th>Report status</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-ink-muted">
                    Loading students…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-ink-muted">
                    {students.length === 0
                      ? "No students have been assigned to you yet. Ask an administrator to assign students from Users and roles."
                      : "No students match your search."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-surface-muted/30 transition-colors"
                  >
                    <td>
                      <p className="font-bold text-ink">{student.name}</p>
                      <p className="text-xs text-ink-muted">
                        {student.title} · {student.email}
                      </p>
                    </td>
                    <td className="text-sm text-ink">
                      {student.company ?? "Not registered"}
                    </td>
                    <td>{getStatusBadge(student.reportStatus)}</td>
                    <td className="text-right">
                      <Link
                        href="/teacher-view"
                        className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline"
                      >
                        Review
                      </Link>
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
