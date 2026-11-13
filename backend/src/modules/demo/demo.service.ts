import { prisma } from "../../lib/prisma.ts";

export class DemoService {
  /**
   * Resets demo student Sara Niemi to Step 1:
   * - Deletes guidance evaluations, reports, and plans
   * - Restores / sets up initial Harjoittelu 1 internship assigned to Mikko Laine
   */
  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const sara = await prisma.user.findUnique({
      where: { email: "sara.niemi@metropolia.fi" },
    });
    const mikko = await prisma.user.findUnique({
      where: { email: "mikko.laine@metropolia.fi" },
    });

    if (sara) {
      await (prisma as any).guidanceEvaluation?.deleteMany({ where: { studentId: sara.id } });
      await prisma.report.deleteMany({
        where: { internship: { studentId: sara.id } },
      });
      await prisma.plan.deleteMany({ where: { studentId: sara.id } });

      const saraInternship = await prisma.internship.findFirst({
        where: { studentId: sara.id },
      });

      if (!saraInternship) {
        await prisma.internship.create({
          data: {
            title: "Harjoittelu 1",
            order: 1,
            credits: 15,
            requiredHours: 400,
            company: "",
            description: "Harjoittelu 1 (15 op)",
            startDate: new Date("2026-09-01T08:00:00Z"),
            status: "ONGOING" as any,
            studentId: sara.id,
            teacherId: mikko?.id ?? null,
          },
        });
      } else {
        await prisma.internship.update({
          where: { id: saraInternship.id },
          data: {
            title: "Harjoittelu 1",
            order: 1,
            credits: 15,
            requiredHours: 400,
            company: "",
            teacherId: mikko?.id ?? null,
            status: "ONGOING" as any,
          },
        });
      }
    }
    return { success: true, message: "Demo student Sara Niemi reset successfully" };
  }
}

export const demoService = new DemoService();
