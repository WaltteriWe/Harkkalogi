import { prisma } from "../../lib/prisma.ts";
import { PlanStatus } from "../../../generated/prisma/enums.ts";
import type { SavePlanInput } from "./plans.schemas.ts";
import type { AuthUser } from "../../types/index.ts";

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

  return {
    id: plan.id,
    company: plan.company || "",
    jobTitle: plan.jobTitle || "",
    supervisorName: plan.supervisorName || "",
    supervisorContact: plan.supervisorContact || "",
    startDate,
    endDate,
    plannedHours: plan.plannedHours !== null && plan.plannedHours !== undefined ? plan.plannedHours : 800,
    hoursPerWeek: plan.hoursPerWeek !== null && plan.hoursPerWeek !== undefined ? plan.hoursPerWeek : "",
    jobDescription: plan.jobDescription || "",
    learningGoals: Array.isArray(plan.learningGoals) ? plan.learningGoals : [],
    assessment: plan.assessment || "",
    status: (plan.status || "DRAFT").toLowerCase(),
    submittedAt: plan.submittedAt ? plan.submittedAt.toISOString() : null,
    approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
    teacherFeedback: plan.teacherFeedback || "",
    createdAt: plan.createdAt ? plan.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: plan.updatedAt ? plan.updatedAt.toISOString() : new Date().toISOString(),
    studentId: plan.studentId,
    internshipId: plan.internshipId,
  };
}

export class PlansService {
  async getMyPlan(studentId: number) {
    const plan = await prisma.plan.findFirst({
      where: { studentId },
      include: {
        internship: true,
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return formatPlan(plan);
  }

  async getPlanById(id: number) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        internship: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    return formatPlan(plan);
  }

  async savePlan(user: AuthUser, input: SavePlanInput, targetPlanId?: number) {
    const studentId = user.id;

    let existing = targetPlanId
      ? await prisma.plan.findUnique({ where: { id: targetPlanId } })
      : await prisma.plan.findFirst({
          where: { studentId },
          orderBy: { createdAt: "desc" },
        });

    if (existing && user.role === "STUDENT" && existing.studentId !== user.id) {
      const err = new Error("Forbidden: You cannot modify another student's plan");
      (err as any).statusCode = 403;
      throw err;
    }

    const plannedHours =
      input.plannedHours !== undefined && input.plannedHours !== ""
        ? parseInt(String(input.plannedHours), 10) || 800
        : 800;
    const hoursPerWeek =
      input.hoursPerWeek !== undefined && input.hoursPerWeek !== ""
        ? parseFloat(String(input.hoursPerWeek)) || null
        : null;

    const startDate = input.startDate ? new Date(input.startDate) : null;
    const endDate = input.endDate ? new Date(input.endDate) : null;

    let status = existing ? existing.status : PlanStatus.DRAFT;
    let submittedAt = existing ? existing.submittedAt : null;

    if (input.status) {
      const upper = input.status.toUpperCase();
      if (upper === "SUBMITTED") {
        status = PlanStatus.SUBMITTED;
        if (!submittedAt) {
          submittedAt = new Date();
        }
      } else if (upper === "APPROVED") {
        status = PlanStatus.APPROVED;
      } else if (upper === "NEEDS_CHANGES") {
        status = PlanStatus.NEEDS_CHANGES;
      } else {
        status = PlanStatus.DRAFT;
      }
    }

    if (existing) {
      const updated = await prisma.plan.update({
        where: { id: existing.id },
        data: {
          company: input.company !== undefined ? input.company : existing.company,
          jobTitle: input.jobTitle !== undefined ? input.jobTitle : existing.jobTitle,
          supervisorName:
            input.supervisorName !== undefined ? input.supervisorName : existing.supervisorName,
          supervisorContact:
            input.supervisorContact !== undefined
              ? input.supervisorContact
              : existing.supervisorContact,
          startDate: startDate !== null ? startDate : existing.startDate,
          endDate: endDate !== null ? endDate : existing.endDate,
          plannedHours,
          hoursPerWeek,
          jobDescription:
            input.jobDescription !== undefined ? input.jobDescription : existing.jobDescription,
          learningGoals:
            input.learningGoals !== undefined
              ? (input.learningGoals as any)
              : (existing.learningGoals as any),
          assessment: input.assessment !== undefined ? input.assessment : existing.assessment,
          status,
          submittedAt,
          teacherFeedback:
            input.teacherFeedback !== undefined ? input.teacherFeedback : existing.teacherFeedback,
        },
        include: { internship: true, student: true },
      });

      return formatPlan(updated);
    } else {
      // Find or create internship
      let internship = await prisma.internship.findFirst({
        where: { studentId },
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
          company: input.company || "",
          jobTitle: input.jobTitle || "",
          supervisorName: input.supervisorName || "",
          supervisorContact: input.supervisorContact || "",
          startDate,
          endDate,
          plannedHours,
          hoursPerWeek,
          jobDescription: input.jobDescription || "",
          learningGoals: (input.learningGoals as any) || [],
          assessment: input.assessment || "",
          status,
          submittedAt,
          studentId,
          internshipId: internship.id,
        },
        include: { internship: true, student: true },
      });

      return formatPlan(created);
    }
  }
}

export const plansService = new PlansService();

