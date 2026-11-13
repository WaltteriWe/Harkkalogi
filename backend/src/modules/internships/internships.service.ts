import { prisma } from "../../lib/prisma.ts";
import { computeInternshipWorkflow } from "./internship-workflow.service.ts";

export class InternshipsService {
  async listInternships(filters: { studentId?: number; teacherId?: number }) {
    const internships = await prisma.internship.findMany({
      where: {
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      },
      include: {
        student: { select: { id: true, name: true, email: true, studyType: true } },
        teacher: { select: { id: true, name: true, email: true } },
        reports: { orderBy: { createdAt: "desc" } },
        plan: true,
        guidanceEvaluation: true,
      },
      orderBy: { startDate: "desc" },
    });

    return internships.map((i) => ({
      ...i,
      workflow: computeInternshipWorkflow(i),
    }));
  }

  async getInternshipById(id: number) {
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true, studyType: true } },
        teacher: { select: { id: true, name: true, email: true } },
        reports: { orderBy: { createdAt: "desc" } },
        plan: true,
        guidanceEvaluation: true,
        messages: true,
      },
    });

    if (!internship) return null;

    return {
      ...internship,
      workflow: computeInternshipWorkflow(internship),
    };
  }

  async getGuidanceEvaluation(internshipId: number) {
    return prisma.guidanceEvaluation.findUnique({
      where: { internshipId },
    });
  }

  async saveGuidanceEvaluation(
    internshipId: number,
    studentId: number,
    data: {
      checklist?: string[];
      ratings?: Record<string, number>;
      feedback?: string;
      status?: "DRAFT" | "SUBMITTED";
    }
  ) {
    const isSubmitted = data.status === "SUBMITTED";
    return prisma.guidanceEvaluation.upsert({
      where: { internshipId },
      update: {
        checklist: data.checklist !== undefined ? (data.checklist as any) : undefined,
        ratings: data.ratings !== undefined ? (data.ratings as any) : undefined,
        feedback: data.feedback !== undefined ? data.feedback : undefined,
        status: data.status || "DRAFT",
        submittedAt: isSubmitted ? new Date() : undefined,
      },
      create: {
        internshipId,
        studentId,
        checklist: data.checklist ? (data.checklist as any) : [],
        ratings: data.ratings ? (data.ratings as any) : {},
        feedback: data.feedback || "",
        status: data.status || "DRAFT",
        submittedAt: isSubmitted ? new Date() : null,
      },
    });
  }
}

export const internshipsService = new InternshipsService();
