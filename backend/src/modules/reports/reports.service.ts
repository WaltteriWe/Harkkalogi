import { prisma } from "../../lib/prisma.ts";
import { ReportStatus } from "../../../generated/prisma/enums.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import type { CreateReportInput, UpdateReportInput } from "./reports.schemas.ts";
import type { AuthUser } from "../../types/index.ts";

export function formatReport(report: any) {
  if (!report) return null;
  let metadata: Record<string, any> = {};
  let isJson = false;
  try {
    const parsed = JSON.parse(report.content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      metadata = parsed;
      isJson = true;
    } else {
      metadata = { tasksAndLearning: report.content };
    }
  } catch {
    metadata = { tasksAndLearning: report.content };
  }

  const company = metadata.company || report.internship?.company || "";
  const startDate =
    metadata.startDate ||
    (report.internship?.startDate
      ? report.internship.startDate.toISOString().split("T")[0]
      : "");
  const endDate =
    metadata.endDate ||
    (report.internship?.endDate
      ? report.internship.endDate.toISOString().split("T")[0]
      : "");
  const totalHours = metadata.totalHours !== undefined ? metadata.totalHours : 800;
  const attachments = Array.isArray(metadata.attachments) ? metadata.attachments : [];
  const supervisorFeedbackRequested = Boolean(metadata.supervisorFeedbackRequested);
  let tasksAndLearning = isJson
    ? (metadata.tasksAndLearning ?? "")
    : (report.content || "");

  if (
    typeof tasksAndLearning === "string" &&
    tasksAndLearning.trim().startsWith('{"tasksAndLearning"')
  ) {
    try {
      const unwrap = JSON.parse(tasksAndLearning);
      tasksAndLearning = unwrap.tasksAndLearning ?? "";
    } catch {
      // ignore
    }
  }

  return {
    ...report,
    company,
    startDate,
    endDate,
    totalHours,
    tasksAndLearning,
    attachments,
    supervisorFeedbackRequested,
  };
}

export class ReportsService {
  async listReports(filters: { studentId?: number; status?: any }) {
    const reports = await prisma.report.findMany({
      where: {
        ...(filters.studentId ? { internship: { studentId: filters.studentId } } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            startDate: true,
            endDate: true,
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

  async getReportById(id: number, user: AuthUser) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        internship: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!report) return null;

    if (user.role === "STUDENT" && report.internship.studentId !== user.id) {
      throw new AppError("Forbidden: You do not have permission to view this report", 403);
    }

    return formatReport(report);
  }

  async createReport(input: CreateReportInput, user: AuthUser) {
    let internshipId = input.internshipId;

    if (!internshipId) {
      const activeInternship = await prisma.internship.findFirst({
        where: { studentId: user.id },
        orderBy: { startDate: "desc" },
      });

      if (!activeInternship) {
        // Fallback: create default internship for this student
        const newInternship = await prisma.internship.create({
          data: {
            company: input.company || "Internship Host",
            startDate: input.startDate ? new Date(input.startDate) : new Date(),
            studentId: user.id,
          },
        });
        internshipId = newInternship.id;
      } else {
        internshipId = activeInternship.id;
      }
    } else {
      // If student, verify internship ownership
      if (user.role === "STUDENT") {
        const internship = await prisma.internship.findUnique({
          where: { id: internshipId },
        });
        if (!internship || internship.studentId !== user.id) {
          throw new Error("You are not authorized to create a report for this internship");
        }
      }
    }

    const isSubmitted = input.status === "SUBMITTED";
    const status = isSubmitted ? ReportStatus.SUBMITTED : ReportStatus.DRAFT;
    const submittedAt = isSubmitted ? new Date() : null;

    const metadata = {
      tasksAndLearning: input.tasksAndLearning || "",
      company: input.company || "",
      startDate: input.startDate || "",
      endDate: input.endDate || "",
      totalHours: input.totalHours !== undefined ? input.totalHours : 800,
      attachments: input.attachments || [],
      supervisorFeedbackRequested: Boolean(input.supervisorFeedbackRequested),
    };

    const created = await prisma.report.create({
      data: {
        title: input.title,
        content: JSON.stringify(metadata),
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
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: true,
      },
    });

    return formatReport(created);
  }

  async updateReport(id: number, input: UpdateReportInput, user: AuthUser) {
    const existing = await prisma.report.findUnique({
      where: { id },
      include: { internship: true },
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

    // Unpack current content
    let currentMetadata: Record<string, any> = {};
    let isJson = false;
    try {
      const parsed = JSON.parse(existing.content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        currentMetadata = parsed;
        isJson = true;
      } else {
        currentMetadata = { tasksAndLearning: existing.content };
      }
    } catch {
      currentMetadata = { tasksAndLearning: existing.content };
    }

    let defaultTasks = isJson
      ? (currentMetadata.tasksAndLearning ?? "")
      : (existing.content || "");

    if (
      typeof defaultTasks === "string" &&
      defaultTasks.trim().startsWith('{"tasksAndLearning"')
    ) {
      try {
        const unwrap = JSON.parse(defaultTasks);
        defaultTasks = unwrap.tasksAndLearning ?? "";
      } catch {
        // ignore
      }
    }

    let inputTasks =
      input.tasksAndLearning !== undefined ? input.tasksAndLearning : defaultTasks;
    if (
      typeof inputTasks === "string" &&
      inputTasks.trim().startsWith('{"tasksAndLearning"')
    ) {
      try {
        const unwrap = JSON.parse(inputTasks);
        inputTasks = unwrap.tasksAndLearning ?? "";
      } catch {
        // ignore
      }
    }

    // Merge metadata
    const updatedMetadata = {
      tasksAndLearning: inputTasks,
      company: input.company !== undefined ? input.company : currentMetadata.company || "",
      startDate:
        input.startDate !== undefined ? input.startDate : currentMetadata.startDate || "",
      endDate: input.endDate !== undefined ? input.endDate : currentMetadata.endDate || "",
      totalHours:
        input.totalHours !== undefined
          ? input.totalHours
          : currentMetadata.totalHours !== undefined
            ? currentMetadata.totalHours
            : 800,
      attachments:
        input.attachments !== undefined
          ? input.attachments
          : currentMetadata.attachments || [],
      supervisorFeedbackRequested:
        input.supervisorFeedbackRequested !== undefined
          ? input.supervisorFeedbackRequested
          : Boolean(currentMetadata.supervisorFeedbackRequested),
    };

    let nextStatus = existing.status;
    let submittedAt = existing.submittedAt;

    if (input.status === "SUBMITTED") {
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
        content: JSON.stringify(updatedMetadata),
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

    return formatReport(updated);
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
    return { success: true, id };
  }
}

export const reportsService = new ReportsService();
