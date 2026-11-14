"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePlan } from "./PlanContext";
import { useReport } from "./ReportContext";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface InternshipContact {
  name: string;
  role: string;
}

export interface InternshipPlanInfo {
  status: "draft" | "submitted" | "approved";
  submittedAt?: string | null;
  approvedAt?: string | null;
  teacherFeedback?: string;
  company?: string;
  jobTitle?: string;
  supervisorName?: string;
  supervisorContact?: string;
}

export interface InternshipReportInfo {
  status: "draft" | "submitted" | "approved";
  submittedAt?: string | null;
  approvedAt?: string | null;
  totalHours?: number | string;
}

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
  startDate?: string;
  endDate?: string;
  supervisorName?: string;
  supervisorRole?: string;
  teacherName?: string;
  teacherRole?: string;
  plan?: InternshipPlanInfo;
  report?: InternshipReportInfo;
  loggedHours?: number;
  isPlanApproved?: boolean;
  isPlanSubmitted?: boolean;
  isReportApproved?: boolean;
  isReportSubmitted?: boolean;
  isEvaluationLocked?: boolean;
  currentStepNumber?: number;
  contacts?: InternshipContact[];
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
  contacts: InternshipContact[];
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
  const { isAuthenticated, user } = useAuth();

  const [activeInternshipId, setActiveInternshipId] = useState<string>("internship-1");
  const [backendInternships, setBackendInternships] = useState<any[] | null>(null);
  const hasInitializedRef = useRef<string | null>(null);

  // Sync with Plan's scope
  const currentScope = plan.scope || "h1";

  // Load from /internships when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setBackendInternships(null);
      hasInitializedRef.current = null;
      return;
    }
    let isMounted = true;
    apiFetch<{ internships: any[] }>("/internships")
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data?.internships) && data.internships.length > 0) {
          setBackendInternships(data.internships);
        }
      })
      .catch(() => {
        // Fallback to client synthesis if offline/error
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.email]);

  // Adjust internships list based on backend data, scope, and plan/report state
  const internships = useMemo<InternshipItem[]>(() => {
    // 1. If backend internships are available, map them
    if (backendInternships && backendInternships.length > 0) {
      return backendInternships.map((bi) => {
        const scope: "h1" | "h2" | "combined" =
          bi.plan?.scope === "h2" ? "h2" : bi.plan?.scope === "combined" || bi.credits === 30 ? "combined" : "h1";
        const wf = bi.workflow || {};
        const biReports = Array.isArray(bi.reports) ? bi.reports : [];
        const latestReport = biReports[0] || null;
        const hasApprovedReport =
          wf.isReportApproved ??
          biReports.some(
            (r: any) =>
              (r.status || "").toLowerCase() === "reviewed" ||
              (r.status || "").toLowerCase() === "approved"
          );
        const hasSubmittedReport =
          wf.isReportSubmitted ??
          (hasApprovedReport ||
            biReports.some((r: any) => (r.status || "").toLowerCase() === "submitted"));

        const isPlanApproved = wf.isPlanApproved ?? (bi.plan?.status || "").toUpperCase() === "APPROVED";
        const isPlanSubmitted = wf.isPlanSubmitted ?? (isPlanApproved || (bi.plan?.status || "").toUpperCase() === "SUBMITTED");
        const isReportApproved = isPlanApproved && hasApprovedReport;
        const isReportSubmitted = isPlanApproved && hasSubmittedReport;
        const targetHours = wf.targetHours || bi.requiredHours || (scope === "combined" ? 800 : 400);
        const loggedHours = wf.loggedHours !== undefined ? wf.loggedHours : (isReportApproved ? targetHours : isPlanApproved ? Math.round(targetHours * 0.8) : 0);
        const status: "ongoing" | "completed" | "not_started" =
          bi.status?.toLowerCase() === "completed" || isReportApproved
            ? "completed"
            : isPlanSubmitted
            ? "ongoing"
            : "not_started";

        return {
          id: `internship-${bi.order || bi.id}`,
          order: bi.order || 1,
          title: bi.title || (scope === "h2" ? "Harjoittelu 2" : scope === "combined" ? "Koko harjoittelu" : "Harjoittelu 1"),
          scope,
          company: bi.company || bi.plan?.company || "",
          targetHours,
          loggedHours,
          credits: bi.credits || (scope === "combined" ? 30 : 15),
          status,
          isLocked: Boolean(bi.isLocked),
          startDate: bi.startDate ? String(bi.startDate).split("T")[0] : "",
          endDate: bi.endDate ? String(bi.endDate).split("T")[0] : "",
          supervisorName: bi.plan?.supervisorName || "Laura Nieminen",
          supervisorRole: "Workplace supervisor",
          teacherName: bi.teacher?.name || "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved,
          isPlanSubmitted,
          isReportApproved,
          isReportSubmitted,
          isEvaluationLocked: wf.isEvaluationLocked ?? !isReportApproved,
          currentStepNumber: wf.currentStepNumber,
          plan: bi.plan
            ? {
                status: (bi.plan.status || "draft").toLowerCase() as any,
                submittedAt: bi.plan.submittedAt ? String(bi.plan.submittedAt).split("T")[0] : null,
                approvedAt: bi.plan.approvedAt ? String(bi.plan.approvedAt).split("T")[0] : null,
                teacherFeedback: bi.plan.teacherFeedback || "",
                company: bi.plan.company || bi.company,
                supervisorName: bi.plan.supervisorName,
              }
            : undefined,
          report: latestReport
            ? {
                status:
                  (latestReport.status || "draft").toLowerCase() === "reviewed"
                    ? "approved"
                    : ((latestReport.status || "draft").toLowerCase() as any),
                submittedAt: latestReport.submittedAt ? String(latestReport.submittedAt).split("T")[0] : null,
                approvedAt: latestReport.createdAt ? String(latestReport.createdAt).split("T")[0] : null,
                totalHours: typeof latestReport.totalHours === "number" ? latestReport.totalHours : targetHours,
              }
            : undefined,
        };
      });
    }

    // 2. Client-side synthesis (demo accounts or fallback)
    const isEetu = user?.email === "eetu.makinen@metropolia.fi";

    if (isEetu) {
      return [
        {
          id: "internship-1",
          order: 1,
          title: "Harjoittelu 1",
          scope: "h1",
          company: "Reaktor",
          targetHours: 400,
          loggedHours: 400,
          credits: 15,
          status: "completed",
          isLocked: false,
          startDate: "2025-05-05",
          endDate: "2025-08-29",
          supervisorName: "Antti Aallokas",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved: true,
          isPlanSubmitted: true,
          isReportApproved: true,
          isReportSubmitted: true,
          isEvaluationLocked: false,
          currentStepNumber: 6,
          plan: {
            status: "approved",
            submittedAt: "2025-04-20",
            approvedAt: "2025-04-24",
            teacherFeedback: "Approved by Mikko Laine: Suunnitelma hyväksytty. Tavoitteet selkeät.",
            company: "Reaktor",
            supervisorName: "Antti Aallokas",
          },
          report: {
            status: "approved",
            submittedAt: "2025-08-28",
            approvedAt: "2025-08-30",
            totalHours: 400,
          },
        },
        {
          id: "internship-2",
          order: 2,
          title: "Harjoittelu 2",
          scope: "h2",
          company: "Futurice",
          targetHours: 400,
          loggedHours: 400,
          credits: 15,
          status: "ongoing",
          isLocked: false,
          startDate: "2026-05-04",
          endDate: "2026-10-16",
          supervisorName: "Sami Salonen",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved: true,
          isPlanSubmitted: true,
          isReportApproved: false,
          isReportSubmitted: false,
          isEvaluationLocked: true,
          currentStepNumber: 4,
          plan: {
            status: "approved",
            submittedAt: "2026-04-25",
            approvedAt: "2026-04-28",
            teacherFeedback: "Approved by Mikko Laine: Harjoittelu 2 suunnitelma hyväksytty.",
            company: "Futurice",
            supervisorName: "Sami Salonen",
          },
          report: {
            status: "draft",
            totalHours: 400,
          },
        },
      ];
    }

    // Default synthesis from plan & report contexts
    const isPlanApproved = plan.status === "approved";
    const isPlanSubmitted = plan.status === "submitted" || isPlanApproved;
    const hasApprovedReport =
      report.status === "approved" || reports.some((r) => r.status === "approved");
    const hasSubmittedReport =
      hasApprovedReport ||
      report.status === "submitted" ||
      reports.some((r) => r.status === "submitted");
    const isReportApproved = isPlanApproved && hasApprovedReport;
    const isReportSubmitted = isPlanApproved && hasSubmittedReport;

    const company = plan.company || (user?.email?.includes("aino") ? "Nordic Pixel Oy" : "");

    if (currentScope === "combined") {
      return [
        {
          id: "internship-1",
          order: 1,
          title: "Koko harjoittelu",
          scope: "combined",
          company,
          targetHours: 800,
          loggedHours: isReportApproved || isReportSubmitted ? 800 : isPlanApproved ? 640 : 0,
          credits: 30,
          status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
          isLocked: false,
          startDate: plan.startDate || "2026-05-04",
          endDate: plan.endDate || "2026-10-30",
          supervisorName: plan.supervisorName || "Teemu Tarkastaja",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved,
          isPlanSubmitted,
          isReportApproved,
          isReportSubmitted,
          isEvaluationLocked: !isReportApproved,
          plan: {
            status: plan.status,
            submittedAt: plan.submittedAt,
            approvedAt: plan.approvedAt,
            teacherFeedback: plan.teacherFeedback,
            company: plan.company,
            supervisorName: plan.supervisorName,
          },
          report: {
            status: report.status,
            submittedAt: report.submittedAt,
            approvedAt: report.approvedAt,
            totalHours: report.totalHours || 800,
          },
        },
      ];
    }

    return [
      {
        id: "internship-1",
        order: 1,
        title: "Harjoittelu 1",
        scope: "h1",
        company,
        targetHours: 400,
        loggedHours: isReportApproved || isReportSubmitted ? 400 : isPlanApproved ? 320 : 0,
        credits: 15,
        status: isReportApproved ? "completed" : isPlanSubmitted ? "ongoing" : "not_started",
        isLocked: false,
        startDate: plan.startDate || "2026-06-01",
        endDate: plan.endDate || "2026-11-30",
        supervisorName: plan.supervisorName || "Laura Nieminen",
        supervisorRole: "Workplace supervisor",
        teacherName: "Mikko Laine",
        teacherRole: "Supervising teacher",
        isPlanApproved,
        isPlanSubmitted,
        isReportApproved,
        isReportSubmitted,
        isEvaluationLocked: !isReportApproved,
        plan: {
          status: plan.status,
          submittedAt: plan.submittedAt,
          approvedAt: plan.approvedAt,
          teacherFeedback: plan.teacherFeedback,
          company: plan.company,
          supervisorName: plan.supervisorName,
        },
        report: {
          status: report.status,
          submittedAt: report.submittedAt,
          approvedAt: report.approvedAt,
          totalHours: report.totalHours || 400,
        },
      },
      {
        id: "internship-2",
        order: 2,
        title: "Harjoittelu 2",
        scope: "h2",
        company: "",
        targetHours: 400,
        loggedHours: 0,
        credits: 15,
        status: "not_started",
        isLocked: !isReportApproved,
        supervisorName: "Laura Nieminen",
        supervisorRole: "Workplace supervisor",
        teacherName: "Mikko Laine",
        teacherRole: "Supervising teacher",
        isPlanApproved: false,
        isPlanSubmitted: false,
        isReportApproved: false,
        isReportSubmitted: false,
        isEvaluationLocked: true,
      },
    ];
  }, [backendInternships, user?.email, plan, report, reports, currentScope]);

  // Set default active internship when user switches
  useEffect(() => {
    if (hasInitializedRef.current === user?.email) return;
    hasInitializedRef.current = user?.email || null;
    const h2 = internships.find((i) => i.id === "internship-2");
    const h1 = internships.find((i) => i.id === "internship-1");
    if (h1 && h1.status === "completed" && h2 && !h2.isLocked) {
      setActiveInternshipId("internship-2");
    } else {
      setActiveInternshipId(internships[0]?.id || "internship-1");
    }
  }, [internships, user?.email]);

  const activeInternship = useMemo(() => {
    return internships.find((i) => i.id === activeInternshipId) || internships[0] || DEFAULT_INTERNSHIPS[0];
  }, [internships, activeInternshipId]);

  const targetHours = activeInternship.targetHours || (activeInternship.scope === "combined" ? 800 : 400);
  const isPlanApproved = Boolean(activeInternship.isPlanApproved);
  const isPlanSubmitted = Boolean(activeInternship.isPlanSubmitted || isPlanApproved);
  const isReportApproved = Boolean(activeInternship.isReportApproved);
  const isReportSubmitted = Boolean(activeInternship.isReportSubmitted || isReportApproved);
  const isEvaluationLocked = Boolean(activeInternship.isEvaluationLocked ?? !isReportApproved);

  const loggedHours = useMemo(() => {
    if (activeInternship.loggedHours !== undefined) {
      return activeInternship.loggedHours;
    }
    if (!isPlanApproved) return 0;
    if (isReportApproved || isReportSubmitted) return targetHours;
    return targetHours === 800 ? 640 : 320;
  }, [activeInternship.loggedHours, isPlanApproved, isReportApproved, isReportSubmitted, targetHours]);

  const remainingHours = Math.max(0, targetHours - loggedHours);

  const currentStepNumber = useMemo(() => {
    if (activeInternship.currentStepNumber !== undefined) {
      return activeInternship.currentStepNumber;
    }
    if (!isPlanSubmitted) return 1;
    if (!isPlanApproved) return 2;
    if (!isReportSubmitted) return loggedHours >= targetHours ? 4 : 3;
    if (!isReportApproved) return 5;
    return 6;
  }, [activeInternship.currentStepNumber, isPlanSubmitted, isPlanApproved, isReportSubmitted, isReportApproved, loggedHours, targetHours]);

  const contacts = useMemo<InternshipContact[]>(() => {
    if (activeInternship.contacts && activeInternship.contacts.length > 0) {
      return activeInternship.contacts;
    }
    return [
      {
        name: activeInternship.supervisorName || "Laura Nieminen",
        role: activeInternship.supervisorRole || "Workplace supervisor",
      },
      {
        name: activeInternship.teacherName || "Mikko Laine",
        role: activeInternship.teacherRole || "Supervising teacher",
      },
    ];
  }, [activeInternship]);

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
      scope: activeInternship.scope || currentScope,
      setScope,
      contacts,
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
      contacts,
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

