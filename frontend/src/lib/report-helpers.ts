import { formatDate } from "./dates";
import { formatCurrentTime } from "../hooks/useAutoSave";

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

export interface ReportChecklist {
  isWorkplaceFilled: boolean;
  hasWorkCertificate: boolean;
  isWordCountMet: boolean;
  isSupervisorFeedbackRequested: boolean;
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
 * Defaults totalHours to 400 (standard for Harjoittelu 1, 15 ECTS).
 */
export function createReportState(overrides: Partial<ReportState> = {}): ReportState {
  return {
    id: `report-${Date.now()}`,
    title: "Harjoitteluraportti ja työtodistus",
    company: "",
    startDate: "",
    endDate: "",
    totalHours: 400,
    tasksAndLearning: "",
    attachments: [],
    supervisorFeedbackRequested: false,
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
  totalHours: 400,
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
  return {
    title: report.title,
    company: report.company,
    startDate: report.startDate,
    endDate: report.endDate,
    totalHours: report.totalHours,
    tasksAndLearning: sanitizeTasksAndLearning(report.tasksAndLearning),
    attachments: report.attachments,
    supervisorFeedbackRequested: report.supervisorFeedbackRequested,
    status,
  };
}

export interface RawBackendReview {
  decision?: string;
  comment?: string;
  createdAt?: string;
}

export interface RawBackendReport {
  id: string | number;
  title?: string;
  company?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalHours?: number | string;
  tasksAndLearning?: string;
  content?: string;
  attachments?: Attachment[];
  supervisorFeedbackRequested?: boolean;
  submittedAt?: string;
  createdAt?: string;
  reviews?: RawBackendReview[];
  internship?: {
    company?: string;
    startDate?: string;
    endDate?: string;
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

  return createReportState({
    id: String(r.id),
    title: r.title || "Report",
    company: r.company || r.internship?.company || "",
    startDate:
      r.startDate ||
      (r.internship?.startDate ? r.internship.startDate.split("T")[0] : ""),
    endDate:
      r.endDate ||
      (r.internship?.endDate ? r.internship.endDate.split("T")[0] : ""),
    totalHours: r.totalHours !== undefined ? r.totalHours : 400,
    tasksAndLearning: sanitizeTasksAndLearning(tasks),
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    supervisorFeedbackRequested: Boolean(r.supervisorFeedbackRequested),
    status,
    lastSavedAt: formatCurrentTime(),
    submittedAt,
    approvedAt,
    createdAt: r.createdAt ? formatDate(r.createdAt) : "",
    teacherFeedback,
  });
}

/**
 * Counts words separated by whitespace.
 */
export function calculateReportWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
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
}
