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
  type Attachment,
  type GoalReflection,
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

export interface ReportContextType {
  reports: ReportState[];
  activeReportId: string;
  report: ReportState;
  setActiveReportId: (id: string) => void;
  createReport: (title?: string, initialHours?: number | string) => Promise<string>;
  deleteReport: (id: string) => Promise<void>;
  updateReport: (patch: Partial<ReportState>) => void;
  updateField: <K extends keyof ReportState>(field: K, value: ReportState[K]) => void;
  updateGoalReflection: (goalId: string, patch: Partial<GoalReflection>) => void;
  addAttachment: (name: string, size?: string) => void;
  removeAttachment: (id: string) => void;
  saveDraft: () => Promise<void>;
  submitReport: () => Promise<{ success: boolean; message?: string }>;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  wordCount: number;
  checklist: ReportChecklist;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export type { ReportState, GoalReflection };

export function ReportProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ReportStoreState>(EMPTY_STORE);
  const { isAuthenticated, user } = useAuth();
  const { activeInternshipId, activeInternship, refreshInternships } = useInternship();

  const currentReportInternshipRef = useRef<{ id: string; backendId?: number }>({
    id: activeInternshipId || "internship-1",
    backendId: activeInternship?.backendId,
  });
  const isDirtyRef = useRef<boolean>(false);
  const flushRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  const activeReport = useMemo(() => {
    return (
      store.reports.find((r) => r.id === store.activeReportId) ||
      store.reports.find((r) => r.status === "approved") ||
      store.reports.find((r) => r.status === "submitted") ||
      store.reports[0] ||
      EMPTY_REPORT
    );
  }, [store.reports, store.activeReportId]);

