import { prisma } from "../../lib/prisma.ts";
import { PlanStatus } from "../../../generated/prisma/enums.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import type { SavePlanInput } from "./plans.schemas.ts";
import type { AuthUser } from "../../types/index.ts";
import { syncWorkflowState } from "../internships/internship-workflow.service.ts";

export function formatPlan(plan: any) {
  if (!plan) return null;
  const startDate = plan.startDate
    ? plan.startDate instanceof Date
      ? plan.startDate.toISOString().split("T")[0]
      : String(plan.startDate).split("T")[0]
    : "";
  const endDate = plan.endDate
    ? plan.endDate instanceof Date
      ? plan.endDate.toISOString().split("T")[0]
      : String(plan.endDate).split("T")[0]
    : "";

  const start = plan.startDate ? new Date(plan.startDate) : null;
  const end = plan.endDate ? new Date(plan.endDate) : null;
  let calculatedWeeks = 0;
  let estimatedHours = 0;
  let estimatedCredits = 0;

  if (start && end && start <= end) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const utcd1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcd2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const days = Math.floor((utcd2 - utcd1) / msPerDay) + 1;
    calculatedWeeks = Math.max(0, Math.round((days / 7) * 10) / 10);
    const hpw =
      plan.workloadType === "PART_TIME"
        ? Number(plan.hoursPerWeek) || 0
        : 37.5;
    estimatedHours = Math.round(calculatedWeeks * hpw);
    const maxCreds = plan.scope === "combined" ? 30.0 : 15.0;
    estimatedCredits = Math.min(
      maxCreds,
      Math.round((estimatedHours / 27) * 10) / 10
    );
  }

  return {
    id: plan.id,
    scope: plan.scope || "h1",
    company: plan.company || "",
    companyAddress: plan.companyAddress || "",
    companyWebsite: plan.companyWebsite || "",
    jobTitle: plan.jobTitle || "",
    supervisorName: plan.supervisorName || "",
    supervisorPhone: plan.supervisorPhone || "",
    supervisorEmail: plan.supervisorEmail || "",
    supervisorTitle: plan.supervisorTitle || "",
    supervisorContact: plan.supervisorContact || "",
    startDate,
    endDate,
    workloadType: plan.workloadType || "FULL_TIME",
    plannedHours:
      plan.plannedHours !== null && plan.plannedHours !== undefined
        ? plan.plannedHours
        : 400,
    hoursPerWeek:
      plan.hoursPerWeek !== null && plan.hoursPerWeek !== undefined
        ? plan.hoursPerWeek
        : "",
    isInternational: Boolean(plan.isInternational),
    isPaid: plan.isPaid !== false,
    calculatedWeeks,
    estimatedHours,
    estimatedCredits,
    jobDescription: plan.jobDescription || "",
    learningGoals: Array.isArray(plan.learningGoals) ? plan.learningGoals : [],
    assessment: plan.assessment || "",
    status: (plan.status || "DRAFT").toLowerCase(),
    submittedAt: plan.submittedAt ? plan.submittedAt.toISOString() : null,
    approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
    teacherFeedback: plan.teacherFeedback || "",
    createdAt: plan.createdAt
      ? plan.createdAt.toISOString()
      : new Date().toISOString(),
    updatedAt: plan.updatedAt
      ? plan.updatedAt.toISOString()
      : new Date().toISOString(),
    studentId: plan.studentId,
    internshipId: plan.internshipId,
  };
}

