import { formatDate } from "./dates";
import { formatCurrentTime } from "../hooks/useAutoSave";

export interface Attachment {
  id: string;
  name: string;
  status: "Uploaded" | "Uploading";
  size?: string;
  fileUrl?: string;
  mimeType?: string;
}

export type GoalStatus = "ACHIEVED" | "PARTIALLY_ACHIEVED" | "NOT_ACHIEVED";

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  ACHIEVED: "Saavutettu",
  PARTIALLY_ACHIEVED: "Osittain saavutettu",
  NOT_ACHIEVED: "Ei saavutettu",
};

export interface GoalReflection {
  goalId: string;
  goalText: string;
  reflection: string;
  status: GoalStatus;
}

export interface ReportState {
  id: string;
  internshipId?: number;
  title: string;
  company: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  realizedHours: number | string;
  generalSummary: string;
  goalReflections: GoalReflection[];
  attachments: Attachment[];
  status: "draft" | "submitted" | "approved";
  lastSavedAt: string;
  submittedAt: string | null;
  approvedAt?: string | null;
  createdAt: string;
  teacherFeedback?: string;
  // Backward compatibility alias
  totalHours?: number | string;
  tasksAndLearning?: string;
}

export interface ReportStoreState {
  activeReportId: string;
  reports: ReportState[];
}

export interface ReportChecklist {
  isWorkplaceFilled: boolean;
  hasWorkCertificate: boolean;
  isWordCountMet: boolean;
  canSubmit: boolean;
}

/**
 * Strips accidental JSON string wrapping (e.g. `{"tasksAndLearning": "..."}`)
 * returning clean plain text.
 */
export function sanitizeTasksAndLearning(tasks: unknown): string {
  if (typeof tasks !== "string") return "";
  const trimmed = tasks.trim();
  if (trimmed.startsWith('{"tasksAndLearning"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed.tasksAndLearning === "string"
        ? parsed.tasksAndLearning
        : "";
    } catch {
      // fallback to raw string
    }
  }
  return tasks;
}

/**
 * Factory for creating a full ReportState object with sensible defaults.
 * Defaults realizedHours to 400 (standard for Harjoittelu 1, 15 ECTS).
 */
export function createReportState(overrides: Partial<ReportState> = {}): ReportState {
  const realizedHours = overrides.realizedHours ?? overrides.totalHours ?? 400;
  const generalSummary = overrides.generalSummary ?? overrides.tasksAndLearning ?? "";

  return {
    id: `report-${Date.now()}`,
    title: "Harjoitteluraportti ja työtodistus",
    company: "",
    startDate: "",
    endDate: "",
    realizedHours,
    totalHours: realizedHours,
    generalSummary,
    tasksAndLearning: generalSummary,
    goalReflections: [],
    attachments: [],
    status: "draft",
    lastSavedAt: "",
    submittedAt: null,
    approvedAt: null,
    createdAt: "",
    ...overrides,
  };
}

/**
 * Factory for creating a new attachment item.
 */
export function createAttachment(name: string, size?: string): Attachment {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    status: "Uploaded",
    size,
  };
}

export const EMPTY_REPORT: ReportState = createReportState({
  id: "report-draft-1",
  realizedHours: 400,
});

export const EMPTY_STORE: ReportStoreState = {
  activeReportId: "report-draft-1",
  reports: [EMPTY_REPORT],
};

export const DEFAULT_STORE: ReportStoreState = EMPTY_STORE;
export const DEFAULT_REPORTS: ReportState[] = [EMPTY_REPORT];

/**
 * Converts a ReportState into the REST payload expected by backend APIs.
 */
export function toReportPayload(
  report: ReportState,
  status: "DRAFT" | "SUBMITTED"
) {
  const hours =
    typeof report.realizedHours === "number"
      ? report.realizedHours
      : parseInt(String(report.realizedHours), 10) || 400;

  return {
    internshipId: report.internshipId,
    title: report.title,
    realizedHours: hours,
    generalSummary: report.generalSummary || report.tasksAndLearning || "",
    goalReflections: report.goalReflections || [],
    attachments: report.attachments || [],
    status,
    // Backward compatibility aliases
    totalHours: hours,
    tasksAndLearning: report.generalSummary || report.tasksAndLearning || "",
  };
}

export interface RawBackendReview {
  decision?: string;
  comment?: string;
  createdAt?: string;
}

