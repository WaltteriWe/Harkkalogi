import { useMemo } from "react";

export type StepStatus = "done" | "current" | "upcoming";

export interface Step {
  stepNumber: number;
  title: string;
  detail: string;
  status: StepStatus;
  href: string;
}

export const DEFAULT_6_STEPS: Step[] = [
  {
    stepNumber: 1,
    title: "Plan submitted",
    detail: "Done 12.5.2026",
    status: "done",
    href: "/planning",
  },
  {
    stepNumber: 2,
    title: "Plan approved",
    detail: "Done 28.5.2026",
    status: "done",
    href: "/planning",
  },
  {
    stepNumber: 3,
    title: "Internship in progress",
    detail: "Active · 640 / 800 h",
    status: "current",
    href: "/",
  },
  {
    stepNumber: 4,
    title: "Report & work certificate",
    detail: "Due at end of internship",
    status: "upcoming",
    href: "/reports",
  },
  {
    stepNumber: 5,
    title: "Teacher approval",
    detail: "Credits to OMA",
    status: "upcoming",
    href: "/reports",
  },
  {
    stepNumber: 6,
    title: "Guidance evaluation",
    detail: "Unlocks after approval",
    status: "upcoming",
    href: "/guidance-evaluation",
  },
];

export function calculateInternshipSteps(steps: Step[] = DEFAULT_6_STEPS) {
  const currentIndex = steps.findIndex((s) => s.status === "current");
  const doneCount = steps.filter((s) => s.status === "done").length;

  return {
    steps,
    currentStep: currentIndex >= 0 ? steps[currentIndex] : null,
    currentIndex,
    doneCount,
    total: steps.length,
    progress: Math.round((doneCount / steps.length) * 100),
  };
}

export function useInternshipSteps(steps: Step[] = DEFAULT_6_STEPS) {
  return useMemo(() => calculateInternshipSteps(steps), [steps]);
}