export class PlansService {
  async getMyPlan(studentId: number, internshipId?: number) {
    const plan = await prisma.plan.findFirst({
      where: {
        studentId,
        ...(internshipId ? { internshipId } : {}),
      },
      include: {
        internship: true,
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return formatPlan(plan);
  }

  async getPlanById(id: number, user: AuthUser) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        internship: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!plan) return null;

    if (user.role === "STUDENT" && plan.studentId !== user.id) {
      throw new AppError("Forbidden: You do not have permission to view this plan", 403);
    }

    return formatPlan(plan);
  }

  async savePlan(user: AuthUser, input: SavePlanInput, targetPlanId?: number) {
    const studentId = user.id;
    const requestedInternshipId = input.internshipId ? parseInt(String(input.internshipId), 10) : undefined;

    let existing = targetPlanId
      ? await prisma.plan.findUnique({ where: { id: targetPlanId } })
      : requestedInternshipId
      ? await prisma.plan.findFirst({
          where: { studentId, internshipId: requestedInternshipId },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.plan.findFirst({
          where: { studentId },
          orderBy: { createdAt: "desc" },
        });

    if (existing && user.role === "STUDENT" && existing.studentId !== user.id) {
      throw new AppError("Forbidden: You cannot modify another student's plan", 403);
    }

    if (user.role === "STUDENT") {
      if (
        input.status &&
        (input.status.toUpperCase() === "APPROVED" ||
          input.status.toUpperCase() === "NEEDS_CHANGES")
      ) {
        throw new AppError("Forbidden: Students cannot set approval status", 403);
      }

      if (
        input.teacherFeedback !== undefined &&
        input.teacherFeedback !== (existing ? existing.teacherFeedback : undefined)
      ) {
        throw new AppError("Forbidden: Students cannot modify teacher feedback", 403);
      }

      if (existing && existing.status === PlanStatus.APPROVED) {
        throw new AppError("Forbidden: Approved plans cannot be modified by students", 403);
      }

      if (existing && existing.status === PlanStatus.SUBMITTED) {
        throw new AppError("Cannot modify an already submitted plan", 409);
      }
    }

    const plannedHours =
      input.plannedHours !== undefined && input.plannedHours !== ""
        ? parseInt(String(input.plannedHours), 10) || 400
        : 400;
    const hoursPerWeek =
      input.hoursPerWeek !== undefined && input.hoursPerWeek !== ""
        ? parseFloat(String(input.hoursPerWeek)) || null
        : null;

    const startDate = input.startDate ? new Date(input.startDate) : null;
    const endDate = input.endDate ? new Date(input.endDate) : null;

    let status = existing ? existing.status : PlanStatus.DRAFT;
    let submittedAt = existing ? existing.submittedAt : null;
    let approvedAt = existing ? existing.approvedAt : null;

    if (input.status) {
      const upper = input.status.toUpperCase();
      if (upper === "SUBMITTED") {
        status = PlanStatus.SUBMITTED;
        if (!submittedAt) {
          submittedAt = new Date();
        }
      } else if (upper === "APPROVED") {
        status = PlanStatus.APPROVED;
        if (!approvedAt) {
          approvedAt = new Date();
        }
      } else if (upper === "NEEDS_CHANGES") {
        status = PlanStatus.NEEDS_CHANGES;
      } else {
        status = PlanStatus.DRAFT;
      }
    }

    if (existing) {
      const updateResult = await prisma.plan.updateMany({
        where: {
          id: existing.id,
          ...(user.role === "STUDENT"
            ? { status: { in: [PlanStatus.DRAFT, PlanStatus.NEEDS_CHANGES] } }
            : {}),
        },
        data: {
          scope: input.scope !== undefined ? input.scope : (existing as any).scope || "h1",
          company: input.company !== undefined ? input.company : existing.company,
          companyAddress:
            input.companyAddress !== undefined
              ? input.companyAddress
              : existing.companyAddress,
          companyWebsite:
            input.companyWebsite !== undefined
              ? input.companyWebsite
              : existing.companyWebsite,
          jobTitle: input.jobTitle !== undefined ? input.jobTitle : existing.jobTitle,
          supervisorName:
            input.supervisorName !== undefined ? input.supervisorName : existing.supervisorName,
          supervisorPhone:
            input.supervisorPhone !== undefined
              ? input.supervisorPhone
              : existing.supervisorPhone,
          supervisorEmail:
            input.supervisorEmail !== undefined
              ? input.supervisorEmail
              : existing.supervisorEmail,
          supervisorTitle:
            input.supervisorTitle !== undefined
              ? input.supervisorTitle
              : existing.supervisorTitle,
          supervisorContact:
            input.supervisorContact !== undefined
              ? input.supervisorContact
              : existing.supervisorContact,
          startDate: startDate !== null ? startDate : existing.startDate,
          endDate: endDate !== null ? endDate : existing.endDate,
          workloadType:
            input.workloadType !== undefined
              ? (input.workloadType as any)
              : existing.workloadType,
          plannedHours,
          hoursPerWeek,
          isInternational:
            input.isInternational !== undefined
              ? input.isInternational
              : existing.isInternational,
          isPaid: input.isPaid !== undefined ? input.isPaid : existing.isPaid,
          jobDescription:
            input.jobDescription !== undefined ? input.jobDescription : existing.jobDescription,
          learningGoals:
            input.learningGoals !== undefined
              ? (input.learningGoals as any)
              : (existing.learningGoals as any),
          assessment: input.assessment !== undefined ? input.assessment : existing.assessment,
          status,
          submittedAt,
          approvedAt,
          teacherFeedback:
            input.teacherFeedback !== undefined ? input.teacherFeedback : existing.teacherFeedback,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError("Plan is locked for review (status changed)", 409);
      }

      const updated = await prisma.plan.findUniqueOrThrow({
        where: { id: existing.id },
        include: { internship: true, student: true },
      });

      if (updated.internshipId) {
        await syncWorkflowState(updated.internshipId);
      }

      return formatPlan(updated);
    } else {
      // Find or create internship without an attached plan, or match requested internship
      let internship = requestedInternshipId
        ? await prisma.internship.findUnique({ where: { id: requestedInternshipId } })
        : await prisma.internship.findFirst({
            where: { studentId, plan: null },
          });

      if (!internship) {
        internship = await prisma.internship.create({
          data: {
            company: input.company || "Internship Host",
            startDate: startDate || new Date(),
            studentId,
          },
        });
      }

      const created = await prisma.plan.create({
        data: {
          scope: input.scope || "h1",
          company: input.company || "",
          companyAddress: input.companyAddress || null,
          companyWebsite: input.companyWebsite || null,
          jobTitle: input.jobTitle || "",
          supervisorName: input.supervisorName || "",
          supervisorPhone: input.supervisorPhone || null,
          supervisorEmail: input.supervisorEmail || null,
          supervisorTitle: input.supervisorTitle || null,
          supervisorContact: input.supervisorContact || "",
          startDate,
          endDate,
          workloadType: (input.workloadType as any) || "FULL_TIME",
          plannedHours,
          hoursPerWeek,
          isInternational: input.isInternational ?? false,
          isPaid: input.isPaid ?? true,
          jobDescription: input.jobDescription || "",
          learningGoals: (input.learningGoals as any) || [],
          assessment: input.assessment || "",
          status,
          submittedAt,
          approvedAt,
          studentId,
          internshipId: internship.id,
        },
        include: { internship: true, student: true },
      });

      if (created.internshipId) {
        await syncWorkflowState(created.internshipId);
      }

      return formatPlan(created);
    }
  }
}

export const plansService = new PlansService();

