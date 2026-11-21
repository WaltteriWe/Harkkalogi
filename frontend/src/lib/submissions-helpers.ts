import type {
  SubmissionSubjectItem,
  AttachedDocumentItem,
} from "@/components/submissionsStack";
import type { InternshipItem } from "@/context/InternshipContext";
import type { PlanState } from "@/context/PlanContext";
import type { ReportState } from "@/lib/report-helpers";

export function buildSubmissionsPlans(
  internships: InternshipItem[],
  activeInternshipId: string,
  activePlan?: PlanState | null,
  onSelectInternship?: (id: string) => void
): SubmissionSubjectItem[] {
  return internships.map((internship) => {
    const isCombined = internship.scope === "combined" || internship.credits === 30;
    const planId = isCombined
      ? "plan-combined"
      : `plan-${internship.scope || (internship.order === 2 ? "h2" : "h1")}`;
    const title = isCombined
      ? "Koko harjoittelu – Internship plan"
      : `${internship.title} – Internship plan`;

    const isCurrentActive = internship.id === activeInternshipId;
    const planInfo = isCurrentActive && activePlan
      ? activePlan
      : internship.plan;

    const company = planInfo?.company || internship.company || "";
    const credits = internship.credits || (isCombined ? 30 : 15);
    const hours = internship.targetHours || (isCombined ? 800 : 400);
    const subtitle = company
      ? `${company} · ${credits} op (${hours} h)`
      : `${credits} op (${hours} h)`;

    const isLocked = Boolean(internship.isLocked);
    const isApproved = Boolean(internship.isPlanApproved || planInfo?.status === "approved");
    const isSubmitted = Boolean(
      internship.isPlanSubmitted || planInfo?.status === "submitted" || isApproved
    );

    let status: SubmissionSubjectItem["status"] = "not_started";
    if (isLocked) {
      status = "locked";
    } else if (isApproved) {
      status = "approved";
    } else if (isSubmitted) {
      status = "submitted";
    } else if (planInfo?.status === "draft" || internship.status === "ongoing") {
      status = "draft";
    } else {
      status = "not_started";
    }

    let metaDate = "Ready to start";
    if (isLocked) {
      metaDate = "Avautuu Harjoittelu 1:n suorittamisen jälkeen";
    } else if (planInfo?.approvedAt) {
      metaDate = `Approved on ${planInfo.approvedAt}`;
    } else if (planInfo?.submittedAt) {
      metaDate = `Submitted on ${planInfo.submittedAt}`;
    } else if (planInfo && "lastSavedAt" in planInfo && planInfo.lastSavedAt) {
      metaDate = `Draft saved at ${planInfo.lastSavedAt}`;
    } else if (status === "draft") {
      metaDate = "Draft in progress";
    }

    const actionHref = isLocked ? undefined : "/planning";
    const actionLabel = isLocked
      ? undefined
      : isApproved || isSubmitted
      ? "View plan"
      : status === "draft"
      ? "Edit plan"
      : "Start plan";

    return {
      id: planId,
      title,
      subtitle,
      metaDate,
      status,
      isLocked,
      lockedReason: isLocked
        ? "Avautuu Harjoittelu 1:n valmistumisen ja hyväksynnän jälkeen"
        : undefined,
      actionHref,
      actionLabel,
      onAction: onSelectInternship ? () => onSelectInternship(internship.id) : undefined,
    };
  });
}

