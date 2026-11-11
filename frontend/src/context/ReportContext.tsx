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
import { formatDate } from "@/lib/dates";
import {
  useAutoSave,
  formatCurrentTime,
  type SaveStatus,
} from "@/hooks/useAutoSave";

export interface Attachment {
  id: string;
  name: string;
  status: "Uploaded" | "Uploading";
  size?: string;
}

export interface ReportState {
  id: string;
  title: string;
  company: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  totalHours: number | string;
  tasksAndLearning: string;
  attachments: Attachment[];
  supervisorFeedbackRequested: boolean;
  status: "draft" | "submitted" | "approved";
  lastSavedAt: string;
  submittedAt: string | null;
  approvedAt?: string | null;
  createdAt: string;
  teacherFeedback?: string;
}

export interface ReportStoreState {
  activeReportId: string;
  reports: ReportState[];
}

const DEFAULT_REPORTS: ReportState[] = [
  {
    id: "report-final",
    title: "Final internship report",
    company: "Nordic Pixel Oy",
    startDate: "2026-06-01",
    endDate: "2026-11-30",
    totalHours: 800,
    tasksAndLearning:
      "I built UI components for the customer portal in React and took part in weekly sprint reviews. The biggest thing I learned was how to collaborate effectively with senior developers and navigate a large existing codebase. I also gained practical experience with TypeScript, automated testing, and designing accessible component libraries following strict design tokens. Working directly on user-facing features taught me to prioritize performance and clean code architecture. Looking forward to applying these skills in upcoming projects and continuing to deepen my practical knowledge.",
    attachments: [
      {
        id: "att-1",
        name: "Tyotodistus_NordicPixel.pdf",
        status: "Uploaded",
        size: "840 KB",
      },
    ],
    supervisorFeedbackRequested: false,
    status: "draft",
    lastSavedAt: "14:32",
    submittedAt: null,
    createdAt: "1.10.2026",
  },
  {
    id: "report-midterm",
    title: "Mid-term progress report",
    company: "Nordic Pixel Oy",
    startDate: "2026-06-01",
    endDate: "2026-08-15",
    totalHours: 400,
    tasksAndLearning:
      "During the first half of my practical training at Nordic Pixel Oy, I focused on frontend bug fixes, design system components, and unit tests. I participated in daily standups and sprint planning. My supervisor Laura Nieminen conducted the mid-term review with positive feedback on code quality and initiative.",
    attachments: [
      {
        id: "att-mid",
        name: "Valiarviointi_allekirjoitettu.pdf",
        status: "Uploaded",
        size: "620 KB",
      },
    ],
    supervisorFeedbackRequested: true,
    status: "approved",
    lastSavedAt: "15.8.2026",
    submittedAt: "15.8.2026",
    approvedAt: "18.8.2026",
    createdAt: "1.8.2026",
    teacherFeedback:
      "Approved by Mikko Laine: Excellent progress in transitioning to the development team. The learning reflections align well with the degree program goals.",
  },
];

const DEFAULT_STORE: ReportStoreState = {
  activeReportId: "report-final",
  reports: DEFAULT_REPORTS,
};

const STORAGE_KEY = "harkkalogi_report_store_v4";

let currentStore: ReportStoreState = DEFAULT_STORE;
let isLoadedFromStorage = false;
let listeners: Array<() => void> = [];

function loadFromStorage(): ReportStoreState {
  if (isLoadedFromStorage) return currentStore;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reports && Array.isArray(parsed.reports)) {
          currentStore = {
            ...parsed,
            reports: parsed.reports.map((r: any) => {
              let text = r.tasksAndLearning;
              if (
                typeof text === "string" &&
                text.trim().startsWith('{"tasksAndLearning"')
              ) {
                try {
                  const unwrap = JSON.parse(text);
                  text = unwrap.tasksAndLearning ?? "";
                } catch {
                  // ignore
                }
              }
              return { ...r, tasksAndLearning: text };
            }),
          };
        }
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
  return DEFAULT_STORE;
}

