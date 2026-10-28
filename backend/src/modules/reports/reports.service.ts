import { prisma } from "../../lib/prisma.ts";

export class ReportsService {
  async listReports(filters: { studentId?: number; status?: any }) {
    return prisma.report.findMany({
      where: {
        ...(filters.studentId ? { internship: { studentId: filters.studentId } } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        internship: {
          select: {
            id: true,
            company: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getReportById(id: number) {
    return prisma.report.findUnique({
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
  }
}

export const reportsService = new ReportsService();

