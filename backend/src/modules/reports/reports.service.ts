import { prisma } from "../../lib/prisma.ts";
import { ReportStatus, ReviewDecision } from "../../../generated/prisma/enums.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import type {
  CreateReportInput,
  UpdateReportInput,
  CreateReviewInput,
} from "./reports.schemas.ts";
import type { AuthUser } from "../../types/index.ts";
import { syncWorkflowState } from "../internships/internship-workflow.service.ts";

export function formatReport(report: any) {
  if (!report) return null;

  const realizedHours =
    typeof report.realizedHours === "number"
      ? report.realizedHours
      : typeof report.totalHours === "number"
      ? report.totalHours
      : 400;

  const generalSummary = report.generalSummary ?? "";
  const goalReflections = Array.isArray(report.goalReflections)
    ? report.goalReflections
    : [];
  const attachments = Array.isArray(report.attachments) ? report.attachments : [];

  const company = report.internship?.plan?.company || report.internship?.company || "";
  const startDate = report.internship?.plan?.startDate
    ? report.internship.plan.startDate.toISOString().split("T")[0]
    : report.internship?.startDate
    ? report.internship.startDate.toISOString().split("T")[0]
    : "";
  const endDate = report.internship?.plan?.endDate
    ? report.internship.plan.endDate.toISOString().split("T")[0]
    : report.internship?.endDate
    ? report.internship.endDate.toISOString().split("T")[0]
    : "";

  // Projections for backward compatibility with existing tests and views
  const totalHours = realizedHours;
  const tasksAndLearning = generalSummary;

  return {
    ...report,
    company,
    startDate,
    endDate,
    realizedHours,
    totalHours,
    generalSummary,
    tasksAndLearning,
    goalReflections,
    attachments,
  };
}

