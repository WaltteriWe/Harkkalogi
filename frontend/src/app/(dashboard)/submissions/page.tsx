"use client";

import React, { useState, useMemo } from "react";
import SubmissionsStack, {
  type SubmissionSubjectItem,
  type AttachedDocumentItem,
} from "@/components/submissionsStack";
import { usePlan } from "@/context/PlanContext";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";

export default function SubmissionsPage() {
  const { plan } = usePlan();
  const { report } = useReport();
  const {
    scope,
    loggedHours,
    targetHours,
    isPlanApproved,
    isReportApproved,
    isEvaluationLocked,
  } = useInternship();

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDownload = (fileName: string) => {
    showNotification(`Downloading "${fileName}"...`);
  };

  // 1. Plans (0-2 submissions)
  const plans: SubmissionSubjectItem[] = useMemo(() => {
    if (scope === "combined") {
      return [
        {
          id: "plan-combined",
          title: "Koko harjoittelu – Internship plan",
          subtitle: plan.company ? `${plan.company} · 30 op (800 h)` : "30 op (800 h)",
          metaDate: plan.approvedAt
            ? `Approved on ${plan.approvedAt}`
            : plan.submittedAt
            ? `Submitted on ${plan.submittedAt}`
            : plan.lastSavedAt
            ? `Draft saved at ${plan.lastSavedAt}`
            : "Draft in progress",
          status: plan.status,
          isLocked: false,
          actionHref: "/planning",
          actionLabel: plan.status === "approved" ? "View plan" : "Edit plan",
        },
      ];
    }

    return [
      {
        id: "plan-h1",
        title: "Harjoittelu 1 – Internship plan",
        subtitle: plan.company ? `${plan.company} · 15 op (400 h)` : "15 op (400 h)",
        metaDate: plan.approvedAt
          ? `Approved on ${plan.approvedAt}`
          : plan.submittedAt
          ? `Submitted on ${plan.submittedAt}`
          : plan.lastSavedAt
          ? `Draft saved at ${plan.lastSavedAt}`
          : "Draft in progress",
        status: plan.status,
        isLocked: false,
        actionHref: "/planning",
        actionLabel: plan.status === "approved" ? "View plan" : "Edit plan",
      },
      {
        id: "plan-h2",
        title: "Harjoittelu 2 – Internship plan",
        subtitle: "15 op (400 h)",
        metaDate: !isReportApproved
          ? "Avautuu Harjoittelu 1:n suorittamisen jälkeen"
          : "Ready to start",
        status: !isReportApproved ? "locked" : "not_started",
        isLocked: !isReportApproved,
        lockedReason: "Avautuu Harjoittelu 1:n valmistumisen ja hyväksynnän jälkeen",
        actionHref: isReportApproved ? "/planning" : undefined,
        actionLabel: isReportApproved ? "Start plan" : undefined,
      },
    ];
  }, [scope, plan, isReportApproved]);

  // 2. Reports (0-2 submissions)
  const reports: SubmissionSubjectItem[] = useMemo(() => {
    if (scope === "combined") {
      return [
        {
          id: "report-combined",
          title: "Koko harjoittelu – Final report",
          subtitle: `${loggedHours} / ${targetHours} h`,
          metaDate: report.approvedAt
            ? `Approved on ${report.approvedAt}`
            : report.submittedAt
            ? `Submitted on ${report.submittedAt}`
            : report.lastSavedAt
            ? `Draft saved at ${report.lastSavedAt}`
            : "Draft in progress",
          status: !isPlanApproved ? "locked" : report.status,
          isLocked: !isPlanApproved,
          lockedReason: "Harjoittelusuunnitelman hyväksyntä vaaditaan ensin",
          actionHref: isPlanApproved ? "/report" : undefined,
          actionLabel: !isPlanApproved
            ? "Locked"
            : report.status === "approved"
            ? "View report"
            : "Edit report",
        },
      ];
    }

    return [
      {
        id: "report-h1",
        title: "Harjoittelu 1 – Final report",
        subtitle: `${loggedHours} / 400 h`,
        metaDate: report.approvedAt
          ? `Approved on ${report.approvedAt}`
          : report.submittedAt
          ? `Submitted on ${report.submittedAt}`
          : report.lastSavedAt
          ? `Draft saved at ${report.lastSavedAt}`
          : "Draft in progress",
        status: !isPlanApproved ? "locked" : report.status,
        isLocked: !isPlanApproved,
        lockedReason: "Harjoittelusuunnitelman hyväksyntä vaaditaan ensin",
        actionHref: isPlanApproved ? "/report" : undefined,
        actionLabel: !isPlanApproved
          ? "Locked"
          : report.status === "approved"
          ? "View report"
          : "Edit report",
      },
      {
        id: "report-h2",
        title: "Harjoittelu 2 – Final report",
        subtitle: "0 / 400 h",
        metaDate: "Avautuu Harjoittelu 1:n jälkeen",
        status: "locked",
        isLocked: true,
        lockedReason: "Avautuu Harjoittelu 1:n valmistumisen jälkeen",
        actionHref: undefined,
        actionLabel: undefined,
      },
    ];
  }, [scope, report, loggedHours, targetHours, isPlanApproved]);

  // Documents attached to report - NO Category, NO Status
  const documents: AttachedDocumentItem[] = useMemo(() => {
    const reportDocs: AttachedDocumentItem[] = report.attachments.map((att) => ({
      id: att.id,
      name: att.name,
      date: "Attached with report",
      size: att.size || "840 KB",
    }));

    // Include the default signed agreement if none or as part of the internship documents
    const defaultAgreement: AttachedDocumentItem = {
      id: "doc-agreement-1",
      name: "Harjoittelusopimus.pdf",
      date: "28.5.2026",
      size: "1.4 MB",
    };

    if (reportDocs.some((d) => d.name === defaultAgreement.name)) {
      return reportDocs;
    }

    return [defaultAgreement, ...reportDocs];
  }, [report.attachments]);

  // 3. Evaluations (0-2 submissions)
  const evaluations: SubmissionSubjectItem[] = useMemo(() => {
    if (scope === "combined") {
      return [
        {
          id: "eval-combined",
          title: "Koko harjoittelu – Guidance evaluation",
          subtitle: "30 op · Harjoittelun ohjauksen arviointi",
          metaDate: isEvaluationLocked
            ? "Avautuu loppuraportin hyväksymisen jälkeen"
            : "Ready to be completed",
          status: isEvaluationLocked ? "locked" : "ready",
          isLocked: isEvaluationLocked,
          lockedReason: "Avautuu loppuraportin hyväksymisen jälkeen",
          actionHref: "/guidance-evaluation",
          actionLabel: isEvaluationLocked ? "View preview" : "Open evaluation",
        },
      ];
    }

    return [
      {
        id: "eval-h1",
        title: "Harjoittelu 1 – Guidance evaluation",
        subtitle: "15 op · Harjoittelun ohjauksen arviointi",
        metaDate: isEvaluationLocked
          ? "Avautuu loppuraportin hyväksymisen jälkeen"
          : "Ready to be completed",
        status: isEvaluationLocked ? "locked" : "ready",
        isLocked: isEvaluationLocked,
        lockedReason: "Avautuu Harjoittelu 1:n loppuraportin hyväksymisen jälkeen",
        actionHref: "/guidance-evaluation",
        actionLabel: isEvaluationLocked ? "View preview" : "Open evaluation",
      },
      {
        id: "eval-h2",
        title: "Harjoittelu 2 – Guidance evaluation",
        subtitle: "15 op · Harjoittelun ohjauksen arviointi",
        metaDate: "Avautuu Harjoittelu 2:n loppuraportin jälkeen",
        status: "locked",
        isLocked: true,
        lockedReason: "Avautuu Harjoittelu 2:n suorittamisen jälkeen",
        actionHref: "/guidance-evaluation",
        actionLabel: "View preview",
      },
    ];
  }, [scope, isEvaluationLocked]);

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
