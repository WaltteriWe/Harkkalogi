"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "./AuthContext";
import {
  useAutoSave,
  formatCurrentTime,
  type SaveStatus,
} from "@/hooks/useAutoSave";

export interface LearningGoal {
  id: string;
  text: string;
}

export interface PlanState {
  company: string;
  jobTitle: string;
  supervisorName: string;
  supervisorContact: string;
  startDate: string;
  endDate: string;
  plannedHours: number | string;
  hoursPerWeek: number | string;
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

const DEFAULT_PLAN: PlanState = {
  company: "",
  jobTitle: "",
  supervisorName: "",
  supervisorContact: "",
  startDate: "",
  endDate: "",
  plannedHours: 800,
  hoursPerWeek: "",
  jobDescription: "",
  learningGoals: [],
  assessment: "",
  status: "draft",
  lastSavedAt: "—",
  submittedAt: null,
};

const STORAGE_KEY = "harkkalogi_plan_store_v1";

let currentPlan: PlanState = DEFAULT_PLAN;
let isLoadedFromStorage = false;
let listeners: Array<() => void> = [];

function loadFromStorage(): PlanState {
  if (isLoadedFromStorage) return currentPlan;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.learningGoals)) {
          currentPlan = { ...DEFAULT_PLAN, ...parsed };
        }
      }
    } catch {
      // Ignore
    }
    isLoadedFromStorage = true;
  }
  return currentPlan;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setPlan(next: PlanState | ((prev: PlanState) => PlanState)) {
  const resolved = typeof next === "function" ? next(currentPlan) : next;
  currentPlan = resolved;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
    } catch {
      // Ignore
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        currentPlan = { ...DEFAULT_PLAN, ...JSON.parse(event.newValue) };
        notify();
      } catch {
        // Ignore
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function getSnapshot(): PlanState {
  return loadFromStorage();
}

function getServerSnapshot(): PlanState {
  return DEFAULT_PLAN;
}

export interface PlanContextType {
  plan: PlanState;
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
    isWorkplaceFilled: boolean;
    isPeriodFilled: boolean;
    isWordCountMet: boolean;
    hasEnoughGoals: boolean;
    canSubmit: boolean;
  };
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const plan = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { isAuthenticated } = useAuth();

  // Load plan from backend on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    apiFetch<{ plan: any }>("/plans/my-plan")
      .then((data) => {
        if (!isMounted || !data.plan) return;
        const p = data.plan;
        setPlan((prev) => ({
          ...prev,
          company:
            p.company !== undefined && p.company !== null ? p.company : prev.company,
          jobTitle:
            p.jobTitle !== undefined && p.jobTitle !== null ? p.jobTitle : prev.jobTitle,
          supervisorName:
            p.supervisorName !== undefined && p.supervisorName !== null
              ? p.supervisorName
              : prev.supervisorName,
          supervisorContact:
            p.supervisorContact !== undefined && p.supervisorContact !== null
              ? p.supervisorContact
              : prev.supervisorContact,
          startDate:
            p.startDate !== undefined && p.startDate !== null ? p.startDate : prev.startDate,
          endDate:
            p.endDate !== undefined && p.endDate !== null ? p.endDate : prev.endDate,
          plannedHours:
            p.plannedHours !== undefined && p.plannedHours !== null
              ? p.plannedHours
              : prev.plannedHours,
          hoursPerWeek:
            p.hoursPerWeek !== undefined && p.hoursPerWeek !== null
              ? p.hoursPerWeek
              : prev.hoursPerWeek,
          jobDescription:
            p.jobDescription !== undefined && p.jobDescription !== null
              ? p.jobDescription
              : prev.jobDescription,
          learningGoals: Array.isArray(p.learningGoals)
            ? p.learningGoals
            : prev.learningGoals,
          assessment:
            p.assessment !== undefined && p.assessment !== null
              ? p.assessment
              : prev.assessment,
          status: p.status || prev.status,
          submittedAt: p.submittedAt ? p.submittedAt.split("T")[0] : prev.submittedAt,
          approvedAt: p.approvedAt ? p.approvedAt.split("T")[0] : prev.approvedAt,
          teacherFeedback:
            p.teacherFeedback !== undefined && p.teacherFeedback !== null
              ? p.teacherFeedback
              : prev.teacherFeedback,
        }));
      })
      .catch((err) => {
        console.error("Failed to load plan from backend:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleAutoSave = useCallback(
    async (p: PlanState, isBackground = false) => {
      if (!isAuthenticated || p.status !== "draft") return;

      await apiFetch("/plans/my-plan", {
        method: "PATCH",
        body: JSON.stringify({
          company: p.company,
          jobTitle: p.jobTitle,
          supervisorName: p.supervisorName,
          supervisorContact: p.supervisorContact,
          startDate: p.startDate,
          endDate: p.endDate,
          plannedHours: p.plannedHours,
          hoursPerWeek: p.hoursPerWeek,
          jobDescription: p.jobDescription,
          learningGoals: p.learningGoals,
          assessment: p.assessment,
          status: "DRAFT",
        }),
        keepalive: isBackground,
      });
    },
    [isAuthenticated]
  );

  const {
    status: saveStatus,
    lastSavedAt,
    notifyChange,
    flush,
  } = useAutoSave<PlanState>({
    data: plan,
    onSave: handleAutoSave,
    debounceMs: 1500,
    enabled: isAuthenticated && plan.status === "draft",
  });

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
    const isWorkplaceFilled = Boolean(
      plan.company.trim() &&
        plan.jobTitle.trim() &&
        plan.supervisorName.trim() &&
        plan.supervisorContact.trim()
    );
    const isPeriodFilled = Boolean(
      plan.startDate && plan.endDate && String(plan.plannedHours).trim()
    );
    const isWordCountMet = wordCount >= MIN_DESCRIPTION_WORDS;
    const hasEnoughGoals =
      plan.learningGoals.filter((g) => g.text.trim()).length >= MIN_LEARNING_GOALS;
    const canSubmit =
      isWorkplaceFilled && isPeriodFilled && isWordCountMet && hasEnoughGoals;

    return {
      isWorkplaceFilled,
      isPeriodFilled,
      isWordCountMet,
      hasEnoughGoals,
      canSubmit,
    };
  }, [
    plan.company,
    plan.jobTitle,
    plan.supervisorName,
    plan.supervisorContact,
    plan.startDate,
    plan.endDate,
    plan.plannedHours,
    plan.learningGoals,
    wordCount,
  ]);

  const submitPlan = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!checklist.canSubmit) {
      return {
        success: false,
        message: `Please fill in the workplace and period details, describe the job in at least ${MIN_DESCRIPTION_WORDS} words, and add at least ${MIN_LEARNING_GOALS} learning goals.`,
      };
    }
    const now = new Date();
    const formattedDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const time = formatCurrentTime();

    if (isAuthenticated) {
      try {
        await apiFetch("/plans/my-plan", {
          method: "PATCH",
          body: JSON.stringify({
            company: plan.company,
            jobTitle: plan.jobTitle,
            supervisorName: plan.supervisorName,
            supervisorContact: plan.supervisorContact,
            startDate: plan.startDate,
            endDate: plan.endDate,
            plannedHours: plan.plannedHours,
            hoursPerWeek: plan.hoursPerWeek,
            jobDescription: plan.jobDescription,
            learningGoals: plan.learningGoals,
            assessment: plan.assessment,
            status: "SUBMITTED",
          }),
        });
      } catch (err) {
        console.error("Failed to submit plan to backend:", err);
      }
    }

    setPlan((prev) => ({
      ...prev,
      status: "submitted",
      submittedAt: formattedDate,
      lastSavedAt: time,
    }));
    return { success: true };
  }, [checklist.canSubmit, isAuthenticated, plan]);

  const resetPlan = useCallback(() => {
    setPlan(DEFAULT_PLAN);
  }, []);

  const value = useMemo(
    () => ({
      plan,
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