function mapBackendReport(r: any): ReportState {
  const isApproved = r.status === "REVIEWED" || r.status === "APPROVED";
  const isSubmitted = r.status === "SUBMITTED";
  const status: "draft" | "submitted" | "approved" = isApproved
    ? "approved"
    : isSubmitted
      ? "submitted"
      : "draft";

  const submittedAt = r.submittedAt ? formatDate(r.submittedAt) : null;
  const reviewApproved = r.reviews?.find((rev: any) => rev.decision === "APPROVED");
  const approvedAt = reviewApproved ? formatDate(reviewApproved.createdAt) : null;
  const teacherFeedback = r.reviews?.[0]?.comment || "";

  let tasks = r.tasksAndLearning;
  if (tasks === undefined) {
    if (typeof r.content === "string") {
      try {
        const parsed = JSON.parse(r.content);
        tasks = parsed?.tasksAndLearning ?? "";
      } catch {
        tasks = r.content;
      }
    } else {
      tasks = "";
    }
  }

  if (
    typeof tasks === "string" &&
    tasks.trim().startsWith('{"tasksAndLearning"')
  ) {
    try {
      const unwrap = JSON.parse(tasks);
      tasks = unwrap.tasksAndLearning ?? "";
    } catch {
      // ignore
    }
  }

  return {
    id: String(r.id),
    title: r.title || "Report",
    company: r.company || r.internship?.company || "Nordic Pixel Oy",
    startDate: r.startDate || (r.internship?.startDate ? r.internship.startDate.split("T")[0] : "2026-06-01"),
    endDate: r.endDate || (r.internship?.endDate ? r.internship.endDate.split("T")[0] : "2026-11-30"),
    totalHours: r.totalHours !== undefined ? r.totalHours : 800,
    tasksAndLearning: tasks || "",
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    supervisorFeedbackRequested: Boolean(r.supervisorFeedbackRequested),
    status,
    lastSavedAt: formatCurrentTime(),
    submittedAt,
    approvedAt,
    createdAt: r.createdAt ? formatDate(r.createdAt) : "",
    teacherFeedback,
  };
}

export interface ReportContextType {
  reports: ReportState[];
  activeReportId: string;
  report: ReportState;
  setActiveReportId: (id: string) => void;
  getReport: (id: string) => ReportState | undefined;
  createReport: (title?: string) => Promise<string>;
  deleteReport: (id: string) => Promise<void>;
  updateField: <K extends keyof ReportState>(field: K, value: ReportState[K]) => void;
  addAttachment: (name: string, size?: string) => void;
  removeAttachment: (id: string) => void;
  toggleSupervisorFeedback: () => void;
  saveDraft: () => Promise<void>;
  submitReport: () => Promise<{ success: boolean; message?: string }>;
  resetReport: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  wordCount: number;
  checklist: {
    isWorkplaceFilled: boolean;
    hasWorkCertificate: boolean;
    isWordCountMet: boolean;
    isSupervisorFeedbackRequested: boolean;
    canSubmit: boolean;
  };
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { isAuthenticated, user } = useAuth();

  const activeReport = useMemo(() => {
    return (
      store.reports.find((r) => r.id === store.activeReportId) ||
      store.reports[0] ||
      DEFAULT_REPORTS[0]
    );
  }, [store.reports, store.activeReportId]);

