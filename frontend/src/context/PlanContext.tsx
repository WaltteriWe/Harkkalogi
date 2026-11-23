"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useInternship } from "./InternshipContext";
import {
  useAutoSave,
  formatCurrentTime,
  type SaveStatus,
} from "@/hooks/useAutoSave";
import { registerDraftFlusher } from "@/lib/draft-registry";

import {
  calculateDurationWeeks,
  calculateEstimatedHours,
  calculateEstimatedCredits,
} from "@/lib/plan-calculations";

export interface LearningGoal {
  id: string;
  text: string;
}

export interface PlanState {
  scope: "h1" | "h2" | "combined";
  company: string;
  companyAddress: string;
  companyWebsite: string;
  jobTitle: string;
  supervisorName: string;
  supervisorPhone: string;
  supervisorEmail: string;
  supervisorTitle: string;
  supervisorContact: string;
  startDate: string;
  endDate: string;
  workloadType: "FULL_TIME" | "PART_TIME";
  plannedHours: number | string;
  hoursPerWeek: number | string;
  isInternational: boolean;
  isPaid: boolean;
  jobDescription: string;
  learningGoals: LearningGoal[];
  assessment: string;
  status: "draft" | "submitted" | "approved";
  lastSavedAt: string;
  submittedAt: string | null;
  approvedAt?: string | null;
  teacherFeedback?: string;
}

export const MIN_DESCRIPTION_WORDS = 100;
export const MIN_LEARNING_GOALS = 3;

export const EMPTY_PLAN: PlanState = {
  scope: "h1",
  company: "",
  companyAddress: "",
  companyWebsite: "",
  jobTitle: "",
  supervisorName: "",
  supervisorPhone: "",
  supervisorEmail: "",
  supervisorTitle: "",
  supervisorContact: "",
  startDate: "",
  endDate: "",
  workloadType: "FULL_TIME",
  plannedHours: 400,
  hoursPerWeek: 37.5,
  isInternational: false,
  isPaid: true,
  jobDescription: "",
  learningGoals: [],
  assessment: "",
  status: "draft",
  lastSavedAt: "",
  submittedAt: null,
  approvedAt: null,
  teacherFeedback: "",
};

export const DEFAULT_PLAN: PlanState = EMPTY_PLAN;

export function toPlanPayload(p: PlanState, status: "DRAFT" | "SUBMITTED") {
  return {
    scope: p.scope,
    company: p.company,
    companyAddress: p.companyAddress,
    companyWebsite: p.companyWebsite,
    jobTitle: p.jobTitle,
    supervisorName: p.supervisorName,
    supervisorPhone: p.supervisorPhone,
    supervisorEmail: p.supervisorEmail,
    supervisorTitle: p.supervisorTitle,
    supervisorContact: p.supervisorContact,
    startDate: p.startDate,
    endDate: p.endDate,
    workloadType: p.workloadType,
    plannedHours: p.plannedHours,
    hoursPerWeek: p.hoursPerWeek,
    isInternational: p.isInternational,
    isPaid: p.isPaid,
    jobDescription: p.jobDescription,
    learningGoals: p.learningGoals,
    assessment: p.assessment,
    status,
  };
}

export interface PlanContextType {
  plan: PlanState;
  setScope: (scope: "h1" | "h2" | "combined") => void;
  updatePlan: (patch: Partial<PlanState>) => void;
  updateField: <K extends keyof PlanState>(field: K, value: PlanState[K]) => void;
  addGoal: () => void;
  updateGoal: (id: string, text: string) => void;
  removeGoal: (id: string) => void;
  saveDraft: () => Promise<void>;
  submitPlan: () => Promise<{ success: boolean; message?: string }>;
  resetPlan: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  wordCount: number;
  checklist: {
    isEmployerFilled: boolean;
    isTermsFilled: boolean;
    isSupervisorFilled: boolean;
    isWordCountMet: boolean;
    hasEnoughGoals: boolean;
    isCreditTargetMet: boolean;
    canSubmit: boolean;
    isWorkplaceFilled: boolean;
    isPeriodFilled: boolean;
  };
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const {
    activeInternshipId,
    activeInternship,
    setScope: setInternshipScope,
    refreshInternships,
  } = useInternship();

