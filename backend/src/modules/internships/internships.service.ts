import { prisma } from "../../lib/prisma.ts";

export class InternshipsService {
  async listInternships(filters: { studentId?: number; teacherId?: number }) {
    return prisma.internship.findMany({
      where: {
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      },
      include: {
        student: { select: { id: true, name: true, email: true, studyType: true } },
        teacher: { select: { id: true, name: true, email: true } },
        reports: true,
      },
      orderBy: { startDate: "desc" },
    });
  }

  async getInternshipById(id: number) {
    return prisma.internship.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true, studyType: true } },
        teacher: { select: { id: true, name: true, email: true } },
        reports: true,
        messages: true,
      },
    });
  }
}

export const internshipsService = new InternshipsService();

