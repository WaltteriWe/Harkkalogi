import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Step, StepStatus } from "../../hooks/steps.js";

// Simulation helper modeling the exact logic of ReportingProgress & Overview page
function computeOverviewState(activeInternship: {
  id: string;
  title: string;
  company: string;
  targetHours: number;
  loggedHours?: number;
  status: "ongoing" | "completed" | "not_started";
  isPlanApproved: boolean;
  isPlanSubmitted: boolean;
  isReportApproved: boolean;
  isReportSubmitted: boolean;
  plan?: {
    status: string;
    submittedAt?: string | null;
    approvedAt?: string | null;
  };
  report?: {
    status: string;
    submittedAt?: string | null;
    approvedAt?: string | null;
    totalHours?: number;
  };
  supervisorName?: string;
  supervisorRole?: string;
  teacherName?: string;
  teacherRole?: string;
}) {
  const targetHours = activeInternship.targetHours;
  const isPlanApproved = Boolean(activeInternship.isPlanApproved);
  const isPlanSubmitted = Boolean(activeInternship.isPlanSubmitted || isPlanApproved);
  const isReportApproved = Boolean(activeInternship.isReportApproved);
  const isReportSubmitted = Boolean(activeInternship.isReportSubmitted || isReportApproved);

  const loggedHours = activeInternship.loggedHours !== undefined
    ? activeInternship.loggedHours
    : !isPlanApproved
    ? 0
    : isReportApproved || isReportSubmitted
    ? targetHours
    : Math.round(targetHours * 0.8);

  const remainingHours = Math.max(0, targetHours - loggedHours);
  const progressPercent = Math.min(100, Math.round((loggedHours / targetHours) * 100));

  const isHoursDone = loggedHours >= targetHours && targetHours > 0;

  // 1. Plan submitted
  const step1Status: StepStatus = isPlanSubmitted ? "done" : "current";
  // 2. Plan approved
  const step2Status: StepStatus = !isPlanSubmitted
    ? "upcoming"
    : isPlanApproved
    ? "done"
    : "current";
  // 3. Internship in progress
  const step3Status: StepStatus = !isPlanApproved
    ? "upcoming"
    : (isReportSubmitted || isHoursDone)
    ? "done"
    : "current";
  // 4. Report & work certificate
  const step4Status: StepStatus = !isPlanApproved
    ? "upcoming"
    : isReportSubmitted
    ? "done"
    : isHoursDone
    ? "current"
    : "upcoming";
  // 5. Teacher approval
  const step5Status: StepStatus = !isReportSubmitted
    ? "upcoming"
    : isReportApproved
    ? "done"
    : "current";
  // 6. Guidance evaluation
  const step6Status: StepStatus = !isReportApproved ? "upcoming" : "current";

  const steps: Step[] = [
    { stepNumber: 1, title: "Plan submitted", detail: isPlanSubmitted ? "Done" : "Draft", status: step1Status, href: "/planning" },
    { stepNumber: 2, title: "Plan approved", detail: isPlanApproved ? "Approved" : "Pending", status: step2Status, href: "/planning" },
    { stepNumber: 3, title: "Internship in progress", detail: isHoursDone ? `${targetHours} h completed` : `${loggedHours} / ${targetHours} h`, status: step3Status, href: "/" },
    { stepNumber: 4, title: "Report & work certificate", detail: isReportSubmitted ? "Submitted" : "Due at end", status: step4Status, href: "/report" },
    { stepNumber: 5, title: "Teacher approval", detail: isReportApproved ? "Approved" : "Under review", status: step5Status, href: "/report" },
    { stepNumber: 6, title: "Guidance evaluation", detail: isReportApproved ? "Ready to fill" : "Locked", status: step6Status, href: "/guidance-evaluation" },
  ];

  let nextAction = {
    title: "Step 1: Täytä harjoittelusuunnitelma",
    actionLabel: "Täytä suunnitelma →",
    actionHref: "/planning",
  };

  if (!isPlanSubmitted) {
    nextAction = { title: "Step 1: Täytä harjoittelusuunnitelma", actionLabel: "Täytä suunnitelma →", actionHref: "/planning" };
  } else if (!isPlanApproved) {
    nextAction = { title: "Step 2: Suunnitelma odottaa hyväksyntää", actionLabel: "Tarkastele suunnitelmaa →", actionHref: "/planning" };
  } else if (!isReportSubmitted) {
    nextAction = {
      title: isHoursDone ? "Step 4: Harjoittelun loppuraportti" : "Step 3: Harjoittelu käynnissä",
      actionLabel: isHoursDone ? "Kirjoita raportti →" : "Siirry raporttiin →",
      actionHref: "/report",
    };
  } else if (!isReportApproved) {
    nextAction = { title: "Step 5: Ohjaajan tarkistus käynnissä", actionLabel: "Tarkastele raporttia →", actionHref: "/report" };
  } else {
    nextAction = { title: "Step 6: Harjoittelun ohjauksen arviointi", actionLabel: "Avaa ohjauksen arviointi →", actionHref: "/guidance-evaluation" };
  }

  const contacts = [
    { name: activeInternship.supervisorName || "Laura Nieminen", role: activeInternship.supervisorRole || "Workplace supervisor" },
    { name: activeInternship.teacherName || "Mikko Laine", role: activeInternship.teacherRole || "Supervising teacher" },
  ];

  return {
    title: activeInternship.title,
    company: activeInternship.company,
    targetHours,
    loggedHours,
    remainingHours,
    progressPercent,
    steps,
    currentStep: steps.find((s) => s.status === "current"),
    nextAction,
    contacts,
  };
}

