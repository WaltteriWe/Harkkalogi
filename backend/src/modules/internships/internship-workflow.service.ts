export type WorkflowStepStatus = "done" | "current" | "upcoming";

export interface WorkflowStep {
  stepNumber: number;
  title: string;
  detail: string;
  status: WorkflowStepStatus;
  href: string;
  isLocked?: boolean;
}

export interface ComputedInternshipWorkflow {
  internshipId: number;
  title: string;
  scope: "h1" | "h2" | "combined";
  targetHours: number;
  loggedHours: number;
  credits: number;
  steps: WorkflowStep[];
  currentStepNumber: number;
  isPlanApproved: boolean;
  isPlanSubmitted: boolean;
  isReportApproved: boolean;
  isReportSubmitted: boolean;
  isEvaluationLocked: boolean;
  nextAction: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  };
}

export function computeInternshipWorkflow(internship: any): ComputedInternshipWorkflow {
  const plan = internship.plan || null;
  const reports = Array.isArray(internship.reports) ? internship.reports : [];
  const latestReport = reports[0] || null;
  const guidanceEvaluation = internship.guidanceEvaluation || null;

  const scope: "h1" | "h2" | "combined" =
    plan?.scope === "h2" ? "h2" : plan?.scope === "combined" ? "combined" : "h1";

  const targetHours =
    internship.requiredHours || (scope === "combined" ? 800 : 400);

  // Check plan statuses
  const planStatus = (plan?.status || "").toUpperCase();
  const isPlanApproved = planStatus === "APPROVED";
  const isPlanSubmitted = planStatus === "SUBMITTED" || isPlanApproved;

  // Check report statuses - strictly gated on plan approval
  const reportStatus = (latestReport?.status || "").toUpperCase();
  const isReportApproved = isPlanApproved && (reportStatus === "REVIEWED" || reportStatus === "APPROVED");
  const isReportSubmitted = isPlanApproved && (reportStatus === "SUBMITTED" || isReportApproved);

  // Check evaluation statuses - strictly gated on report approval
  const evalStatus = (guidanceEvaluation?.status || "").toUpperCase();
  const isEvaluationSubmitted = isReportApproved && evalStatus === "SUBMITTED";
  const isEvaluationLocked = !isReportApproved;

  // Calculate hours
  let loggedHours = 0;
  if (!isPlanApproved) {
    loggedHours = 0;
  } else if (latestReport) {
    loggedHours = isReportSubmitted
      ? targetHours
      : typeof latestReport.totalHours === "number"
      ? latestReport.totalHours
      : 320;
  } else {
    loggedHours = Math.round(targetHours * 0.8);
  }

  const isHoursDone = loggedHours >= targetHours && targetHours > 0;

  // 1. Plan submitted
  const step1Status: WorkflowStepStatus = isPlanSubmitted ? "done" : "current";
  const step1Detail = isPlanSubmitted
    ? plan?.submittedAt
      ? `Submitted ${new Date(plan.submittedAt).toLocaleDateString("fi-FI")}`
      : "Submitted"
    : "Draft in progress";

  // 2. Plan approved
  const step2Status: WorkflowStepStatus = !isPlanSubmitted
    ? "upcoming"
    : isPlanApproved
    ? "done"
    : "current";
  const step2Detail = isPlanApproved
    ? plan?.approvedAt
      ? `Approved ${new Date(plan.approvedAt).toLocaleDateString("fi-FI")}`
      : "Approved"
    : isPlanSubmitted
    ? "Awaiting review"
    : "After submission";

  // 3. Internship in progress
  const step3Status: WorkflowStepStatus = !isPlanApproved
    ? "upcoming"
    : (isReportSubmitted || isHoursDone)
    ? "done"
    : "current";
  const step3Detail = !isPlanApproved
    ? "Starts after plan approval"
    : (isReportSubmitted || isHoursDone)
    ? `${targetHours} h completed`
    : `Active · ${loggedHours} / ${targetHours} h`;

  // 4. Report & work certificate
  const step4Status: WorkflowStepStatus = !isPlanApproved
    ? "upcoming"
    : isReportSubmitted
    ? "done"
    : isHoursDone
    ? "current"
    : "upcoming";
  const step4Detail = !isPlanApproved
    ? "Due at end of internship"
    : isReportSubmitted
    ? latestReport?.submittedAt
      ? `Submitted ${new Date(latestReport.submittedAt).toLocaleDateString("fi-FI")}`
      : "Submitted with certificate"
    : "Due at end of internship";

  // 5. Teacher approval
  const step5Status: WorkflowStepStatus = !isReportSubmitted
    ? "upcoming"
    : isReportApproved
    ? "done"
    : "current";
  const step5Detail = !isReportSubmitted
    ? "After report submission"
    : isReportApproved
    ? "Approved · Credits to OMA"
    : "Under teacher review";

  // 6. Guidance evaluation
  const step6Status: WorkflowStepStatus = !isReportApproved
    ? "upcoming"
    : isEvaluationSubmitted
    ? "done"
    : "current";
  const step6Detail = !isReportApproved
    ? "Unlocks after approval"
    : isEvaluationSubmitted
    ? "Completed"
    : "Ready to fill";

  const steps: WorkflowStep[] = [
    {
      stepNumber: 1,
      title: "Plan submitted",
      detail: step1Detail,
      status: step1Status,
      href: "/planning",
    },
    {
      stepNumber: 2,
      title: "Plan approved",
      detail: step2Detail,
      status: step2Status,
      href: "/planning",
    },
    {
      stepNumber: 3,
      title: "Internship in progress",
      detail: step3Detail,
      status: step3Status,
      href: "/",
    },
    {
      stepNumber: 4,
      title: "Report & work certificate",
      detail: step4Detail,
      status: step4Status,
      href: "/reports",
    },
    {
      stepNumber: 5,
      title: "Teacher approval",
      detail: step5Detail,
      status: step5Status,
      href: "/reports",
    },
    {
      stepNumber: 6,
      title: "Guidance evaluation",
      detail: step6Detail,
      status: step6Status,
      href: "/guidance-evaluation",
      isLocked: isEvaluationLocked,
    },
  ];

  let currentStepNumber = 1;
  const currentStep = steps.find((s) => s.status === "current");
  if (currentStep) {
    currentStepNumber = currentStep.stepNumber;
  } else if (steps.every((s) => s.status === "done")) {
    currentStepNumber = 6;
  }

  let nextAction = {
    title: "Step 1: Täytä harjoittelusuunnitelma",
    description:
      "Aloita täyttämällä harjoittelupaikkasi tiedot, työtehtävät ja oppimistavoitteet suunnitelmalomakkeeseen.",
    actionLabel: "Täytä suunnitelma →",
    actionHref: "/planning",
  };

  if (!isPlanSubmitted) {
    nextAction = {
      title: "Step 1: Täytä harjoittelusuunnitelma",
      description:
        "Aloita täyttämällä harjoittelupaikkasi tiedot, työtehtävät ja oppimistavoitteet suunnitelmalomakkeeseen.",
      actionLabel: "Täytä suunnitelma →",
      actionHref: "/planning",
    };
  } else if (!isPlanApproved) {
    nextAction = {
      title: "Step 2: Suunnitelma odottaa hyväksyntää",
      description:
        "Harjoittelusuunnitelma on toimitettu. Ohjaava opettaja vahvistaa sen ennen jakson aloitusta.",
      actionLabel: "Tarkastele suunnitelmaa →",
      actionHref: "/planning",
    };
  } else if (!isReportSubmitted) {
    nextAction = {
      title: "Step 3: Harjoittelu käynnissä",
      description:
        "Harjoittelusuunnitelma on hyväksytty. Muista seurata työtuntejasi ja valmistella harjoitteluraporttia.",
      actionLabel: "Siirry raportointiin →",
      actionHref: "/reports",
    };
  } else if (!isReportApproved) {
    nextAction = {
      title: "Step 5: Ohjaajan tarkistus käynnissä",
      description:
        "Harjoitteluraporttisi ja työtodistuksesi on toimitettu ohjaavalle opettajalle tarkistettavaksi.",
      actionLabel: "Tarkastele raporttia →",
      actionHref: "/reports",
    };
  } else if (!isEvaluationSubmitted) {
    nextAction = {
      title: "Step 6: Harjoittelun ohjauksen arviointi",
      description:
        "Harjoitteluraporttisi on hyväksytty! Täytä vielä harjoittelun ohjauksen arviointi suoritusprosessin viimeistelemiseksi.",
      actionLabel: "Avaa ohjauksen arviointi →",
      actionHref: "/guidance-evaluation",
    };
  }

  return {
    internshipId: internship.id,
    title: internship.title || (scope === "h2" ? "Harjoittelu 2" : "Harjoittelu 1"),
    scope,
    targetHours,
    loggedHours,
    credits: internship.credits || (scope === "combined" ? 30 : 15),
    steps,
    currentStepNumber,
    isPlanApproved,
    isPlanSubmitted,
    isReportApproved,
    isReportSubmitted,
    isEvaluationLocked,
    nextAction,
  };
}
