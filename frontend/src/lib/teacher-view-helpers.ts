export type StudyMode = "päivätoteutus" | "monimuoto" | "unspecified";

export type TeacherStudentStatus =
  | "needs_review"
  | "changes_requested"
  | "in_progress"
  | "approved";

export interface ReportLike {
  id: number;
  status: string;
  reviews?: Array<{
    decision?: string;
    comment?: string;
    createdAt?: string;
  }>;
}

export interface SupervisedStudent {
  id: string;
  internshipId: number;
  internshipTitle: string;
  name: string;
  email: string;
  studyMode: StudyMode;
  company: string;
  hoursLogged: number;
  hoursRequired: number;
  credits: number;
  reportStatus: TeacherStudentStatus;
  creditsPutToOma: boolean;
}

/**
 * Maps backend User.studyType ("DAYTIME" | "MULTIFORM" | null) to UI StudyMode.
 */
export function mapStudyType(studyType?: string | null): StudyMode {
  if (studyType === "DAYTIME") return "päivätoteutus";
  if (studyType === "MULTIFORM") return "monimuoto";
  return "unspecified";
}

/**
 * Derives canonical teacher-facing status from an internship's latest report and reviews.
 */
export function deriveStudentReportStatus(
  reports?: ReportLike[] | null
): TeacherStudentStatus {
  const latest = Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
  if (!latest) return "in_progress";

  const status = (latest.status || "").toUpperCase();
  if (status === "REVIEWED" || status === "APPROVED") {
    return "approved";
  }
  if (status === "SUBMITTED") {
    return "needs_review";
  }
  if (
    status === "DRAFT" &&
    Array.isArray(latest.reviews) &&
    latest.reviews.length > 0 &&
    (latest.reviews[0].decision || "").toUpperCase() === "NEEDS_CHANGES"
  ) {
    return "changes_requested";
  }
  return "in_progress";
}

/**
 * Filters supervised students using logical AND across study type, status, and search query.
 */
export function filterSupervisedStudents(
  students: SupervisedStudent[],
  filters: {
    studyTypeFilter: "all" | "päivätoteutus" | "monimuoto";
    statusFilter: "all" | TeacherStudentStatus;
    searchQuery: string;
  }
): SupervisedStudent[] {
  const q = filters.searchQuery.toLowerCase().trim();

  return students.filter((s) => {
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.company.toLowerCase().includes(q) ||
      s.internshipTitle.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (
      filters.studyTypeFilter !== "all" &&
      s.studyMode !== filters.studyTypeFilter
    ) {
      return false;
    }

    if (
      filters.statusFilter !== "all" &&
      s.reportStatus !== filters.statusFilter
    ) {
      return false;
    }

    return true;
  });
}
