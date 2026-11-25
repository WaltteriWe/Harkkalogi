import { prisma } from "../../lib/prisma.ts";
import { computeInternshipWorkflow, syncWorkflowState } from "./internship-workflow.service.ts";

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
        reports: {
          orderBy: { createdAt: "desc" },
          include: {
            reviews: { orderBy: { createdAt: "desc" } },
          },
        },
        plan: true,
        guidanceEvaluation: true,
      },
      orderBy: [{ order: "asc" }, { startDate: "asc" }],
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
        reports: {
          orderBy: { createdAt: "desc" },
          include: {
            reviews: { orderBy: { createdAt: "desc" } },
          },
        },
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

  async setCreditsPutToOma(internshipId: number, creditsPutToOma: boolean) {
    const updated = await prisma.internship.update({
      where: { id: internshipId },
      data: {
        creditsPutToOma,
        creditsPutToOmaAt: creditsPutToOma ? new Date() : null,
      },
    });

    await syncWorkflowState(internshipId);
    return updated;
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

    if (isSubmitted) {
      const internship = await prisma.internship.findUnique({
        where: { id: internshipId },
        include: { reports: { include: { reviews: true } }, plan: true },
      });
      if (internship) {
        const wf = computeInternshipWorkflow(internship);
        if (wf.isEvaluationLocked) {
          throw new Error("Guidance evaluation is locked until the internship report is approved.");
        }
      }
    }

    const result = await prisma.guidanceEvaluation.upsert({
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

    if (isSubmitted) {
      await syncWorkflowState(internshipId);
    }

    return result;
  }
}

export const internshipsService = new InternshipsService();