  // Load reports from backend API when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchReports = async () => {
      try {
        const query = user?.role === "student" ? `?studentId=${user.id}` : "";
        const data = await apiFetch<{ reports: any[] }>(`/reports${query}`);
        if (!isMounted || !Array.isArray(data.reports) || data.reports.length === 0) {
          return;
        }

        const backendReports = data.reports.map(mapBackendReport);

        setStore((prev) => {
          // Keep any local-only drafts that haven't synced, and combine with backend
          const localOnly = prev.reports.filter(
            (lr) => isNaN(Number(lr.id)) && !backendReports.some((br) => br.title === lr.title)
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
  }, [isAuthenticated, user?.id, user?.role]);

  // Auto-Save handler
  const handleAutoSave = useCallback(
    async (rep: ReportState, isBackground = false) => {
      if (!isAuthenticated || rep.status !== "draft") return;

      const isNumericId = /^\d+$/.test(rep.id);
      let tasks = rep.tasksAndLearning;
      if (
        typeof tasks === "string" &&
        tasks.trim().startsWith('{"tasksAndLearning"')
      ) {
        try {
          const unwrap = JSON.parse(tasks);
          tasks = unwrap.tasksAndLearning ?? "";
        } catch {
          // ignore
        }
      }

      const payload = {
        title: rep.title,
        company: rep.company,
        startDate: rep.startDate,
        endDate: rep.endDate,
        totalHours: rep.totalHours,
        tasksAndLearning: tasks,
        attachments: rep.attachments,
        supervisorFeedbackRequested: rep.supervisorFeedbackRequested,
        status: "DRAFT" as const,
      };

      if (isNumericId) {
        await apiFetch(`/reports/${rep.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          keepalive: isBackground,
        });
      } else {
        // Creating remote report for newly added draft
        const res = await apiFetch<{ report: any }>("/reports", {
          method: "POST",
          body: JSON.stringify(payload),
          keepalive: isBackground,
        });
        if (res.report && res.report.id) {
          const newId = String(res.report.id);
          setStore((prev) => ({
            activeReportId: prev.activeReportId === rep.id ? newId : prev.activeReportId,
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
        }
      }
    },
    [isAuthenticated]
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

  const setActiveReportId = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      activeReportId: id,
    }));
  }, []);

  const getReport = useCallback(
    (id: string) => {
      return store.reports.find((r) => r.id === id);
    },
    [store.reports]
  );

  const createReport = useCallback(
    async (title?: string): Promise<string> => {
      const now = new Date();
      const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
      const defaultTitle = title?.trim() || "New report";

      if (isAuthenticated) {
        try {
          const res = await apiFetch<{ report: any }>("/reports", {
            method: "POST",
            body: JSON.stringify({
              title: defaultTitle,
              company: "Nordic Pixel Oy",
              startDate: "2026-06-01",
              endDate: "2026-11-30",
              totalHours: 800,
              tasksAndLearning: "",
              attachments: [],
              supervisorFeedbackRequested: false,
              status: "DRAFT",
            }),
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
      const newId = `report-${Date.now()}`;
      const newReport: ReportState = {
        id: newId,
        title: defaultTitle,
        company: "Nordic Pixel Oy",
        startDate: "2026-06-01",
        endDate: "2026-11-30",
        totalHours: 800,
        tasksAndLearning: "",
        attachments: [],
        supervisorFeedbackRequested: false,
        status: "draft",
        lastSavedAt: formatCurrentTime(),
        submittedAt: null,
        createdAt: dateStr,
      };

      setStore((prev) => ({
        reports: [newReport, ...prev.reports],
        activeReportId: newId,
      }));

      return newId;
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
        const nextActive =
          prev.activeReportId === id
            ? remaining[0]?.id || "report-final"
            : prev.activeReportId;
        return {
          reports: remaining,
          activeReportId: nextActive,
        };
      });
    },
    [isAuthenticated]
  );

  const updateField = useCallback(
    <K extends keyof ReportState>(field: K, value: ReportState[K]) => {
      setStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === prev.activeReportId ? { ...r, [field]: value } : r
        ),
      }));
      notifyChange();
    },
    [notifyChange]
  );

  const addAttachment = useCallback(
    (name: string, size?: string) => {
      const newAttachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        status: "Uploaded",
        size,
      };
      setStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === prev.activeReportId
            ? { ...r, attachments: [...r.attachments, newAttachment] }
            : r
        ),
      }));
      notifyChange();
    },
    [notifyChange]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      setStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === prev.activeReportId
            ? {
                ...r,
                attachments: r.attachments.filter((item) => item.id !== id),
              }
            : r
        ),
      }));
      notifyChange();
    },
    [notifyChange]
  );

  const toggleSupervisorFeedback = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === prev.activeReportId
          ? {
              ...r,
              supervisorFeedbackRequested: !r.supervisorFeedbackRequested,
            }
          : r
      ),
    }));
    notifyChange();
  }, [notifyChange]);

  const saveDraft = useCallback(async () => {
    const time = formatCurrentTime();
    setStore((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === prev.activeReportId ? { ...r, lastSavedAt: time } : r
      ),
    }));
    await flush();
  }, [flush]);

  const wordCount = useMemo(() => {
    const trimmed = activeReport.tasksAndLearning.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [activeReport.tasksAndLearning]);

  const checklist = useMemo(() => {
    const isWorkplaceFilled = Boolean(
      activeReport.company.trim() &&
        activeReport.startDate &&
        activeReport.endDate &&
        String(activeReport.totalHours).trim()
    );
    const hasWorkCertificate = activeReport.attachments.length > 0;
    const isWordCountMet = wordCount >= 300;
    const isSupervisorFeedbackRequested = activeReport.supervisorFeedbackRequested;
    const canSubmit = isWorkplaceFilled && hasWorkCertificate && isWordCountMet;

    return {
      isWorkplaceFilled,
      hasWorkCertificate,
      isWordCountMet,
      isSupervisorFeedbackRequested,
      canSubmit,
    };
  }, [
    activeReport.company,
    activeReport.startDate,
    activeReport.endDate,
    activeReport.totalHours,
    activeReport.attachments.length,
    wordCount,
    activeReport.supervisorFeedbackRequested,
  ]);

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
      const isNumericId = /^\d+$/.test(activeReport.id);
      let tasks = activeReport.tasksAndLearning;
      if (
        typeof tasks === "string" &&
        tasks.trim().startsWith('{"tasksAndLearning"')
      ) {
        try {
          const unwrap = JSON.parse(tasks);
          tasks = unwrap.tasksAndLearning ?? "";
        } catch {
          // ignore
        }
      }

      const payload = {
        title: activeReport.title,
        company: activeReport.company,
        startDate: activeReport.startDate,
        endDate: activeReport.endDate,
        totalHours: activeReport.totalHours,
        tasksAndLearning: tasks,
        attachments: activeReport.attachments,
        supervisorFeedbackRequested: activeReport.supervisorFeedbackRequested,
        status: "SUBMITTED" as const,
      };

      try {
        if (isNumericId) {
          await apiFetch(`/reports/${activeReport.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          const res = await apiFetch<{ report: any }>("/reports", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (res.report?.id) {
            const newId = String(res.report.id);
            setStore((prev) => ({
              activeReportId: newId,
              reports: prev.reports.map((r) =>
                r.id === activeReport.id
                  ? {
                      ...r,
                      id: newId,
                      status: "submitted",
                      submittedAt: formattedDate,
                      lastSavedAt: time,
                    }
                  : r
              ),
            }));
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              if (url.searchParams.get("id") === activeReport.id) {
                url.searchParams.set("id", newId);
                window.history.replaceState({}, "", url.toString());
              }
            }
            return { success: true };
          }
        }
      } catch (err) {
        console.error("Failed to submit report to backend:", err);
      }
    }

    setStore((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === prev.activeReportId
          ? {
              ...r,
              status: "submitted",
              submittedAt: formattedDate,
              lastSavedAt: time,
            }
          : r
      ),
    }));
    return { success: true };
  }, [checklist.canSubmit, isAuthenticated, activeReport]);

  const resetReport = useCallback(() => {
    setStore(DEFAULT_STORE);
  }, []);

  const value = useMemo(
    () => ({
      reports: store.reports,
      activeReportId: store.activeReportId,
      report: activeReport,
      setActiveReportId,
      getReport,
      createReport,
      deleteReport,
      updateField,
      addAttachment,
      removeAttachment,
      toggleSupervisorFeedback,
      saveDraft,
      submitReport,
      resetReport,
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
      getReport,
      createReport,
      deleteReport,
      updateField,
      addAttachment,
      removeAttachment,
      toggleSupervisorFeedback,
      saveDraft,
      submitReport,
      resetReport,
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
