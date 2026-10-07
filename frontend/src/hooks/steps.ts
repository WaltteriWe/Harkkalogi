import { useMemo } from "react";

export type StepStatus = "done" | "current" | "upcoming";

export interface Step {
  title: string;
  detail: string;
  status: StepStatus;
}

const DEFAULT_STEPS: Step[] = [
  { title: "Plan approved", detail: "Done 12.5.2026", status: "done" },
  { title: "Agreement signed", detail: "Done 28.5.2026", status: "done" },
  { title: "Internship in progress", detail: "Current step", status: "current" },
  { title: "Final report", detail: "Due 15.12.2026", status: "upcoming" },
  { title: "Teacher assessment", detail: "After report", status: "upcoming" },
];

export function useInternshipSteps(steps: Step[] = DEFAULT_STEPS) {
  return useMemo(() => {
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
  }, [steps]);
}