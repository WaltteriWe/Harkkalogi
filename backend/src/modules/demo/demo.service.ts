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

    const matias = await prisma.user.findUnique({
      where: { email: "matias.koskinen@metropolia.fi" },
    });
    if (matias) {
      // Reset Matias's guidance evaluation back to clean draft/unsubmitted state
      await (prisma as any).guidanceEvaluation?.deleteMany({ where: { studentId: matias.id } });
    }

    const eetu = await prisma.user.findUnique({
      where: { email: "eetu.makinen@metropolia.fi" },
    });
    if (eetu) {
      // Reset H2 report & evaluation so Harjoittelu 2 is always back to ready-to-report state
      const eetuH2 = await prisma.internship.findFirst({
        where: { studentId: eetu.id, order: 2 },
      });
      if (eetuH2) {
        await (prisma as any).guidanceEvaluation?.deleteMany({
          where: { internshipId: eetuH2.id },
        });
        await prisma.review.deleteMany({
          where: { report: { internshipId: eetuH2.id } },
        });
        await prisma.report.deleteMany({
          where: { internshipId: eetuH2.id },
        });
        await prisma.internship.update({
          where: { id: eetuH2.id },
          data: {
            stage: "REPORT_READY" as any,
            loggedHours: 400,
            status: "ONGOING" as any,
            creditsPutToOma: false,
            creditsPutToOmaAt: null,
          },
        });
      }

      // Ensure H1 guidance evaluation is preserved and marked SUBMITTED
      const eetuH1 = await prisma.internship.findFirst({
        where: { studentId: eetu.id, order: 1 },
      });
      if (eetuH1) {
        await prisma.internship.update({
          where: { id: eetuH1.id },
          data: {
            stage: "COMPLETED" as any,
            loggedHours: 400,
            status: "COMPLETED" as any,
            creditsPutToOma: true,
            creditsPutToOmaAt: new Date("2025-08-30T10:00:00Z"),
          },
        });
        await (prisma as any).guidanceEvaluation?.upsert({
          where: { internshipId: eetuH1.id },
          update: {
            status: "SUBMITTED",
            submittedAt: new Date("2025-08-31T10:00:00Z"),
          },
          create: {
            internshipId: eetuH1.id,
            studentId: eetu.id,
            status: "SUBMITTED",
            checklist: ["tavoitteet", "palaute", "tehtavat", "ohjaus"],
            ratings: {
              tyopaikkaohjaus: 5,
              tehtavat_vastaavuus: 5,
              tyoyhteiso: 5,
              oppilaitos_ohjaus: 4,
              kokonaisarvio: 5,
            },
            feedback: "Harjoittelu Reaktorilla suoritettu kiitettävästi.",
            submittedAt: new Date("2025-08-31T10:00:00Z"),
          },
        });
      }
    }

    return { success: true, message: "Demo students reset successfully" };
  }
}

export const demoService = new DemoService();