  // Reset store when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      setStore(EMPTY_STORE);
    }
  }, [isAuthenticated]);

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
          return;
        }

        const backendReports = data.reports.map(mapBackendReport);

        setStore((prev) => {
          const localOnly = prev.reports.filter(
            (lr) =>
              isNaN(Number(lr.id)) &&
              !backendReports.some((br) => br.title === lr.title) &&
              Boolean(lr.generalSummary || lr.tasksAndLearning || lr.company)
          );
          const merged = [...backendReports, ...localOnly];

          const hasRealActive = merged.some((r) => r.id === prev.activeReportId);

          let preferredActiveId = merged[0].id;
          if (hasRealActive) {
            preferredActiveId = prev.activeReportId;
          } else {
            const approvedOrSubmitted = merged.find(
              (r) => r.status === "approved" || r.status === "submitted"
            );
            if (approvedOrSubmitted) {
              preferredActiveId = approvedOrSubmitted.id;
            }
          }

          return {
            reports: merged,
            activeReportId: preferredActiveId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Unified backend persistence helper for auto-save and submission
  const persistReport = useCallback(
    async (
      rep: ReportState,
      status: "DRAFT" | "SUBMITTED",
      options: { isBackground?: boolean; isUnmounting?: boolean } = {}
    ): Promise<{ success: boolean; id: string; message?: string }> => {
      if (!isAuthenticated) return { success: true, id: rep.id };

      const isNumericId = /^\d+$/.test(rep.id);
      const payload = {
        ...toReportPayload(rep, status),
        internshipId: rep.internshipId || currentReportInternshipRef.current.backendId || activeInternship?.backendId,
      };

      try {
        if (isNumericId) {
          await apiFetch(`/reports/${rep.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
            keepalive: options.isBackground || options.isUnmounting,
          });
          return { success: true, id: rep.id };
        }

        const res = await apiFetch<{ report: RawBackendReport }>("/reports", {
          method: "POST",
          body: JSON.stringify(payload),
          keepalive: options.isBackground || options.isUnmounting,
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
    [isAuthenticated, activeInternship]
  );

  // Auto-Save handler
  const handleAutoSave = useCallback(
    async (rep: ReportState, isBackground = false, isUnmounting = false) => {
      if (!isAuthenticated || rep.status !== "draft") return;
      await persistReport(rep, "DRAFT", { isBackground, isUnmounting });
    },
    [isAuthenticated, persistReport]
  );

  const {
    status: saveStatus,
    isDirty,
    lastSavedAt,
    notifyChange,
    flush,
  } = useAutoSave<ReportState>({
    data: activeReport,
    onSave: handleAutoSave,
    debounceMs: 2000,
    enabled: isAuthenticated && activeReport.status === "draft",
  });

  isDirtyRef.current = isDirty;
  flushRef.current = flush;

  // Switch active report whenever activeInternshipId or activeInternship changes
  useEffect(() => {
    if (!isAuthenticated || !activeInternship) return;
    let isCancelled = false;

    const syncReport = async () => {
      const prevInternship = currentReportInternshipRef.current;
      const nextInternshipId = activeInternshipId || "internship-1";

      if (prevInternship.id !== nextInternshipId && isDirtyRef.current) {
        try {
          await flushRef.current();
        } catch (err) {
          console.error("Failed to flush report draft before switching internship:", err);
        }
      }

      if (isCancelled) return;

      currentReportInternshipRef.current = {
        id: nextInternshipId,
        backendId: activeInternship.backendId,
      };

      const rep = activeInternship.report;
      const bid = activeInternship.backendId;
      const actId = activeInternship.id;
      const planGoals = activeInternship.plan?.learningGoals || [];

      setStore((prev) => {
        // 1. Look for report matching this internship in current store
        const matchingIndex = prev.reports.findIndex((r) => {
          if (rep?.id && String(r.id) === String(rep.id)) return true;
          if (bid && r.internshipId === bid) return true;
          if (r.id === `report-draft-${actId}` || r.id === `report-${actId}`) return true;
          if (actId === "internship-1" && (r.title.includes("Harjoittelu 1") || r.company === "Reaktor")) return true;
          if (actId === "internship-2" && (r.title.includes("Harjoittelu 2") || r.company === "Futurice")) return true;
          return false;
        });

        if (matchingIndex >= 0) {
          const matching = prev.reports[matchingIndex];
          // If matching report has no goalReflections yet, seed them from planGoals
          let updatedReport = matching;
          if ((!matching.goalReflections || matching.goalReflections.length === 0) && planGoals.length > 0) {
            updatedReport = {
              ...matching,
              goalReflections: planGoals.map((g) => ({
                goalId: g.id,
                goalText: g.text,
                reflection: "",
                status: "ACHIEVED",
              })),
            };
            const updatedReports = [...prev.reports];
            updatedReports[matchingIndex] = updatedReport;
            return {
              ...prev,
              reports: updatedReports,
              activeReportId: updatedReport.id,
            };
          }

          return {
            ...prev,
            activeReportId: matching.id,
          };
        }

        // 2. If rep info exists on activeInternship, add it to store
        if (rep) {
          const hours = typeof rep.realizedHours === "number"
            ? rep.realizedHours
            : typeof rep.totalHours === "number"
            ? rep.totalHours
            : activeInternship.targetHours;

          const seededGoals =
            rep.goalReflections && rep.goalReflections.length > 0
              ? rep.goalReflections
              : planGoals.map((g) => ({
                  goalId: g.id,
                  goalText: g.text,
                  reflection: "",
                  status: "ACHIEVED" as const,
                }));

          const newReport = createReportState({
            id: rep.id || `report-${actId}`,
            internshipId: bid,
            title: rep.status === "approved" || rep.status === "submitted"
              ? `${activeInternship.title} loppuraportti (${hours} h)`
              : `${activeInternship.title} loppuraportti`,
            company: activeInternship.company,
            status: rep.status,
            realizedHours: hours,
            totalHours: hours,
            generalSummary: rep.generalSummary || rep.tasksAndLearning || "",
            tasksAndLearning: rep.generalSummary || rep.tasksAndLearning || "",
            goalReflections: seededGoals,
            submittedAt: rep.submittedAt || null,
            approvedAt: rep.approvedAt || null,
            attachments: (rep.attachments as any) || [],
            teacherFeedback: rep.teacherFeedback || "",
          });

          return {
            reports: [...prev.reports, newReport],
            activeReportId: newReport.id,
          };
        }

        // 3. Otherwise generate fresh draft template for this internship in memory
        const freshDraft = createReportState({
          id: `report-draft-${actId}`,
          internshipId: bid,
          title: `${activeInternship.title} loppuraportti`,
          company: activeInternship.company,
          realizedHours: activeInternship.targetHours,
          totalHours: activeInternship.targetHours,
          goalReflections: planGoals.map((g) => ({
            goalId: g.id,
            goalText: g.text,
            reflection: "",
            status: "ACHIEVED" as const,
          })),
        });

        return {
          reports: [...prev.reports, freshDraft],
          activeReportId: freshDraft.id,
        };
      });
    };

    syncReport();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeInternshipId, activeInternship]);

  // Register flusher for pre-logout draft sync
  useEffect(() => {
    if (!isAuthenticated) return;
    return registerDraftFlusher("report", async (): Promise<boolean> => {
      if (activeReport.status !== "draft") {
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
      const defaultTitle = title?.trim() || "Harjoitteluraportti ja työtodistus";
      const hoursToUse = initialHours !== undefined ? initialHours : 400;

      if (isAuthenticated) {
        try {
          const res = await apiFetch<{ report: RawBackendReport }>("/reports", {
            method: "POST",
            body: JSON.stringify(
              toReportPayload(
                createReportState({ title: defaultTitle, realizedHours: hoursToUse }),
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
        realizedHours: hoursToUse,
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

  const updateGoalReflection = useCallback(
    (goalId: string, patch: Partial<GoalReflection>) => {
      updateActiveReport((r) => ({
        goalReflections: (r.goalReflections || []).map((g) =>
          g.goalId === goalId ? { ...g, ...patch } : g
        ),
      }));
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

  const saveDraft = useCallback(async () => {
    updateActiveReport({ lastSavedAt: formatCurrentTime() });
    await flush();
  }, [updateActiveReport, flush]);

  const wordCount = useMemo(
    () => calculateReportWordCount(activeReport.generalSummary || activeReport.tasksAndLearning || "", activeReport.goalReflections),
    [activeReport.generalSummary, activeReport.tasksAndLearning, activeReport.goalReflections]
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
          "Varmista, että harjoittelupaikan tiedot ovat kunnossa, työtodistus on liitetty ja pohdinta sisältää vähintään 300 sanaa.",
      };
    }
    const now = new Date();
    const formattedDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const time = formatCurrentTime();

    if (isAuthenticated) {
      const res = await persistReport(activeReport, "SUBMITTED");
      if (!res.success) {
        console.warn("Backend submit failed:", res.message);
        return { success: false, message: res.message || "Raportin lähetys epäonnistui." };
      }
      await refreshInternships();
    }

    updateActiveReport({
      status: "submitted",
      submittedAt: formattedDate,
      lastSavedAt: time,
    });
    return { success: true };
  }, [checklist.canSubmit, isAuthenticated, activeReport, persistReport, refreshInternships, updateActiveReport]);

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
      updateGoalReflection,
      addAttachment,
      removeAttachment,
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
      updateGoalReflection,
      addAttachment,
      removeAttachment,
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