export class ReportsService {
  async listReports(filters: { studentId?: number; teacherId?: number; status?: any }) {
    const internshipWhere =
      filters.studentId || filters.teacherId
        ? {
            ...(filters.studentId ? { studentId: filters.studentId } : {}),
            ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
          }
        : undefined;

    const reports = await prisma.report.findMany({
      where: {
        ...(internshipWhere ? { internship: internshipWhere } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        internship: {
          select: {
            id: true,
            title: true,
            credits: true,
            creditsPutToOma: true,
            requiredHours: true,
            stage: true,
            teacherId: true,
            company: true,
            startDate: true,
            endDate: true,
            plan: true,
            student: { select: { id: true, name: true, email: true, studyType: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reports.map(formatReport);
  }

  async getReportById(id: number, user: AuthUser) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            startDate: true,
            endDate: true,
            plan: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!report) {
      return null;
    }

    if (user.role === "STUDENT" && report.internship.student.id !== user.id) {
      throw new AppError("Forbidden: You do not have permission to view this report", 403);
    }

    return formatReport(report);
  }

  async getReportsByInternship(internshipId: number, user: AuthUser) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        plan: true,
      },
    });

    if (!internship) {
      return null;
    }

    if (user.role === "STUDENT" && internship.student.id !== user.id) {
      throw new AppError("Forbidden: You do not have permission to view these reports", 403);
    }

    const reports = await prisma.report.findMany({
      where: { internshipId },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            startDate: true,
            endDate: true,
            plan: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reports.map(formatReport);
  }

  async createReport(input: CreateReportInput, user: AuthUser) {
    let internshipId = input.internshipId;

    if (!internshipId) {
      const active = await prisma.internship.findFirst({
        where: {
          studentId: user.id,
          status: "ONGOING",
        },
        orderBy: { id: "desc" },
      });
      if (active) {
        internshipId = active.id;
      }
    }

    if (!internshipId) {
      throw new Error("No internship found to associate this report with");
    }

    if (internshipId) {
      if (user.role === "STUDENT") {
        const internship = await prisma.internship.findUnique({
          where: { id: internshipId },
          include: { plan: true },
        });
        if (!internship || internship.studentId !== user.id) {
          throw new AppError("You are not authorized to create a report for this internship", 403);
        }
      }
    }

    const isSubmitted = input.status === "SUBMITTED";
    const status = isSubmitted ? ReportStatus.SUBMITTED : ReportStatus.DRAFT;
    const submittedAt = isSubmitted ? new Date() : null;

    const realizedHours = input.realizedHours ?? (typeof input.totalHours === "number" ? input.totalHours : 400);
    const generalSummary = input.generalSummary ?? input.tasksAndLearning ?? "";
    const goalReflections = input.goalReflections ?? [];
    const attachments = input.attachments ?? [];

    if (isSubmitted) {
      this.validateSubmissionInvariants(generalSummary, goalReflections, attachments);
    }

    const created = await prisma.report.create({
      data: {
        title: input.title || "Harjoitteluraportti ja työtodistus",
        realizedHours,
        generalSummary,
        goalReflections,
        attachments,
        status,
        submittedAt,
        internshipId,
      },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            startDate: true,
            endDate: true,
            plan: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: true,
      },
    });

    if (internshipId) {
      await syncWorkflowState(internshipId);
    }

    return formatReport(created);
  }

  async updateReport(id: number, input: UpdateReportInput, user: AuthUser) {
    const existing = await prisma.report.findUnique({
      where: { id },
      include: { internship: { include: { plan: true } } },
    });

    if (!existing) {
      return null;
    }

    if (user.role === "STUDENT" && existing.internship.studentId !== user.id) {
      throw new AppError("Forbidden: You do not have permission to edit this report", 403);
    }

    if (
      user.role === "STUDENT" &&
      input.status &&
      !["DRAFT", "SUBMITTED"].includes(input.status)
    ) {
      throw new AppError(
        "Forbidden: Students can only set report status to DRAFT or SUBMITTED",
        403
      );
    }

    const nextGeneralSummary =
      input.generalSummary !== undefined
        ? input.generalSummary
        : input.tasksAndLearning !== undefined
        ? input.tasksAndLearning
        : existing.generalSummary;

    const nextRealizedHours =
      input.realizedHours !== undefined
        ? input.realizedHours
        : typeof input.totalHours === "number"
        ? input.totalHours
        : existing.realizedHours;

    const nextGoalReflections =
      input.goalReflections !== undefined ? input.goalReflections : existing.goalReflections;

    const nextAttachments =
      input.attachments !== undefined ? input.attachments : existing.attachments;

    let nextStatus = existing.status;
    let submittedAt = existing.submittedAt;

    if (input.status === "SUBMITTED") {
      this.validateSubmissionInvariants(
        nextGeneralSummary,
        Array.isArray(nextGoalReflections) ? nextGoalReflections : [],
        Array.isArray(nextAttachments) ? nextAttachments : []
      );
      nextStatus = ReportStatus.SUBMITTED;
      if (!submittedAt) {
        submittedAt = new Date();
      }
    } else if (input.status === "DRAFT") {
      nextStatus = ReportStatus.DRAFT;
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        realizedHours: nextRealizedHours,
        generalSummary: nextGeneralSummary,
        goalReflections: nextGoalReflections as any,
        attachments: nextAttachments as any,
        status: nextStatus,
        submittedAt,
      },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            startDate: true,
            endDate: true,
            plan: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (existing.internshipId) {
      await syncWorkflowState(existing.internshipId);
    }

    return formatReport(updated);
  }

  private validateSubmissionInvariants(
    generalSummary: string,
    goalReflections: any[],
    attachments: any[]
  ) {
    const hasUploadedAttachment = attachments.some(
      (a) => a && (a.status === "Uploaded" || !a.status)
    );
    if (!hasUploadedAttachment) {
      throw new AppError("Liitä vähintään yksi työtodistus tai liite ennen lähettämistä", 400);
    }

    const summaryWords = (generalSummary || "").trim().split(/\s+/).filter(Boolean).length;
    const goalWords = goalReflections.reduce((acc, g) => {
      const text = (g?.reflection || "").trim();
      return acc + (text ? text.split(/\s+/).filter(Boolean).length : 0);
    }, 0);

    const totalWords = summaryWords + goalWords;
    if (totalWords < 300) {
      throw new AppError(`Pohdinnan pituus on ${totalWords} sanaa (vaaditaan vähintään 300 sanaa)`, 400);
    }
  }

  async deleteReport(id: number, user: AuthUser) {
    const existing = await prisma.report.findUnique({
      where: { id },
      include: { internship: true },
    });

    if (!existing) {
      return null;
    }

    if (user.role === "STUDENT" && existing.internship.studentId !== user.id) {
      throw new AppError("Forbidden: You do not have permission to delete this report", 403);
    }

    if (existing.status !== ReportStatus.DRAFT) {
      throw new AppError("Bad Request: Only draft reports can be deleted", 400);
    }

    await prisma.report.delete({ where: { id } });

    if (existing.internshipId) {
      await syncWorkflowState(existing.internshipId);
    }

    return { success: true, id };
  }

  async createReview(reportId: number, input: CreateReviewInput, teacher: AuthUser) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.report.findUnique({
        where: { id: reportId },
        include: { internship: true },
      });

      if (!existing) {
        throw new AppError("Report not found", 404);
      }

      if (teacher.role === "TEACHER" && existing.internship.teacherId !== teacher.id) {
        throw new AppError("Forbidden: You do not have permission to review this report", 403);
      }

      if (existing.status !== ReportStatus.SUBMITTED) {
        throw new AppError("Conflict: Only submitted reports can be reviewed", 409);
      }

      const isApproved = input.decision === "APPROVED";

      const review = await tx.review.create({
        data: {
          reportId,
          teacherId: teacher.id,
          decision: input.decision as ReviewDecision,
          comment: input.comment ?? "",
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });

      if (isApproved && input.creditsPutToOma !== undefined) {
        await tx.internship.update({
          where: { id: existing.internshipId },
          data: {
            creditsPutToOma: input.creditsPutToOma,
            creditsPutToOmaAt: input.creditsPutToOma ? new Date() : null,
          },
        });
      }

      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: isApproved ? ReportStatus.REVIEWED : ReportStatus.DRAFT,
          approvedAt: isApproved ? new Date() : null,
        },
        include: {
          internship: {
            select: {
              id: true,
              title: true,
              credits: true,
              creditsPutToOma: true,
              requiredHours: true,
              stage: true,
              teacherId: true,
              company: true,
              startDate: true,
              endDate: true,
              plan: true,
              student: { select: { id: true, name: true, email: true, studyType: true } },
            },
          },
          reviews: {
            orderBy: { createdAt: "desc" },
            include: {
              teacher: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      await syncWorkflowState(existing.internshipId, tx);

      return { review, report: formatReport(updatedReport) };
    });
  }
}

export const reportsService = new ReportsService();
