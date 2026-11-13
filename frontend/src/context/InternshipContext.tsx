"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePlan } from "./PlanContext";
import { useReport } from "./ReportContext";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface InternshipItem {
  id: string;
  order: number;
  title: string;
  scope: "h1" | "h2" | "combined";
  company: string;
  targetHours: number;
  credits: number;
  status: "ongoing" | "completed" | "not_started";
  isLocked?: boolean;
}

export interface InternshipContextType {
  internships: InternshipItem[];
  activeInternshipId: string;
  activeInternship: InternshipItem;
  setActiveInternshipId: (id: string) => void;
  targetHours: number;
  loggedHours: number;
  remainingHours: number;
  isPlanApproved: boolean;
  isPlanSubmitted: boolean;
  isReportApproved: boolean;
  isReportSubmitted: boolean;
  isEvaluationLocked: boolean;
  currentStepNumber: number;
  scope: "h1" | "h2" | "combined";
  setScope: (scope: "h1" | "h2" | "combined") => void;
}

const DEFAULT_INTERNSHIPS: InternshipItem[] = [
  {
    id: "internship-1",
    order: 1,
    title: "Harjoittelu 1",
    scope: "h1",
    company: "",
    targetHours: 400,
    credits: 15,
    status: "not_started",
    isLocked: false,
  },
  {
    id: "internship-2",
    order: 2,
    title: "Harjoittelu 2",
    scope: "h2",
    company: "",
    targetHours: 400,
    credits: 15,
    status: "not_started",
    isLocked: true,
  },
];

const InternshipContext = createContext<InternshipContextType | undefined>(undefined);

export function InternshipProvider({ children }: { children: ReactNode }) {
  const { plan, setScope: setPlanScope } = usePlan();
  const { report, reports } = useReport();
  const { isAuthenticated } = useAuth();

  const [activeInternshipId, setActiveInternshipId] = useState<string>("internship-1");
  const [internships, setInternships] = useState<InternshipItem[]>(DEFAULT_INTERNSHIPS);

  // Sync with Plan's scope
  const currentScope = plan.scope || "h1";

  // Derive target hours from plan scope
  const targetHours = useMemo(() => {
    if (currentScope === "combined") return 800;
    const parsed = Number(plan.plannedHours);
    return isNaN(parsed) || parsed <= 0 ? 400 : parsed;
  }, [currentScope, plan.plannedHours]);

  // Status flags matching ReportingProgress logic
  const isPlanApproved = plan.status === "approved";
  const isPlanSubmitted = plan.status === "submitted" || isPlanApproved;
  // Crucial: Report submission/approval is strictly gated on plan approval!
  const isReportApproved = isPlanApproved && report.status === "approved";
  const isReportSubmitted = isPlanApproved && (report.status === "submitted" || isReportApproved);
  const isEvaluationLocked = !isReportApproved;

  // Calculate logged hours
  const loggedHours = useMemo(() => {
    if (!isPlanApproved) return 0;
    if (isReportApproved || isReportSubmitted) return targetHours;
    // If combined 800 h, default mock logged is 640; if 400 h, default mock is 320
    return targetHours === 800 ? 640 : 320;
  }, [isPlanApproved, isReportApproved, isReportSubmitted, targetHours]);

  const remainingHours = Math.max(0, targetHours - loggedHours);

  // Current step number (1 to 6)
  const currentStepNumber = useMemo(() => {
    if (!isPlanSubmitted) return 1;
    if (!isPlanApproved) return 2;
    if (!isReportSubmitted) return 3;
    if (!isReportApproved) return 5;
    return 6;
  }, [isPlanSubmitted, isPlanApproved, isReportSubmitted, isReportApproved]);

  // Adjust internships list based on scope and plan submission
  useEffect(() => {
    const company = plan.company || "";
    if (currentScope === "combined") {
      setInternships([
        {
          id: "internship-1",
          order: 1,
          title: "Koko harjoittelu",
          scope: "combined",
          company,
          targetHours: 800,
          credits: 30,
          status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
          isLocked: false,
        },
      ]);
      setActiveInternshipId("internship-1");
    } else {
      setInternships([
        {
          id: "internship-1",
          order: 1,
          title: "Harjoittelu 1",
          scope: "h1",
          company,
          targetHours: 400,
          credits: 15,
          status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
          isLocked: false,
        },
        {
          id: "internship-2",
          order: 2,
          title: "Harjoittelu 2",
          scope: "h2",
          company: "",
          targetHours: 400,
          credits: 15,
          status: "not_started",
          isLocked: !isReportApproved,
        },
      ]);
    }
  }, [currentScope, plan.company, isReportApproved, isPlanSubmitted]);

  const activeInternship = useMemo(() => {
    return internships.find((i) => i.id === activeInternshipId) || internships[0];
  }, [internships, activeInternshipId]);

  const setScope = useCallback(
    (scope: "h1" | "h2" | "combined") => {
      setPlanScope(scope);
    },
    [setPlanScope]
  );

  const value = useMemo(
    () => ({
      internships,
      activeInternshipId,
      activeInternship,
      setActiveInternshipId,
      targetHours,
      loggedHours,
      remainingHours,
      isPlanApproved,
      isPlanSubmitted,
      isReportApproved,
      isReportSubmitted,
      isEvaluationLocked,
      currentStepNumber,
      scope: currentScope,
      setScope,
    }),
    [
      internships,
      activeInternshipId,
      activeInternship,
      targetHours,
      loggedHours,
      remainingHours,
      isPlanApproved,
      isPlanSubmitted,
      isReportApproved,
      isReportSubmitted,
      isEvaluationLocked,
      currentStepNumber,
      currentScope,
      setScope,
    ]
  );

  return (
    <InternshipContext.Provider value={value}>{children}</InternshipContext.Provider>
  );
}

export function useInternship(): InternshipContextType {
  const context = useContext(InternshipContext);
  if (!context) {
    throw new Error("useInternship must be used within an InternshipProvider");
  }
  return context;
}
