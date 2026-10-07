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
  company: string;
  period: string;
  totalHours: number | string;
  tasksAndLearning: string;
  attachments: Attachment[];
  supervisorFeedbackRequested: boolean;
  status: "draft" | "submitted";
  lastSavedAt: string;
  submittedAt: string | null;
}

const DEFAULT_REPORT_STATE: ReportState = {
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
    },
  ],
  supervisorFeedbackRequested: false,
  status: "draft",
  lastSavedAt: "14:32",
  submittedAt: null,
};

const STORAGE_KEY = "harkkalogi_report_state_v1";

let currentReportState: ReportState = DEFAULT_REPORT_STATE;
let isLoadedFromStorage = false;
let listeners: Array<() => void> = [];

function loadFromStorage(): ReportState {
  if (isLoadedFromStorage) return currentReportState;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentReportState = {
          ...DEFAULT_REPORT_STATE,
          ...JSON.parse(stored),
        };
      }
    } catch {
      // Ignore
    }
    isLoadedFromStorage = true;
  }
  return currentReportState;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setReportState(next: ReportState | ((prev: ReportState) => ReportState)) {
  const resolved = typeof next === "function" ? next(currentReportState) : next;
  currentReportState = resolved;
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
        currentReportState = {
          ...DEFAULT_REPORT_STATE,
          ...JSON.parse(event.newValue),
        };
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

function getSnapshot(): ReportState {
  return loadFromStorage();
}

function getServerSnapshot(): ReportState {
  return DEFAULT_REPORT_STATE;
}

export interface ReportContextType {
  report: ReportState;
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
  const report = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateField = useCallback(
    <K extends keyof ReportState>(field: K, value: ReportState[K]) => {
      setReportState((prev) => ({
        ...prev,
        [field]: value,
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
    setReportState((prev) => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment],
    }));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setReportState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((item) => item.id !== id),
    }));
  }, []);

  const toggleSupervisorFeedback = useCallback(() => {
    setReportState((prev) => ({
      ...prev,
      supervisorFeedbackRequested: !prev.supervisorFeedbackRequested,
    }));
  }, []);

  const saveDraft = useCallback(() => {
    const time = formatCurrentTime();
    setReportState((prev) => ({
      ...prev,
      lastSavedAt: time,
    }));
  }, []);

  const wordCount = useMemo(() => {
    const trimmed = report.tasksAndLearning.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [report.tasksAndLearning]);

  const checklist = useMemo(() => {
    const isWorkplaceFilled = Boolean(
      report.company.trim() &&
        report.period.trim() &&
        String(report.totalHours).trim()
    );
    const hasWorkCertificate = report.attachments.length > 0;
    const isWordCountMet = wordCount >= 300;
    const isSupervisorFeedbackRequested = report.supervisorFeedbackRequested;
    const canSubmit = isWorkplaceFilled && hasWorkCertificate && isWordCountMet;

    return {
      isWorkplaceFilled,
      hasWorkCertificate,
      isWordCountMet,
      isSupervisorFeedbackRequested,
      canSubmit,
    };
  }, [
    report.company,
    report.period,
    report.totalHours,
    report.attachments.length,
    wordCount,
    report.supervisorFeedbackRequested,
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

    setReportState((prev) => ({
      ...prev,
      status: "submitted",
      submittedAt: formattedDate,
      lastSavedAt: time,
    }));
    return { success: true };
  }, [checklist.canSubmit]);

  const resetReport = useCallback(() => {
    setReportState(DEFAULT_REPORT_STATE);
  }, []);

  const value = useMemo(
    () => ({
      report,
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
      report,
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