  const [plan, setPlan] = useState<PlanState>(EMPTY_PLAN);
  const currentPlanInternshipRef = useRef<{ id: string; backendId?: number }>({
    id: activeInternshipId || "internship-1",
    backendId: activeInternship?.backendId,
  });
  const isDirtyRef = useRef<boolean>(false);
  const flushRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  const handleAutoSave = useCallback(
    async (p: PlanState, isBackground = false, isUnmounting = false) => {
      if (!isAuthenticated || p.status !== "draft") return;

      const bid = currentPlanInternshipRef.current.backendId ?? activeInternship?.backendId;
      const url = bid ? `/plans/my-plan?internshipId=${bid}` : "/plans/my-plan";
      await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify({
          ...toPlanPayload(p, "DRAFT"),
          internshipId: bid,
        }),
        keepalive: isBackground || isUnmounting,
      });
    },
    [isAuthenticated, activeInternship]
  );

  const {
    status: saveStatus,
    isDirty,
    lastSavedAt,
    notifyChange,
    flush,
  } = useAutoSave<PlanState>({
    data: plan,
    onSave: handleAutoSave,
    debounceMs: 2000,
    enabled: isAuthenticated && plan.status === "draft",
  });

  isDirtyRef.current = isDirty;
  flushRef.current = flush;

  // Sync plan whenever activeInternshipId, activeInternship or auth changes
  useEffect(() => {
    let isCancelled = false;

    const syncPlan = async () => {
      if (!isAuthenticated) {
        setPlan(EMPTY_PLAN);
        return;
      }

      const prevInternship = currentPlanInternshipRef.current;
      const nextInternshipId = activeInternshipId || "internship-1";

      // If switching active internship period and current plan has unsaved edits, flush first
      if (prevInternship.id !== nextInternshipId && isDirtyRef.current) {
        try {
          await flushRef.current();
        } catch (err) {
          console.error("Failed to flush plan draft before switching internship:", err);
        }
      }

      if (isCancelled) return;

      currentPlanInternshipRef.current = {
        id: nextInternshipId,
        backendId: activeInternship?.backendId,
      };

      const ip = activeInternship?.plan;
      if (ip) {
        if (prevInternship.id !== nextInternshipId || !isDirtyRef.current) {
          setPlan({
            scope: activeInternship.scope || "h1",
            company: ip.company || activeInternship.company || "",
            companyAddress: ip.companyAddress || "",
            companyWebsite: ip.companyWebsite || "",
            jobTitle: ip.jobTitle || "",
            supervisorName: ip.supervisorName || activeInternship.supervisorName || "",
            supervisorPhone: ip.supervisorPhone || "",
            supervisorEmail: ip.supervisorEmail || "",
            supervisorTitle: ip.supervisorTitle || "",
            supervisorContact: ip.supervisorContact || "",
            startDate: ip.startDate || activeInternship.startDate || "",
            endDate: ip.endDate || activeInternship.endDate || "",
            workloadType: ip.workloadType || "FULL_TIME",
            plannedHours: ip.plannedHours || activeInternship.targetHours || 400,
            hoursPerWeek: ip.hoursPerWeek !== undefined && ip.hoursPerWeek !== "" ? ip.hoursPerWeek : 37.5,
            isInternational: Boolean(ip.isInternational),
            isPaid: ip.isPaid !== false,
            jobDescription: ip.jobDescription || "",
            learningGoals: Array.isArray(ip.learningGoals) ? ip.learningGoals : [],
            assessment: ip.assessment || "",
            status: ip.status || "draft",
            lastSavedAt: "",
            submittedAt: ip.submittedAt || null,
            approvedAt: ip.approvedAt || null,
            teacherFeedback: ip.teacherFeedback || "",
          });
        }
        return;
      }

      // Otherwise, clean template for this internship
      if (prevInternship.id !== nextInternshipId || !isDirtyRef.current) {
        setPlan({
          ...EMPTY_PLAN,
          scope: activeInternship?.scope || "h1",
          company: activeInternship?.company || "",
          plannedHours: activeInternship?.targetHours || 400,
          startDate: activeInternship?.startDate || "",
          endDate: activeInternship?.endDate || "",
          supervisorName: activeInternship?.supervisorName || "",
        });
      }
    };

    syncPlan();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeInternshipId, activeInternship]);

  // Register flusher for pre-logout draft sync
  useEffect(() => {
    if (!isAuthenticated) return;
    return registerDraftFlusher("plan", async (): Promise<boolean> => {
      if (plan.status !== "draft") {
        return true;
      }
      if (saveStatus === "saved") {
        return true;
      }
      try {
        const success = await flush();
        return success === true;
      } catch {
        return false;
      }
    });
  }, [isAuthenticated, plan.status, saveStatus, flush]);

  const setScope = useCallback(
    (scope: "h1" | "h2" | "combined") => {
      setPlan((prev) => ({
        ...prev,
        scope,
        plannedHours: scope === "combined" ? 800 : 400,
      }));
      setInternshipScope(scope);
      notifyChange();
    },
    [setInternshipScope, notifyChange]
  );

  const updatePlan = useCallback(
    (patch: Partial<PlanState>) => {
      setPlan((prev) => ({ ...prev, ...patch }));
      notifyChange();
    },
    [notifyChange]
  );

  const updateField = useCallback(
    <K extends keyof PlanState>(field: K, value: PlanState[K]) => {
      setPlan((prev) => ({ ...prev, [field]: value }));
      notifyChange();
    },
    [notifyChange]
  );

  const addGoal = useCallback(() => {
    const newGoal: LearningGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: "",
    };
    setPlan((prev) => ({
      ...prev,
      learningGoals: [...prev.learningGoals, newGoal],
    }));
    notifyChange();
  }, [notifyChange]);

  const updateGoal = useCallback(
    (id: string, text: string) => {
      setPlan((prev) => ({
        ...prev,
        learningGoals: prev.learningGoals.map((g) =>
          g.id === id ? { ...g, text } : g
        ),
      }));
      notifyChange();
    },
    [notifyChange]
  );

  const removeGoal = useCallback(
    (id: string) => {
      setPlan((prev) => ({
        ...prev,
        learningGoals: prev.learningGoals.filter((g) => g.id !== id),
      }));
      notifyChange();
    },
    [notifyChange]
  );

  const saveDraft = useCallback(async () => {
    const time = formatCurrentTime();
    setPlan((prev) => ({ ...prev, lastSavedAt: time }));
    await flush();
  }, [flush]);

  const wordCount = useMemo(() => {
    const trimmed = plan.jobDescription.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [plan.jobDescription]);

  const checklist = useMemo(() => {
    const isEmployerFilled = Boolean(
      plan.company.trim() &&
        plan.companyAddress.trim() &&
        plan.companyWebsite.trim()
    );

    const isTermsFilled = Boolean(
      plan.startDate &&
        plan.endDate &&
        (plan.workloadType === "FULL_TIME" ||
          (Number(plan.hoursPerWeek) >= 1 && Number(plan.hoursPerWeek) <= 60))
    );

    const isSupervisorFilled =
      plan.isPaid ||
      Boolean(
        (plan.supervisorContact && plan.supervisorContact.trim().length > 0) ||
          (plan.supervisorName.trim() &&
            plan.supervisorPhone.trim() &&
            plan.supervisorEmail.trim() &&
            plan.supervisorTitle.trim())
      );

    const isWordCountMet = wordCount >= MIN_DESCRIPTION_WORDS;
    const hasEnoughGoals =
      plan.learningGoals.filter((g) => g.text.trim()).length >= MIN_LEARNING_GOALS;

    const weeks = calculateDurationWeeks(plan.startDate, plan.endDate);
    const hours = calculateEstimatedHours(weeks, plan.workloadType, plan.hoursPerWeek);
    const creditsCalc = calculateEstimatedCredits(hours, plan.scope);
    const isCreditTargetMet = creditsCalc.isMet;

    const canSubmit =
      isEmployerFilled &&
      isTermsFilled &&
      isSupervisorFilled &&
      isWordCountMet &&
      hasEnoughGoals;

    return {
      isEmployerFilled,
      isTermsFilled,
      isSupervisorFilled,
      isWordCountMet,
      hasEnoughGoals,
      isCreditTargetMet,
      canSubmit,
      isWorkplaceFilled: isEmployerFilled && isSupervisorFilled,
      isPeriodFilled: isTermsFilled,
    };
  }, [
    plan.company,
    plan.companyAddress,
    plan.companyWebsite,
    plan.startDate,
    plan.endDate,
    plan.workloadType,
    plan.hoursPerWeek,
    plan.isPaid,
    plan.supervisorContact,
    plan.supervisorName,
    plan.supervisorPhone,
    plan.supervisorEmail,
    plan.supervisorTitle,
    plan.scope,
    plan.learningGoals,
    wordCount,
  ]);

  const submitPlan = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    // Drain pending autosave debounce timer and in-flight draft first
    try {
      await flush();
    } catch (e) {
      console.warn("Autosave flush before submit encountered error:", e);
    }

    if (!checklist.canSubmit) {
      return {
        success: false,
        message: `Tarkista puuttuvat tiedot ennen lähettämistä.`,
      };
    }
    const now = new Date();
    const formattedDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const time = formatCurrentTime();

    if (isAuthenticated) {
      try {
        const bid = currentPlanInternshipRef.current.backendId ?? activeInternship?.backendId;
        const url = bid ? `/plans/my-plan?internshipId=${bid}` : "/plans/my-plan";
        await apiFetch(url, {
          method: "PATCH",
          body: JSON.stringify({
            ...toPlanPayload(plan, "SUBMITTED"),
            internshipId: bid,
          }),
        });
        await refreshInternships();
      } catch (err: any) {
        console.error("Failed to submit plan to backend:", err);
        return {
          success: false,
          message: err.message || "Suunnitelman lähetys epäonnistui.",
        };
      }
    }

    setPlan((prev) => ({
      ...prev,
      status: "submitted",
      submittedAt: formattedDate,
      lastSavedAt: time,
    }));
    return { success: true };
  }, [checklist.canSubmit, flush, isAuthenticated, plan, activeInternship, refreshInternships]);

  const resetPlan = useCallback(() => {
    setPlan(EMPTY_PLAN);
  }, []);

  const value = useMemo(
    () => ({
      plan,
      setScope,
      updatePlan,
      updateField,
      addGoal,
      updateGoal,
      removeGoal,
      saveDraft,
      submitPlan,
      resetPlan,
      saveStatus,
      lastSavedAt: lastSavedAt || plan.lastSavedAt,
      wordCount,
      checklist,
    }),
    [
      plan,
      setScope,
      updatePlan,
      updateField,
      addGoal,
      updateGoal,
      removeGoal,
      saveDraft,
      submitPlan,
      resetPlan,
      saveStatus,
      lastSavedAt,
      wordCount,
      checklist,
    ]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextType {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}