export function buildSubmissionsReports(
  internships: InternshipItem[],
  activeInternshipId: string,
  activeReport?: ReportState | null,
  allReports: ReportState[] = [],
  onSelectInternship?: (id: string) => void
): SubmissionSubjectItem[] {
  return internships.map((internship) => {
    const isCombined = internship.scope === "combined" || internship.credits === 30;
    const reportId = isCombined
      ? "report-combined"
      : `report-${internship.scope || (internship.order === 2 ? "h2" : "h1")}`;
    const title = isCombined
      ? "Koko harjoittelu – Final report"
      : `${internship.title} – Final report`;

    const isCurrentActive = internship.id === activeInternshipId;
    const matchingReport = allReports.find(
      (r) =>
        (internship.backendId && r.internshipId === internship.backendId) ||
        (internship.report?.id && String(r.id) === String(internship.report.id)) ||
        r.id === `report-${internship.id}` ||
        r.id === `report-draft-${internship.id}` ||
        (internship.order === 1 && r.company === "Reaktor") ||
        (internship.order === 2 && r.company === "Futurice")
    );

    const reportInfo = isCurrentActive && activeReport ? activeReport : (matchingReport || internship.report);

    const targetHours = internship.targetHours || (isCombined ? 800 : 400);
    const loggedHours =
      internship.loggedHours !== undefined
        ? internship.loggedHours
        : internship.isReportApproved || internship.isReportSubmitted
        ? targetHours
        : internship.isPlanApproved
        ? Math.round(targetHours * 0.8)
        : 0;

    const isPlanApproved = Boolean(internship.isPlanApproved);
    const isLocked = Boolean(internship.isLocked) || !isPlanApproved;

    const isReportApproved = Boolean(
      internship.isReportApproved ||
      (reportInfo?.status &&
        (reportInfo.status.toLowerCase() === "approved" ||
          reportInfo.status.toLowerCase() === "reviewed"))
    );
    const isReportSubmitted = Boolean(
      internship.isReportSubmitted ||
      isReportApproved ||
      (reportInfo?.status && reportInfo.status.toLowerCase() === "submitted")
    );

    let status: SubmissionSubjectItem["status"] = "locked";
    if (isLocked) {
      status = "locked";
    } else if (isReportApproved) {
      status = "approved";
    } else if (isReportSubmitted) {
      status = "submitted";
    } else if (reportInfo?.status === "draft") {
      status = "draft";
    } else {
      status = "draft";
    }

    let metaDate = "Draft in progress";
    if (internship.isLocked) {
      metaDate = "Avautuu Harjoittelu 1:n jälkeen";
    } else if (!isPlanApproved) {
      metaDate = "Harjoittelusuunnitelman hyväksyntä vaaditaan ensin";
    } else if (reportInfo?.approvedAt) {
      metaDate = `Approved on ${reportInfo.approvedAt}`;
    } else if (reportInfo?.submittedAt) {
      metaDate = `Submitted on ${reportInfo.submittedAt}`;
    } else if (reportInfo && "lastSavedAt" in reportInfo && reportInfo.lastSavedAt) {
      metaDate = `Draft saved at ${reportInfo.lastSavedAt}`;
    } else if (status === "approved") {
      metaDate = `Approved on ${internship.endDate || "2025-08-30"}`;
    } else {
      metaDate = "Draft in progress";
    }

    let lockedReason: string | undefined = undefined;
    if (internship.isLocked) {
      lockedReason = "Avautuu Harjoittelu 1:n valmistumisen jälkeen";
    } else if (!isPlanApproved) {
      lockedReason = "Harjoittelusuunnitelman hyväksyntä vaaditaan ensin";
    }

    const actionHref = isLocked ? undefined : "/report";
    const actionLabel = isLocked
      ? undefined
      : isReportApproved || isReportSubmitted
      ? "View report"
      : "Edit report";

    return {
      id: reportId,
      title,
      subtitle: `${loggedHours} / ${targetHours} h`,
      metaDate,
      status,
      isLocked,
      lockedReason,
      actionHref,
      actionLabel,
      onAction: onSelectInternship ? () => onSelectInternship(internship.id) : undefined,
    };
  });
}