export interface RawBackendReport {
  id: string | number;
  internshipId?: number;
  title?: string;
  company?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  realizedHours?: number | string;
  totalHours?: number | string;
  generalSummary?: string;
  tasksAndLearning?: string;
  content?: string;
  goalReflections?: GoalReflection[];
  attachments?: Attachment[];
  submittedAt?: string;
  createdAt?: string;
  reviews?: RawBackendReview[];
  internship?: {
    company?: string;
    startDate?: string;
    endDate?: string;
    plan?: {
      company?: string;
      startDate?: string;
      endDate?: string;
      learningGoals?: Array<{ id: string; text: string }>;
    };
  };
}

/**
 * Normalizes backend API response objects into client ReportState.
 */
export function mapBackendReport(r: RawBackendReport): ReportState {
  const isApproved = r.status === "REVIEWED" || r.status === "APPROVED";
  const isSubmitted = r.status === "SUBMITTED";
  const status: "draft" | "submitted" | "approved" = isApproved
    ? "approved"
    : isSubmitted
      ? "submitted"
      : "draft";

  const submittedAt = r.submittedAt ? formatDate(r.submittedAt) : null;
  const reviewApproved = r.reviews?.find((rev) => rev.decision === "APPROVED");
  const approvedAt = reviewApproved?.createdAt ? formatDate(reviewApproved.createdAt) : null;
  const teacherFeedback = r.reviews?.[0]?.comment || "";

  let summary = r.generalSummary ?? r.tasksAndLearning;
  let parsedHours = r.realizedHours ?? r.totalHours;
  let goals = r.goalReflections;

  if (typeof r.content === "string") {
    try {
      const parsed = JSON.parse(r.content);
      if (summary === undefined) {
        summary = parsed?.generalSummary ?? parsed?.tasksAndLearning ?? "";
      }
      if (parsedHours === undefined && (parsed?.realizedHours !== undefined || parsed?.totalHours !== undefined)) {
        parsedHours = parsed.realizedHours ?? parsed.totalHours;
      }
      if (!goals && Array.isArray(parsed?.goalReflections)) {
        goals = parsed.goalReflections;
      }
    } catch {
      if (summary === undefined) {
        summary = r.content;
      }
    }
  } else if (summary === undefined) {
    summary = "";
  }

  const company =
    r.internship?.plan?.company || r.company || r.internship?.company || "";
  const startDate =
    r.internship?.plan?.startDate
      ? r.internship.plan.startDate.split("T")[0]
      : r.startDate || (r.internship?.startDate ? r.internship.startDate.split("T")[0] : "");
  const endDate =
    r.internship?.plan?.endDate
      ? r.internship.plan.endDate.split("T")[0]
      : r.endDate || (r.internship?.endDate ? r.internship.endDate.split("T")[0] : "");

  const realizedHours = parsedHours !== undefined ? parsedHours : 400;

  return createReportState({
    id: String(r.id),
    internshipId: typeof r.internshipId === "number" ? r.internshipId : undefined,
    title: r.title || "Harjoitteluraportti ja työtodistus",
    company,
    startDate,
    endDate,
    realizedHours,
    totalHours: realizedHours,
    generalSummary: sanitizeTasksAndLearning(summary),
    tasksAndLearning: sanitizeTasksAndLearning(summary),
    goalReflections: Array.isArray(goals) ? goals : [],
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    status,
    lastSavedAt: formatCurrentTime(),
    submittedAt,
    approvedAt,
    createdAt: r.createdAt ? formatDate(r.createdAt) : "",
    teacherFeedback,
  });
}

/**
 * Counts words across text and optional goal reflections.
 */
export function calculateReportWordCount(
  text: string,
  goalReflections: GoalReflection[] = []
): number {
  const summaryWords = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const goalWords = goalReflections.reduce((acc, g) => {
    const gText = (g.reflection || "").trim();
    return acc + (gText ? gText.split(/\s+/).filter(Boolean).length : 0);
  }, 0);

  return summaryWords + goalWords;
}

/**
 * Evaluates completion checklist and submission criteria.
 */
export function calculateReportChecklist(
  report: ReportState,
  wordCount: number
): ReportChecklist {
  const isWorkplaceFilled = Boolean(
    report.company.trim() &&
      report.startDate &&
      report.endDate &&
      String(report.realizedHours || report.totalHours).trim()
  );

  const hasWorkCertificate = report.attachments.some(
    (a) => a.status === "Uploaded" || !a.status
  );

  const allGoalsHaveText =
    report.goalReflections.length === 0 ||
    report.goalReflections.every((g) => (g.reflection || "").trim().length > 0);

  const isWordCountMet = wordCount >= 300 && allGoalsHaveText;
  const canSubmit = isWorkplaceFilled && hasWorkCertificate && isWordCountMet;

  return {
    isWorkplaceFilled,
    hasWorkCertificate,
    isWordCountMet,
    canSubmit,
  };
}
