"use client";

import React, { useState, useMemo } from "react";
import SubmissionsStack, {
  type SubmissionSubjectItem,
  type AttachedDocumentItem,
} from "@/components/submissionsStack";
import { usePlan } from "@/context/PlanContext";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import {
  buildSubmissionsPlans,
  buildSubmissionsReports,
  buildSubmissionsDocuments,
  buildSubmissionsEvaluations,
} from "@/lib/submissions-helpers";

export default function SubmissionsPage() {
  const { plan: activePlan } = usePlan();
  const { report: activeReport, reports: allReports } = useReport();
  const {
    internships,
    activeInternshipId,
    setActiveInternshipId,
  } = useInternship();

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDownload = (fileName: string) => {
    showNotification(`Downloading "${fileName}"...`);
  };

  // 1. Plans (Stage 1: All internships)
  const plans: SubmissionSubjectItem[] = useMemo(() => {
    return buildSubmissionsPlans(
      internships,
      activeInternshipId,
      activePlan,
      setActiveInternshipId
    );
  }, [internships, activeInternshipId, activePlan, setActiveInternshipId]);

  // 2. Reports (Stage 2: All internships)
  const reports: SubmissionSubjectItem[] = useMemo(() => {
    return buildSubmissionsReports(
      internships,
      activeInternshipId,
      activeReport,
      allReports,
      setActiveInternshipId
    );
  }, [internships, activeInternshipId, activeReport, allReports, setActiveInternshipId]);

  // 3. Documents attached across ALL internship reports - NO Category, NO Status
  const documents: AttachedDocumentItem[] = useMemo(() => {
    return buildSubmissionsDocuments(internships, allReports);
  }, [internships, allReports]);

  // 4. Guidance Evaluations (Stage 3: All internships)
  const evaluations: SubmissionSubjectItem[] = useMemo(() => {
    return buildSubmissionsEvaluations(internships, setActiveInternshipId);
  }, [internships, setActiveInternshipId]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Section */}
      <header className="flex flex-col gap-0.5">
        <h1>Submissions</h1>
        <p className="meta text-sm">
          Overview of your internship process submissions: plans, reports, documents and evaluations.
        </p>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="rounded-control bg-surface-muted border border-border px-4 py-3 text-sm text-ink transition-all">
          {notification}
        </div>
      )}

      {/* Stacked Submissions Component */}
      <SubmissionsStack
        plans={plans}
        reports={reports}
        documents={documents}
        evaluations={evaluations}
        onDownloadDocument={handleDownload}
      />
    </div>
  );
}
