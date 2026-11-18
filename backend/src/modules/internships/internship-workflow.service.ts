import { prisma } from "../../lib/prisma.ts";
import type { InternshipStage } from "../../../generated/prisma/enums.ts";

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
  stage: InternshipStage;
  targetHours: number;
  loggedHours: number;
  credits: number;
  creditsPutToOma: boolean;
  creditsPutToOmaAt: string | null;
  steps: WorkflowStep[];
  currentStepNumber: number;
  isPlanApproved: boolean;
  isPlanSubmitted: boolean;
  isReportApproved: boolean;
  isReportSubmitted: boolean;
  isEvaluationSubmitted: boolean;
  isEvaluationLocked: boolean;
  nextAction: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  };
}

/**
 * Authoritative sequential progression order of internship lifecycle stages
 */
export const STAGES = [
  "PLAN_DRAFT",
  "PLAN_SUBMITTED",
  "IN_PROGRESS",
  "REPORT_READY",
  "REPORT_SUBMITTED",
  "EVALUATION_PENDING",
  "COMPLETED",
] as const satisfies readonly InternshipStage[];

const STEP_METADATA = [
  { stepNumber: 1, title: "Plan submitted", href: "/planning" },
  { stepNumber: 2, title: "Plan approved", href: "/planning" },
  { stepNumber: 3, title: "Internship in progress", href: "/" },
  { stepNumber: 4, title: "Report & work certificate", href: "/report" },
  { stepNumber: 5, title: "Teacher approval", href: "/report" },
  { stepNumber: 6, title: "Guidance evaluation", href: "/guidance-evaluation" },
];

const NEXT_ACTIONS: Record<InternshipStage, {
  title: string;
  description: (oma: boolean) => string;
  actionLabel: string;
  actionHref: string;
}> = {
  PLAN_DRAFT: {
    title: "Step 1: Täytä harjoittelusuunnitelma",
    description: () => "Aloita täyttämällä harjoittelupaikkasi tiedot, työtehtävät ja oppimistavoitteet suunnitelmalomakkeeseen.",
    actionLabel: "Täytä suunnitelma →",
    actionHref: "/planning",
  },
  PLAN_SUBMITTED: {
    title: "Step 2: Suunnitelma odottaa hyväksyntää",
    description: () => "Harjoittelusuunnitelma on toimitettu. Ohjaava opettaja vahvistaa sen ennen jakson aloitusta.",
    actionLabel: "Tarkastele suunnitelmaa →",
    actionHref: "/planning",
  },
  IN_PROGRESS: {
    title: "Step 3: Harjoittelu käynnissä",
    description: () => "Harjoittelusuunnitelma on hyväksytty. Muista seurata työtuntejasi ja valmistella harjoitteluraporttia.",
    actionLabel: "Siirry raportointiin →",
    actionHref: "/report",
  },
  REPORT_READY: {
    title: "Step 4: Harjoittelun loppuraportti",
    description: () => "Harjoitteluaika on päättynyt ja vaaditut tunnit ovat täynnä. Kirjoita loppuraportti ja liitä työtodistus.",
    actionLabel: "Kirjoita raportti →",
    actionHref: "/report",
  },
  REPORT_SUBMITTED: {
    title: "Step 5: Ohjaajan tarkistus käynnissä",
    description: () => "Harjoitteluraporttisi ja työtodistuksesi on toimitettu ohjaavalle opettajalle tarkistettavaksi.",
    actionLabel: "Tarkastele raporttia →",
    actionHref: "/report",
  },
  EVALUATION_PENDING: {
    title: "Step 6: Harjoittelun ohjauksen arviointi",
    description: () => "Harjoitteluraporttisi on hyväksytty! Täytä vielä harjoittelun ohjauksen arviointi suoritusprosessin viimeistelemiseksi.",
    actionLabel: "Avaa ohjauksen arviointi →",
    actionHref: "/guidance-evaluation",
  },
  COMPLETED: {
    title: "Harjoittelu suoritettu",
    description: (oma) => oma
      ? "Kaikki harjoittelun vaiheet on suoritettu ja opintopisteet kirjattu OMAan."
      : "Kaikki harjoittelun vaiheet on suoritettu. Opintopisteiden kirjaus OMAan odottaa opettajan kuittausta.",
    actionLabel: "Tarkastele suoritusta →",
    actionHref: "/report",
  },
};

function formatDate(d?: any): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("fi-FI");
}

/**
 * Fast, pure presentation formatter reading authoritative database state
 */