export function buildSubmissionsDocuments(
  internships: InternshipItem[],
  allReports: ReportState[] = []
): AttachedDocumentItem[] {
  const allAttachments: AttachedDocumentItem[] = [];

  // Gather attachments from all internships' reports
  for (const internship of internships) {
    const rep = internship.report;
    if (rep && Array.isArray(rep.attachments)) {
      for (const att of rep.attachments) {
        if (att && att.name && !allAttachments.some((d) => d.name === att.name)) {
          const attUploadedAt = "uploadedAt" in att ? (att as { uploadedAt?: string }).uploadedAt : undefined;
          allAttachments.push({
            id: att.id || `att-${att.name}`,
            name: att.name,
            date: attUploadedAt ? `Uploaded ${attUploadedAt}` : "Attached with report",
            size: att.size || "840 KB",
          });
        }
      }
    }
  }

  // Include any attachments in allReports not already present
  for (const r of allReports) {
    if (Array.isArray(r.attachments)) {
      for (const att of r.attachments) {
        if (att && att.name && !allAttachments.some((d) => d.name === att.name)) {
          const attUploadedAt = "uploadedAt" in att ? (att as { uploadedAt?: string }).uploadedAt : undefined;
          allAttachments.push({
            id: att.id || `att-${att.name}`,
            name: att.name,
            date: attUploadedAt ? `Uploaded ${attUploadedAt}` : "Attached with report",
            size: att.size || "840 KB",
          });
        }
      }
    }
  }

  // Default signed agreement if none or as part of the internship documents
  const defaultAgreement: AttachedDocumentItem = {
    id: "doc-agreement-1",
    name: "Harjoittelusopimus.pdf",
    date: "28.5.2026",
    size: "1.4 MB",
  };

  if (allAttachments.some((d) => d.name === defaultAgreement.name)) {
    return allAttachments;
  }

  return [defaultAgreement, ...allAttachments];
}

export function buildSubmissionsEvaluations(
  internships: InternshipItem[],
  onSelectInternship?: (id: string) => void
): SubmissionSubjectItem[] {
  return internships.map((internship) => {
    const isCombined = internship.scope === "combined" || internship.credits === 30;
    const evalId = isCombined
      ? "eval-combined"
      : `eval-${internship.scope || (internship.order === 2 ? "h2" : "h1")}`;
    const title = isCombined
      ? "Koko harjoittelu – Guidance evaluation"
      : `${internship.title} – Guidance evaluation`;
    const credits = internship.credits || (isCombined ? 30 : 15);
    const subtitle = `${credits} op · Harjoittelun ohjauksen arviointi`;

    const isEvalSubmitted = Boolean(
      internship.isEvaluationSubmitted ||
      internship.evaluation?.status?.toUpperCase() === "SUBMITTED"
    );
    const isReportApproved = Boolean(internship.isReportApproved);
    const isLocked = Boolean(
      internship.isEvaluationLocked ?? (!isReportApproved || internship.isLocked)
    );

    let status: SubmissionSubjectItem["status"] = "locked";
    if (isEvalSubmitted) {
      status = "completed";
    } else if (isLocked) {
      status = "locked";
    } else {
      status = "ready";
    }

    let metaDate = "Ready to be completed";
    if (isEvalSubmitted) {
      const subDate = internship.evaluation?.submittedAt?.split("T")[0];
      metaDate = subDate ? `Completed on ${subDate}` : "Completed";
    } else if (internship.isLocked) {
      metaDate = `Avautuu Harjoittelu ${internship.order}:n loppuraportin jälkeen`;
    } else if (isLocked) {
      metaDate = isCombined
        ? "Avautuu loppuraportin hyväksymisen jälkeen"
        : `Avautuu ${internship.title}:n loppuraportin hyväksymisen jälkeen`;
    } else {
      metaDate = "Ready to be completed";
    }

    let lockedReason: string | undefined = undefined;
    if (!isEvalSubmitted && isLocked) {
      lockedReason = internship.isLocked
        ? `Avautuu Harjoittelu ${internship.order}:n suorittamisen jälkeen`
        : isCombined
        ? "Avautuu loppuraportin hyväksymisen jälkeen"
        : `Avautuu ${internship.title}:n loppuraportin hyväksymisen jälkeen`;
    }

    const evalBackendId = internship.backendId || (internship.order === 2 ? 2 : 1);
    const actionHref = `/guidance-evaluation?internshipId=${evalBackendId}`;
    const actionLabel = isEvalSubmitted
      ? "View evaluation"
      : isLocked
      ? "View preview"
      : "Open evaluation";

    return {
      id: evalId,
      title,
      subtitle,
      metaDate,
      status,
      isLocked: !isEvalSubmitted && isLocked,
      lockedReason,
      actionHref,
      actionLabel,
      onAction: onSelectInternship ? () => onSelectInternship(internship.id) : undefined,
    };
  });
}
