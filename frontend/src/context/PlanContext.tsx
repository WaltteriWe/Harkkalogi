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
import { useInternship } from "./InternshipContext";
import {
  useAutoSave,
  formatCurrentTime,
  type SaveStatus,
} from "@/hooks/useAutoSave";
import { registerDraftFlusher } from "@/lib/draft-registry";

export interface LearningGoal {
  id: string;
  text: string;
}

export interface PlanState {
  scope: "h1" | "h2" | "combined";
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

export const EMPTY_PLAN: PlanState = {
  scope: "h1",
  company: "",
  jobTitle: "",
  supervisorName: "",
  supervisorContact: "",
  startDate: "",
  endDate: "",
  plannedHours: 400,
  hoursPerWeek: "",
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

const STORAGE_KEY = "harkkalogi_plan_store_v1";
let currentInternshipId = "internship-1";

function getStorageKey(internshipId?: string): string {
  const activeId = internshipId || currentInternshipId || "internship-1";
  if (typeof window !== "undefined") {
    try {
      const authUser = window.localStorage.getItem("harkkalogi_auth_user");
      if (authUser) {
        const parsed = JSON.parse(authUser);
        if (parsed?.email) {
          return `harkkalogi_plan_${parsed.email.replace(/[^a-zA-Z0-9_-]/g, "_")}_${activeId}`;
        }
      }
    } catch {
      // Ignore
    }
  }
  return `${STORAGE_KEY}_${activeId}`;
}

let currentPlan: PlanState = EMPTY_PLAN;
let isLoadedFromStorage = false;
let listeners: Array<() => void> = [];

function loadFromStorage(internshipId?: string): PlanState {
  if (isLoadedFromStorage) return currentPlan;
  if (typeof window !== "undefined") {
    try {
      const key = getStorageKey(internshipId);
      let stored = window.sessionStorage.getItem(key);
      // Migration fallback from localStorage if present
      if (!stored && window.localStorage) {
        stored = window.localStorage.getItem(key);
        if (stored) {
          window.sessionStorage.setItem(key, stored);
          window.localStorage.removeItem(key);
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.learningGoals)) {
          currentPlan = { ...EMPTY_PLAN, ...parsed };
        } else {
          currentPlan = EMPTY_PLAN;
        }
      } else {
        currentPlan = EMPTY_PLAN;
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
      const key = getStorageKey();
      window.sessionStorage.setItem(key, JSON.stringify(resolved));
    } catch {
      // Ignore
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const handleStorageEvent = (event: StorageEvent) => {
    const key = getStorageKey();
    if (event.key === key && event.newValue) {
      try {
        currentPlan = { ...EMPTY_PLAN, ...JSON.parse(event.newValue) };
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
  return EMPTY_PLAN;
}

export function toPlanPayload(p: PlanState, status: "DRAFT" | "SUBMITTED") {
  return {
    scope: p.scope,
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
  const {
    activeInternshipId,
    activeInternship,
    setScope: setInternshipScope,
    refreshInternships,
  } = useInternship();

  // Keep module-level currentInternshipId in sync
  currentInternshipId = activeInternshipId || "internship-1";

  // Sync plan whenever activeInternshipId, activeInternship or auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      currentPlan = EMPTY_PLAN;
      isLoadedFromStorage = false;
      setPlan(EMPTY_PLAN);
      return;
    }

    currentInternshipId = activeInternshipId || "internship-1";
    isLoadedFromStorage = false;

    // 1. Check session storage for this specific internship
    const storageKey = getStorageKey(activeInternshipId);
    let localDraft: PlanState | null = null;
    if (typeof window !== "undefined") {
      try {
        let stored = window.sessionStorage.getItem(storageKey);
        if (!stored && window.localStorage) {
          stored = window.localStorage.getItem(storageKey);
          if (stored) {
            window.sessionStorage.setItem(storageKey, stored);
            window.localStorage.removeItem(storageKey);
          }
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.learningGoals)) {
            localDraft = { ...EMPTY_PLAN, ...parsed };
          }
        }
      } catch {
        // Ignore
      }
    }

    const ip = activeInternship?.plan;

    // If local draft has unsaved work and official plan is draft, prioritize local work
    if (localDraft && (!ip || ip.status === "draft")) {
      setPlan(localDraft);
      return;
    }

    // If active internship has plan data (e.g. from backend or Eetu synthesis)
    if (ip) {
      setPlan({
        scope: activeInternship.scope || "h1",
        company: ip.company || activeInternship.company || "",
        jobTitle: ip.jobTitle || "",
        supervisorName: ip.supervisorName || activeInternship.supervisorName || "",
        supervisorContact: ip.supervisorContact || "",
        startDate: ip.startDate || activeInternship.startDate || "",
        endDate: ip.endDate || activeInternship.endDate || "",
        plannedHours: ip.plannedHours || activeInternship.targetHours || 400,
        hoursPerWeek: ip.hoursPerWeek || 37.5,
        jobDescription: ip.jobDescription || "",
        learningGoals: Array.isArray(ip.learningGoals) ? ip.learningGoals : [],
        assessment: ip.assessment || "",
        status: ip.status || "draft",
        lastSavedAt: "",
        submittedAt: ip.submittedAt || null,
        approvedAt: ip.approvedAt || null,
        teacherFeedback: ip.teacherFeedback || "",
      });
      return;
    }

    // Otherwise, clean template for this internship
    setPlan({
      ...EMPTY_PLAN,
      scope: activeInternship?.scope || "h1",
      company: activeInternship?.company || "",
      plannedHours: activeInternship?.targetHours || 400,
      startDate: activeInternship?.startDate || "",
      endDate: activeInternship?.endDate || "",
      supervisorName: activeInternship?.supervisorName || "",
    });
  }, [isAuthenticated, activeInternshipId, activeInternship]);

  const handleAutoSave = useCallback(
    async (p: PlanState, isBackground = false) => {
      if (!isAuthenticated || p.status !== "draft") return;

      const bid = activeInternship?.backendId;
      const url = bid ? `/plans/my-plan?internshipId=${bid}` : "/plans/my-plan";
      await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify({
          ...toPlanPayload(p, "DRAFT"),
          internshipId: bid,
        }),
        keepalive: isBackground,
      });
    },
    [isAuthenticated, activeInternship]
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

  // Register flusher for pre-logout draft sync
  useEffect(() => {
    if (!isAuthenticated) return;
    return registerDraftFlusher(async (): Promise<boolean> => {
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
        const bid = activeInternship?.backendId;
        const url = bid ? `/plans/my-plan?internshipId=${bid}` : "/plans/my-plan";
        await apiFetch(url, {
          method: "PATCH",
          body: JSON.stringify({
            ...toPlanPayload(plan, "SUBMITTED"),
            internshipId: bid,
          }),
        });
        await refreshInternships();
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
    if (typeof window !== "undefined") {
      const key = getStorageKey();
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
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