export function computeInternshipWorkflow(internship: any): ComputedInternshipWorkflow {
  let stage: InternshipStage = internship.stage;

  const plan = internship.plan || null;
  const reports = Array.isArray(internship.reports) ? internship.reports : [];
  const latestReport = reports[0] || null;
  const evalSubmitted = (internship.guidanceEvaluation?.status || "").toUpperCase() === "SUBMITTED";

  if (!stage) {
    const planApproved = (plan?.status || "").toUpperCase() === "APPROVED";
    const planSubmitted = planApproved || (plan?.status || "").toUpperCase() === "SUBMITTED";
    const reportApproved =
      planApproved &&
      (["REVIEWED", "APPROVED"].includes((latestReport?.status || "").toUpperCase()) ||
        latestReport?.reviews?.some((r: any) => (r.decision || "").toUpperCase() === "APPROVED"));
    const reportSubmitted =
      planApproved &&
      (reportApproved || (latestReport?.status || "").toUpperCase() === "SUBMITTED");
    const target = internship.requiredHours || (plan?.scope === "combined" ? 800 : 400);
    const hoursDone =
      planApproved &&
      ((internship.loggedHours || latestReport?.totalHours || 0) >= target ||
        Boolean(internship.endDate && new Date(internship.endDate) <= new Date()));

    stage =
      reportApproved && evalSubmitted ? "COMPLETED" :
      reportApproved                  ? "EVALUATION_PENDING" :
      reportSubmitted                 ? "REPORT_SUBMITTED" :
      hoursDone                       ? "REPORT_READY" :
      planApproved                    ? "IN_PROGRESS" :
      planSubmitted                   ? "PLAN_SUBMITTED" :
                                        "PLAN_DRAFT";
  }

  const stageIndex = Math.max(0, STAGES.indexOf(stage));
  // Map 7 lifecycle stages onto the 6 visual UI stepper circles:
  // Stages 1..5 map to steps 1..5. Stages 6 and 7 (EVALUATION_PENDING and COMPLETED) both map to Step 6.
  const currentStep = Math.min(6, stageIndex + 1);
  const isDone = stage === "COMPLETED";

  const targetHours = internship.requiredHours || (plan?.scope === "combined" ? 800 : 400);
  const loggedHours =
    stageIndex >= STAGES.indexOf("REPORT_READY")
      ? targetHours
      : stageIndex >= STAGES.indexOf("IN_PROGRESS")
      ? internship.loggedHours || Math.round(targetHours * 0.8)
      : 0;
  const creditsPutToOma = Boolean(internship.creditsPutToOma);

  const isPlanSubmitted = stageIndex >= STAGES.indexOf("PLAN_SUBMITTED");
  const isPlanApproved = stageIndex >= STAGES.indexOf("IN_PROGRESS");
  const isReportSubmitted = stageIndex >= STAGES.indexOf("REPORT_SUBMITTED");
  const isReportApproved = stageIndex >= STAGES.indexOf("EVALUATION_PENDING");
  const isEvaluationSubmitted = isDone;
  const isEvaluationLocked = stageIndex < STAGES.indexOf("EVALUATION_PENDING");

  const details: Record<number, string> = {
    1: isPlanSubmitted ? (plan?.submittedAt ? `Submitted ${formatDate(plan.submittedAt)}` : "Submitted") : "Draft in progress",
    2: isPlanApproved ? (plan?.approvedAt ? `Approved ${formatDate(plan.approvedAt)}` : "Approved") : isPlanSubmitted ? "Awaiting review" : "After submission",
    3: stageIndex < STAGES.indexOf("IN_PROGRESS") ? "Starts after plan approval" : stageIndex >= STAGES.indexOf("REPORT_READY") ? `${targetHours} h completed` : `Active · ${loggedHours} / ${targetHours} h`,
    4: isReportSubmitted ? (latestReport?.submittedAt ? `Submitted ${formatDate(latestReport.submittedAt)}` : "Submitted with certificate") : "Due at end of internship",
    5: stageIndex < STAGES.indexOf("REPORT_SUBMITTED") ? "After report submission" : isReportApproved ? (creditsPutToOma ? "Approved · Credits in OMA" : "Approved · Awaiting OMA entry") : "Under teacher review",
    6: isEvaluationLocked ? "Unlocks after approval" : isDone ? "Completed" : "Ready to fill",
  };

  const steps: WorkflowStep[] = STEP_METADATA.map((meta) => ({
    stepNumber: meta.stepNumber,
    title: meta.title,
    detail: details[meta.stepNumber] || "",
    status:
      meta.stepNumber < currentStep
        ? "done"
        : meta.stepNumber === currentStep
        ? isDone ? "done" : "current"
        : "upcoming",
    href: meta.href,
    isLocked: meta.stepNumber === 6 ? isEvaluationLocked : undefined,
  }));

  const actionConfig = NEXT_ACTIONS[stage] || NEXT_ACTIONS.PLAN_DRAFT;
  const nextAction = {
    title: actionConfig.title,
    description: actionConfig.description(creditsPutToOma),
    actionLabel: actionConfig.actionLabel,
    actionHref: actionConfig.actionHref,
  };

  return {
    internshipId: internship.id,
    title: internship.title || (plan?.scope === "h2" ? "Harjoittelu 2" : "Harjoittelu 1"),
    scope: plan?.scope === "h2" ? "h2" : plan?.scope === "combined" ? "combined" : "h1",
    stage,
    targetHours,
    loggedHours,
    credits: internship.credits || (plan?.scope === "combined" ? 30 : 15),
    creditsPutToOma,
    creditsPutToOmaAt: internship.creditsPutToOmaAt
      ? new Date(internship.creditsPutToOmaAt).toISOString()
      : null,
    steps,
    currentStepNumber: currentStep,
    isPlanApproved,
    isPlanSubmitted,
    isReportApproved,
    isReportSubmitted,
    isEvaluationSubmitted,
    isEvaluationLocked,
    nextAction,
  };
}

/**
 * Synchronizes the database row during lifecycle mutations (e.g. plan/report/eval submitted)
 */
export async function syncWorkflowState(
  internshipId: number,
  tx: any = prisma
): Promise<ComputedInternshipWorkflow | null> {
  const internship = await tx.internship.findUnique({
    where: { id: internshipId },
    include: {
      plan: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1, include: { reviews: true } },
      guidanceEvaluation: true,
    },
  });

  if (!internship) return null;

  // Compute using the fallback resolver (since stage is being recomputed)
  const computed = computeInternshipWorkflow({ ...internship, stage: undefined });

  await tx.internship.update({
    where: { id: internshipId },
    data: {
      stage: computed.stage,
      loggedHours: computed.loggedHours,
      status: computed.stage === "COMPLETED" ? "COMPLETED" : "ONGOING",
    },
  });

  return computed;
}
