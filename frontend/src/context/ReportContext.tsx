"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

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
  period: string;
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
    period: "1.6.2026 – 30.11.2026",
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
    period: "1.6.2026 – 15.8.2026",
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
  {
    id: "report-orientation",
    title: "Orientation & plan report",
    company: "Nordic Pixel Oy",
    period: "1.6.2026 – 30.6.2026",
    totalHours: 160,
    tasksAndLearning:
      "First month orientation report. Completed onboarding, repository setup, access permissions, and initial introduction to Metropolia internship goals with company mentor.",
    attachments: [],
    supervisorFeedbackRequested: true,
    status: "approved",
    lastSavedAt: "30.6.2026",
    submittedAt: "30.6.2026",
    approvedAt: "2.7.2026",
    createdAt: "1.6.2026",
    teacherFeedback:
      "Approved by Mikko Laine: Orientation objectives and initial tasks fulfilled.",
  },
];

const DEFAULT_STORE: ReportStoreState = {
  activeReportId: "report-final",
  reports: DEFAULT_REPORTS,
};

const STORAGE_KEY = "harkkalogi_report_store_v2";

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
          currentStore = parsed;
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

export interface ReportContextType {
  reports: ReportState[];
  activeReportId: string;
  report: ReportState;
  setActiveReportId: (id: string) => void;
  getReport: (id: string) => ReportState | undefined;
  createReport: (title?: string) => string;
  deleteReport: (id: string) => void;
  updateField: <K extends keyof ReportState>(field: K, value: ReportState[K]) => void;
  addAttachment: (name: string, size?: string) => void;
  removeAttachment: (id: string) => void;
  toggleSupervisorFeedback: () => void;
  saveDraft: () => void;
  submitReport: () => { success: boolean; message?: string };
  resetReport: () => void;
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

function formatCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ReportProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const activeReport = useMemo(() => {
    return (
      store.reports.find((r) => r.id === store.activeReportId) ||
      store.reports[0] ||
      DEFAULT_REPORTS[0]
    );
  }, [store.reports, store.activeReportId]);

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

  const createReport = useCallback((title?: string): string => {
    const now = new Date();
    const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const newId = `report-${Date.now()}`;
    const newReport: ReportState = {
      id: newId,
      title: title?.trim() || "New report",
      company: "Nordic Pixel Oy",
      period: "1.6.2026 – 30.11.2026",
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
  }, []);

  const deleteReport = useCallback((id: string) => {
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
  }, []);

  const updateField = useCallback(
    <K extends keyof ReportState>(field: K, value: ReportState[K]) => {
      setStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === prev.activeReportId ? { ...r, [field]: value } : r
        ),
      }));
    },
    []
  );

  const addAttachment = useCallback((name: string, size?: string) => {
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
  }, []);

  const removeAttachment = useCallback((id: string) => {
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
  }, []);

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
  }, []);

  const saveDraft = useCallback(() => {
    const time = formatCurrentTime();
    setStore((prev) => ({
      ...prev,
      reports: prev.reports.map((r) =>
        r.id === prev.activeReportId
          ? {
              ...r,
              lastSavedAt: time,
            }
          : r
      ),
    }));
  }, []);

  const wordCount = useMemo(() => {
    const trimmed = activeReport.tasksAndLearning.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [activeReport.tasksAndLearning]);

  const checklist = useMemo(() => {
    const isWorkplaceFilled = Boolean(
      activeReport.company.trim() &&
        activeReport.period.trim() &&
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
    activeReport.period,
    activeReport.totalHours,
    activeReport.attachments.length,
    wordCount,
    activeReport.supervisorFeedbackRequested,
  ]);

  const submitReport = useCallback((): { success: boolean; message?: string } => {
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
  }, [checklist.canSubmit]);

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
