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
import { registerDraftFlusher } from "@/lib/draft-registry";
import {
  type Attachment,
  type ReportState,
  type ReportStoreState,
  type ReportChecklist,
  type RawBackendReport,
  createReportState,
  createAttachment,
  sanitizeTasksAndLearning,
  toReportPayload,
  mapBackendReport,
  calculateReportWordCount,
  calculateReportChecklist,
  EMPTY_REPORT,
  EMPTY_STORE,
} from "@/lib/report-helpers";

const STORAGE_KEY = "harkkalogi_report_store_v4";

function getReportStorageKey(): string {
  if (typeof window !== "undefined") {
    try {
      const authUser = window.localStorage.getItem("harkkalogi_auth_user");
      if (authUser) {
        const parsed = JSON.parse(authUser);
        if (parsed?.email) {
          return `harkkalogi_reports_${parsed.email.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        }
      }
    } catch {
      // Ignore
    }
  }
  return STORAGE_KEY;
}

let currentStore: ReportStoreState = EMPTY_STORE;
let isLoadedFromStorage = false;
let listeners: Array<() => void> = [];

function loadFromStorage(): ReportStoreState {
  if (isLoadedFromStorage) return currentStore;
  if (typeof window !== "undefined") {
    try {
      const key = getReportStorageKey();
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reports && Array.isArray(parsed.reports) && parsed.reports.length > 0) {
          currentStore = {
            ...parsed,
            reports: parsed.reports.map((r: Partial<ReportState>) => ({
              ...r,
              tasksAndLearning: sanitizeTasksAndLearning(r.tasksAndLearning),
            })),
          };
        } else {
          currentStore = EMPTY_STORE;
        }
      } else {
        currentStore = EMPTY_STORE;
      }
    } catch {
      // Ignore
    }
    isLoadedFromStorage = true;
  }
  return currentStore;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setStore(
  next: ReportStoreState | ((prev: ReportStoreState) => ReportStoreState)
) {
  const resolved = typeof next === "function" ? next(currentStore) : next;
  currentStore = resolved;
  if (typeof window !== "undefined") {
    try {
      const key = getReportStorageKey();
      window.localStorage.setItem(key, JSON.stringify(resolved));
    } catch {
      // Ignore
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const handleStorageEvent = (event: StorageEvent) => {
    const key = getReportStorageKey();
    if (event.key === key && event.newValue) {
      try {
        currentStore = JSON.parse(event.newValue);
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

function getSnapshot(): ReportStoreState {
  return loadFromStorage();
}

function getServerSnapshot(): ReportStoreState {
  return EMPTY_STORE;
}

export interface ReportContextType {
  reports: ReportState[];
  activeReportId: string;
  report: ReportState;
  setActiveReportId: (id: string) => void;
  createReport: (title?: string, initialHours?: number | string) => Promise<string>;
  deleteReport: (id: string) => Promise<void>;
  updateReport: (patch: Partial<ReportState>) => void;
  updateField: <K extends keyof ReportState>(field: K, value: ReportState[K]) => void;
  addAttachment: (name: string, size?: string) => void;
  removeAttachment: (id: string) => void;
  toggleSupervisorFeedback: () => void;
  saveDraft: () => Promise<void>;
  submitReport: () => Promise<{ success: boolean; message?: string }>;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  wordCount: number;
  checklist: ReportChecklist;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { isAuthenticated, user } = useAuth();

  const activeReport = useMemo(() => {
    return (
      store.reports.find((r) => r.id === store.activeReportId) ||
      store.reports[0] ||
      EMPTY_REPORT
    );
  }, [store.reports, store.activeReportId]);

  // Force reload from user-specific storage when user is known, or reset when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      currentStore = EMPTY_STORE;
      isLoadedFromStorage = false;
      setStore(EMPTY_STORE);
      return;
    }
    isLoadedFromStorage = false;
    setStore(loadFromStorage());
  }, [isAuthenticated, user?.email]);

  // Load reports from backend API when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchReports = async () => {
      try {
        const query = user?.role === "student" ? `?studentId=${user.id}` : "";
        const data = await apiFetch<{ reports: RawBackendReport[] }>(`/reports${query}`);
        if (!isMounted || !Array.isArray(data.reports)) {
          return;
        }

        if (data.reports.length === 0) {
          if (user?.role === "student") {
            const freshDraft = createReportState({ id: "report-draft-1", totalHours: 400 });
            setStore({
              reports: [freshDraft],
              activeReportId: freshDraft.id,
            });
          }
          return;
        }

        const backendReports = data.reports.map(mapBackendReport);

        setStore((prev) => {
          const localOnly = prev.reports.filter(
            (lr) =>
              isNaN(Number(lr.id)) &&
              !backendReports.some((br) => br.title === lr.title)
          );
          const merged = [...backendReports, ...localOnly];
          const hasActive = merged.some((r) => r.id === prev.activeReportId);
          return {
            reports: merged,
            activeReportId: hasActive ? prev.activeReportId : merged[0].id,
          };
        });
      } catch (err) {
        console.error("Failed to fetch reports from backend:", err);
      }
    };

    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, user?.role, user?.email]);

  // Central active report updater: encapsulates immutable store mapping and triggers notifyChange
  const updateActiveReport = useCallback(
    (
      patchOrUpdater:
        | Partial<ReportState>
        | ((current: ReportState) => Partial<ReportState>)
    ) => {
      setStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) => {
          if (r.id !== prev.activeReportId) return r;
          const patch =
            typeof patchOrUpdater === "function"
              ? patchOrUpdater(r)
              : patchOrUpdater;
          return { ...r, ...patch };
        }),
      }));
      notifyChange();
    },
    []
  );

  // Unified backend persistence helper for auto-save and submission
  const persistReport = useCallback(
    async (
      rep: ReportState,
      status: "DRAFT" | "SUBMITTED",
      options: { isBackground?: boolean } = {}
    ): Promise<{ success: boolean; id: string; message?: string }> => {
      if (!isAuthenticated) return { success: true, id: rep.id };

      const isNumericId = /^\d+$/.test(rep.id);
      const payload = toReportPayload(rep, status);

      try {
        if (isNumericId) {
          await apiFetch(`/reports/${rep.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
            keepalive: options.isBackground,
          });
          return { success: true, id: rep.id };
        }

        const res = await apiFetch<{ report: RawBackendReport }>("/reports", {
          method: "POST",
          body: JSON.stringify(payload),
          keepalive: options.isBackground,
        });

        if (res.report?.id) {
          const newId = String(res.report.id);
          setStore((prev) => ({
            activeReportId:
              prev.activeReportId === rep.id ? newId : prev.activeReportId,
            reports: prev.reports.map((r) =>
              r.id === rep.id ? { ...r, id: newId } : r
            ),
          }));

          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.get("id") === rep.id) {
              url.searchParams.set("id", newId);
              window.history.replaceState({}, "", url.toString());
            }
          }
          return { success: true, id: newId };
        }
        return {
          success: false,
          id: rep.id,
          message: "No report returned from server",
        };
      } catch (err: unknown) {
        console.error(`Failed to sync report (${status}):`, err);
        const message =
          err instanceof Error ? err.message : "Failed to persist report";
        return {
          success: false,
          id: rep.id,
          message,
        };
      }
    },
    [isAuthenticated]
  );

  // Auto-Save handler
  const handleAutoSave = useCallback(
    async (rep: ReportState, isBackground = false) => {
      if (!isAuthenticated || rep.status !== "draft") return;
      await persistReport(rep, "DRAFT", { isBackground });
    },
    [isAuthenticated, persistReport]
  );

  const {
    status: saveStatus,
    lastSavedAt,
    notifyChange,
    flush,
  } = useAutoSave<ReportState>({
    data: activeReport,
    onSave: handleAutoSave,
    debounceMs: 1500,
    enabled: isAuthenticated && activeReport.status === "draft",
  });

  // Register flusher for pre-logout draft sync
  useEffect(() => {
    if (!isAuthenticated) return;
    return registerDraftFlusher(async (): Promise<boolean> => {
      if (activeReport.status !== "draft" || saveStatus === "saved") {
        return true;
      }
      try {
        await flush();
        return true;
      } catch {
        return false;
      }
    });
  }, [isAuthenticated, activeReport.status, saveStatus, flush]);

  const setActiveReportId = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      activeReportId: id,
    }));
  }, []);

  const createReport = useCallback(
    async (title?: string, initialHours?: number | string): Promise<string> => {
      const now = new Date();
      const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
      const defaultTitle = title?.trim() || "New report";
      const hoursToUse = initialHours !== undefined ? initialHours : 400;

      if (isAuthenticated) {
        try {
          const res = await apiFetch<{ report: RawBackendReport }>("/reports", {
            method: "POST",
            body: JSON.stringify(
              toReportPayload(
                createReportState({ title: defaultTitle, totalHours: hoursToUse }),
                "DRAFT"
              )
            ),
          });
          if (res.report) {
            const mapped = mapBackendReport(res.report);
            setStore((prev) => ({
              reports: [mapped, ...prev.reports],
              activeReportId: mapped.id,
            }));
            return mapped.id;
          }
        } catch (err) {
          console.error("Failed to create report on backend:", err);
        }
      }

      // Local fallback
      const newReport = createReportState({
        title: defaultTitle,
        totalHours: hoursToUse,
        lastSavedAt: formatCurrentTime(),
        createdAt: dateStr,
      });

      setStore((prev) => ({
        reports: [newReport, ...prev.reports],
        activeReportId: newReport.id,
      }));

      return newReport.id;
    },
    [isAuthenticated]
  );

  const deleteReport = useCallback(
    async (id: string) => {
      if (isAuthenticated && /^\d+$/.test(id)) {
        try {
          await apiFetch(`/reports/${id}`, { method: "DELETE" });
        } catch (err) {
          console.error("Failed to delete report on backend:", err);
        }
      }

      setStore((prev) => {
        const remaining = prev.reports.filter((r) => r.id !== id);
        const safeReports = remaining.length > 0 ? remaining : [EMPTY_REPORT];
        const nextActive =
          prev.activeReportId === id
            ? safeReports[0].id
            : prev.activeReportId;
        return {
          reports: safeReports,
          activeReportId: nextActive,
        };
      });
    },
    [isAuthenticated]
  );

  const updateReport = useCallback(
    (patch: Partial<ReportState>) => {
      updateActiveReport(patch);
    },
    [updateActiveReport]
  );

  const updateField = useCallback(
    <K extends keyof ReportState>(field: K, value: ReportState[K]) => {
      updateActiveReport({ [field]: value } as Partial<ReportState>);
    },
    [updateActiveReport]
  );

  const addAttachment = useCallback(
    (name: string, size?: string) => {
      const newAttachment = createAttachment(name, size);
      updateActiveReport((r) => ({
        attachments: [...r.attachments, newAttachment],
      }));
    },
    [updateActiveReport]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      updateActiveReport((r) => ({
        attachments: r.attachments.filter((item) => item.id !== id),
      }));
    },
    [updateActiveReport]
  );

  const toggleSupervisorFeedback = useCallback(() => {
    updateActiveReport((r) => ({
      supervisorFeedbackRequested: !r.supervisorFeedbackRequested,
    }));
  }, [updateActiveReport]);

  const saveDraft = useCallback(async () => {
    updateActiveReport({ lastSavedAt: formatCurrentTime() });
    await flush();
  }, [updateActiveReport, flush]);

  const wordCount = useMemo(
    () => calculateReportWordCount(activeReport.tasksAndLearning),
    [activeReport.tasksAndLearning]
  );

  const checklist = useMemo(
    () => calculateReportChecklist(activeReport, wordCount),
    [activeReport, wordCount]
  );

  const submitReport = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (!checklist.canSubmit) {
      return {
        success: false,
        message:
          "Please ensure workplace details are filled, a certificate is attached, and tasks describe at least 300 words.",
      };
    }
    const now = new Date();
    const formattedDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const time = formatCurrentTime();

    if (isAuthenticated) {
      const res = await persistReport(activeReport, "SUBMITTED");
      if (!res.success) {
        console.warn("Backend submit failed, continuing with local store submission update.");
      }
    }

    updateActiveReport({
      status: "submitted",
      submittedAt: formattedDate,
      lastSavedAt: time,
    });
    return { success: true };
  }, [checklist.canSubmit, isAuthenticated, activeReport, persistReport, updateActiveReport]);

  const value = useMemo(
    () => ({
      reports: store.reports,
      activeReportId: store.activeReportId,
      report: activeReport,
      setActiveReportId,
      createReport,
      deleteReport,
      updateReport,
      updateField,
      addAttachment,
      removeAttachment,
      toggleSupervisorFeedback,
      saveDraft,
      submitReport,
      saveStatus,
      lastSavedAt: lastSavedAt || activeReport.lastSavedAt,
      wordCount,
      checklist,
    }),
    [
      store.reports,
      store.activeReportId,
      activeReport,
      setActiveReportId,
      createReport,
      deleteReport,
      updateReport,
      updateField,
      addAttachment,
      removeAttachment,
      toggleSupervisorFeedback,
      saveDraft,
      submitReport,
      saveStatus,
      lastSavedAt,
      wordCount,
      checklist,
    ]
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextType {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
}