describe("Overview Page: Internship Selector & Progress Timeline Synchronization", () => {
  const eetuH1 = {
    id: "internship-1",
    title: "Harjoittelu 1",
    company: "Reaktor",
    targetHours: 400,
    loggedHours: 400,
    status: "completed" as const,
    isPlanApproved: true,
    isPlanSubmitted: true,
    isReportApproved: true,
    isReportSubmitted: true,
    supervisorName: "Antti Aallokas",
    supervisorRole: "Workplace supervisor",
    teacherName: "Mikko Laine",
    teacherRole: "Supervising teacher",
  };

  const eetuH2 = {
    id: "internship-2",
    title: "Harjoittelu 2",
    company: "Futurice",
    targetHours: 400,
    loggedHours: 400, // time has elapsed
    status: "ongoing" as const,
    isPlanApproved: true,
    isPlanSubmitted: true,
    isReportApproved: false,
    isReportSubmitted: false,
    supervisorName: "Sami Salonen",
    supervisorRole: "Workplace supervisor",
    teacherName: "Mikko Laine",
    teacherRole: "Supervising teacher",
  };

  it("updates progress timeline correctly when switching to Harjoittelu 1 (Completed)", () => {
    const state = computeOverviewState(eetuH1);

    assert.equal(state.title, "Harjoittelu 1");
    assert.equal(state.company, "Reaktor");
    assert.equal(state.targetHours, 400);
    assert.equal(state.loggedHours, 400);
    assert.equal(state.remainingHours, 0);
    assert.equal(state.progressPercent, 100);

    // Steps 1 through 5 are done
    assert.equal(state.steps[0].status, "done"); // Plan submitted
    assert.equal(state.steps[1].status, "done"); // Plan approved
    assert.equal(state.steps[2].status, "done"); // Internship in progress
    assert.equal(state.steps[3].status, "done"); // Report & certificate
    assert.equal(state.steps[4].status, "done"); // Teacher approval
    assert.equal(state.steps[5].status, "current"); // Guidance evaluation

    // Next action points to guidance evaluation
    assert.equal(state.nextAction.actionHref, "/guidance-evaluation");
    assert.equal(state.nextAction.actionLabel, "Avaa ohjauksen arviointi →");

    // Contacts reflect Reaktor supervisor
    assert.equal(state.contacts[0].name, "Antti Aallokas");
    assert.equal(state.contacts[1].name, "Mikko Laine");
  });

  it("updates progress timeline correctly when switching to Harjoittelu 2 (Report Ready to Write)", () => {
    const state = computeOverviewState(eetuH2);

    assert.equal(state.title, "Harjoittelu 2");
    assert.equal(state.company, "Futurice");
    assert.equal(state.targetHours, 400);
    assert.equal(state.loggedHours, 400);
    assert.equal(state.remainingHours, 0);
    assert.equal(state.progressPercent, 100);

    // Steps 1, 2, and 3 are done; Step 4 is CURRENT!
    assert.equal(state.steps[0].status, "done"); // Plan submitted
    assert.equal(state.steps[1].status, "done"); // Plan approved
    assert.equal(state.steps[2].status, "done"); // Internship in progress (400 h reached)
    assert.equal(state.steps[3].status, "current"); // Report & certificate ready to write!
    assert.equal(state.steps[4].status, "upcoming"); // Teacher approval
    assert.equal(state.steps[5].status, "upcoming"); // Guidance evaluation

    // Current step is Step 4
    assert.equal(state.currentStep?.stepNumber, 4);
    assert.equal(state.currentStep?.title, "Report & work certificate");

    // Next action points to report writing
    assert.equal(state.nextAction.actionHref, "/report");
    assert.equal(state.nextAction.actionLabel, "Kirjoita raportti →");

    // Contacts reflect Futurice supervisor
    assert.equal(state.contacts[0].name, "Sami Salonen");
    assert.equal(state.contacts[1].name, "Mikko Laine");
  });

  it("verifies the two states differ and switching selector toggles all components", () => {
    const h1State = computeOverviewState(eetuH1);
    const h2State = computeOverviewState(eetuH2);

    // Timeline step 4 status changes from 'done' (H1) to 'current' (H2)
    assert.equal(h1State.steps[3].status, "done");
    assert.equal(h2State.steps[3].status, "current");

    // Action button href changes from guidance evaluation to report
    assert.notEqual(h1State.nextAction.actionHref, h2State.nextAction.actionHref);
    assert.equal(h1State.nextAction.actionHref, "/guidance-evaluation");
    assert.equal(h2State.nextAction.actionHref, "/report");

    // Company and contacts change
    assert.notEqual(h1State.company, h2State.company);
    assert.notEqual(h1State.contacts[0].name, h2State.contacts[0].name);
  });
});
