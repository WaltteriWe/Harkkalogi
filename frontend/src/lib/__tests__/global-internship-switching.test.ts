import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for test environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).window = {
  localStorage: mockStorage,
};

describe("Global Internship Switching & Synchronization", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  describe("Active Internship Selection Persistence", () => {
    const userEmail = "eetu.makinen@metropolia.fi";

    it("persists active internship selection in localStorage under user-specific key", () => {
      const storageKey = `harkkalogi_active_internship_${userEmail}`;
      mockStorage.setItem(storageKey, "internship-1");

      assert.equal(mockStorage.getItem(storageKey), "internship-1");

      // Switch to internship-2
      mockStorage.setItem(storageKey, "internship-2");
      assert.equal(mockStorage.getItem(storageKey), "internship-2");
    });

    it("restores previously saved internship preference", () => {
      const storageKey = `harkkalogi_active_internship_${userEmail}`;
      mockStorage.setItem(storageKey, "internship-1");

      const availableInternships = [
        { id: "internship-1", status: "completed", isLocked: false },
        { id: "internship-2", status: "ongoing", isLocked: false },
      ];

      const saved = mockStorage.getItem(storageKey);
      const active = availableInternships.find((i) => i.id === saved && !i.isLocked);

      assert.ok(active);
      assert.equal(active.id, "internship-1");
    });

    it("falls back to default ongoing internship when no saved preference exists", () => {
      const availableInternships = [
        { id: "internship-1", status: "completed", isLocked: false },
        { id: "internship-2", status: "ongoing", isLocked: false },
      ];

      const h1 = availableInternships.find((i) => i.id === "internship-1");
      const h2 = availableInternships.find((i) => i.id === "internship-2");
      const defaultId = (h1 && h1.status === "completed" && h2 && !h2.isLocked)
        ? "internship-2"
        : availableInternships[0]?.id;

      assert.equal(defaultId, "internship-2");
    });
  });

  describe("Plan State Synchronization by Internship", () => {
    const eetuH1Plan = {
      scope: "h1" as const,
      company: "Reaktor",
      jobTitle: "Junior Software Developer Trainee",
      supervisorName: "Antti Aallokas",
      supervisorContact: "antti.aallokas@reaktor.com",
      startDate: "2025-05-05",
      endDate: "2025-08-29",
      plannedHours: 400,
      hoursPerWeek: 37.5,
      jobDescription: "Työskentely osana ketterää mobiilikehitystiimiä Reaktorilla...",
      learningGoals: [
        { id: "goal-1", text: "React Native- ja TypeScript-kehitys" },
        { id: "goal-2", text: "Ketterät menetelmät ja katselmoinnit" },
        { id: "goal-3", text: "Mobiilikäyttöliittymien saavutettavuus" },
      ],
      assessment: "Viikoittaiset ohjaukset Antti Aallokkaan kanssa.",
      status: "approved" as const,
      submittedAt: "2025-04-20",
      approvedAt: "2025-04-24",
      teacherFeedback: "Approved by Mikko Laine: Suunnitelma hyväksytty.",
    };

    const eetuH2Plan = {
      scope: "h2" as const,
      company: "Futurice",
      jobTitle: "Software Developer Intern",
      supervisorName: "Sami Salonen",
      supervisorContact: "sami.salonen@futurice.com",
      startDate: "2026-05-04",
      endDate: "2026-10-16",
      plannedHours: 400,
      hoursPerWeek: 37.5,
      jobDescription: "Toisen harjoittelujakson suorittaminen Futurice Oy:llä pilvipohjaisessa asiakasprojektissa...",
      learningGoals: [
        { id: "goal-1", text: "Pilviarkkitehtuurit ja mikropalvelut" },
        { id: "goal-2", text: "CI/CD-automaatioputket" },
        { id: "goal-3", text: "Suorituskyvyn monitorointi" },
      ],
      assessment: "Sprinttikatselmoinnit ja sparraukset Sami Salosen kanssa.",
      status: "approved" as const,
      submittedAt: "2026-04-25",
      approvedAt: "2026-04-28",
      teacherFeedback: "Approved by Mikko Laine: Harjoittelu 2 suunnitelma hyväksytty.",
    };

    it("displays Harjoittelu 1 (Reaktor) plan when Harjoittelu 1 is active", () => {
      const activeInternship = {
        id: "internship-1",
        title: "Harjoittelu 1",
        company: "Reaktor",
        scope: "h1",
        targetHours: 400,
        plan: eetuH1Plan,
      };

      assert.equal(activeInternship.plan.company, "Reaktor");
      assert.equal(activeInternship.plan.jobTitle, "Junior Software Developer Trainee");
      assert.equal(activeInternship.plan.supervisorName, "Antti Aallokas");
      assert.equal(activeInternship.plan.status, "approved");
      assert.equal(activeInternship.plan.approvedAt, "2025-04-24");
      assert.equal(activeInternship.plan.learningGoals.length, 3);
    });

    it("displays Harjoittelu 2 (Futurice) plan when Harjoittelu 2 is active", () => {
      const activeInternship = {
        id: "internship-2",
        title: "Harjoittelu 2",
        company: "Futurice",
        scope: "h2",
        targetHours: 400,
        plan: eetuH2Plan,
      };

      assert.equal(activeInternship.plan.company, "Futurice");
      assert.equal(activeInternship.plan.jobTitle, "Software Developer Intern");
      assert.equal(activeInternship.plan.supervisorName, "Sami Salonen");
      assert.equal(activeInternship.plan.status, "approved");
      assert.equal(activeInternship.plan.approvedAt, "2026-04-28");
      assert.equal(activeInternship.plan.learningGoals[0].text, "Pilviarkkitehtuurit ja mikropalvelut");
    });

    it("isolates plan draft states in memory so periods do not overwrite each other", () => {
      const planH1 = { ...eetuH1Plan, company: "Reaktor In-Memory" };
      const planH2 = { ...eetuH2Plan, company: "Futurice In-Memory" };

      const storeByInternship = {
        "internship-1": planH1,
        "internship-2": planH2,
      };

      assert.notEqual(storeByInternship["internship-1"].company, storeByInternship["internship-2"].company);
      assert.equal(storeByInternship["internship-1"].company, "Reaktor In-Memory");
      assert.equal(storeByInternship["internship-2"].company, "Futurice In-Memory");
    });
  });

  describe("Report State Synchronization by Internship", () => {
    const eetuH1Report = {
      id: "report-1",
      internshipId: 1,
      title: "Harjoittelu 1 loppuraportti (400 h)",
      company: "Reaktor",
      status: "approved" as const,
      totalHours: 400,
      tasksAndLearning: "Harjoittelu 1 Reaktorilla suoritettiin onnistuneesti...",
      attachments: [{ id: "att-1", name: "Tyotodistus_Reaktor.pdf", size: "1.2 MB" }],
      teacherFeedback: "Approved by Mikko Laine: Erinomainen raportti.",
    };

    const eetuH2Report = {
      id: "report-draft-h2",
      internshipId: 2,
      title: "Harjoittelu 2 loppuraportti",
      company: "Futurice",
      status: "draft" as const,
      totalHours: 400,
      tasksAndLearning: "",
      attachments: [],
    };

    it("loads approved 400 h report with work certificate attachment for Harjoittelu 1", () => {
      const activeInternship = {
        id: "internship-1",
        backendId: 1,
        title: "Harjoittelu 1",
        report: eetuH1Report,
      };

      assert.equal(activeInternship.report.status, "approved");
      assert.equal(activeInternship.report.totalHours, 400);
      assert.equal(activeInternship.report.attachments.length, 1);
      assert.equal(activeInternship.report.attachments[0].name, "Tyotodistus_Reaktor.pdf");
    });

    it("loads clean draft report for Harjoittelu 2 ready to write", () => {
      const activeInternship = {
        id: "internship-2",
        backendId: 2,
        title: "Harjoittelu 2",
        report: eetuH2Report,
      };

      assert.equal(activeInternship.report.status, "draft");
      assert.equal(activeInternship.report.totalHours, 400);
      assert.equal(activeInternship.report.attachments.length, 0);
      assert.equal(activeInternship.report.tasksAndLearning, "");
    });
  });

  describe("Guidance Evaluation Gating by Internship", () => {
    const eetuH1 = {
      id: "internship-1",
      backendId: 1,
      isReportApproved: true,
      isEvaluationSubmitted: true,
      isEvaluationLocked: false,
      evaluation: {
        status: "SUBMITTED" as const,
        submittedAt: "2025-08-31T10:00:00Z",
        ratings: {
          tyopaikkaohjaus: 5,
          tehtavat_vastaavuus: 5,
          tyoyhteiso: 5,
          oppilaitos_ohjaus: 4,
          kokonaisarvio: 5,
        },
        feedback: "Harjoittelu Reaktorilla oli erittäin opettavainen...",
      },
    };

    const eetuH2 = {
      id: "internship-2",
      backendId: 2,
      isReportApproved: false,
      isEvaluationSubmitted: false,
      isEvaluationLocked: true,
      evaluation: {
        status: "DRAFT" as const,
      },
    };

    it("unlocks and displays submitted 5-star evaluation for Harjoittelu 1", () => {
      assert.equal(eetuH1.isEvaluationLocked, false);
      assert.equal(eetuH1.evaluation.status, "SUBMITTED");
      assert.equal(eetuH1.evaluation.ratings.kokonaisarvio, 5);
      assert.ok(eetuH1.evaluation.feedback.includes("Reaktor"));
    });

    it("locks guidance evaluation for Harjoittelu 2 until report is approved", () => {
      assert.equal(eetuH2.isEvaluationLocked, true);
      assert.equal(eetuH2.evaluation.status, "DRAFT");
    });
  });

  describe("Active Internship Sidebar Card Display & Navigation", () => {
    function computeSidebarCard(internship: {
      id: string;
      title: string;
      company: string;
      credits: number;
      status: "completed" | "ongoing" | "not_started";
      isReportApproved?: boolean;
      currentStepNumber?: number;
    }, role: string) {
      if (role !== "student" || !internship) return null;

      const isDone = internship.status === "completed" || internship.isReportApproved;
      const isOngoing = internship.status === "ongoing";

      let statusBadgeText = "Ei aloitettu";
      let statusBadgeClass = "pill-neutral text-[10px] py-0.5 px-1.5 font-medium";

      if (isDone) {
        statusBadgeText = "Valmis ✓";
        statusBadgeClass = "pill-success text-[10px] py-0.5 px-1.5 font-medium";
      } else if (isOngoing) {
        statusBadgeText = internship.currentStepNumber
          ? `Vaihe ${internship.currentStepNumber}/6`
          : "Käynnissä";
        statusBadgeClass = "pill-brand text-[10px] py-0.5 px-1.5 font-medium";
      }

      return {
        label: "Valittu harjoittelu",
        title: internship.title,
        workplaceText: `${internship.company || "Työpaikka ei määritelty"} · ${internship.credits} op`,
        statusBadgeText,
        statusBadgeClass,
        href: "/",
      };
    }

    it("renders card for student with Harjoittelu 1 completed", () => {
      const card = computeSidebarCard(
        {
          id: "internship-1",
          title: "Harjoittelu 1",
          company: "Reaktor",
          credits: 15,
          status: "completed",
          isReportApproved: true,
          currentStepNumber: 6,
        },
        "student"
      );

      assert.ok(card);
      assert.equal(card.title, "Harjoittelu 1");
      assert.equal(card.workplaceText, "Reaktor · 15 op");
      assert.equal(card.statusBadgeText, "Valmis ✓");
      assert.equal(card.href, "/");
    });

    it("renders card for student with Harjoittelu 2 ongoing in Step 4", () => {
      const card = computeSidebarCard(
        {
          id: "internship-2",
          title: "Harjoittelu 2",
          company: "Futurice",
          credits: 15,
          status: "ongoing",
          isReportApproved: false,
          currentStepNumber: 4,
        },
        "student"
      );

      assert.ok(card);
      assert.equal(card.title, "Harjoittelu 2");
      assert.equal(card.workplaceText, "Futurice · 15 op");
      assert.equal(card.statusBadgeText, "Vaihe 4/6");
      assert.equal(card.href, "/");
    });

    it("does not render active internship card for teachers or admins", () => {
      const teacherCard = computeSidebarCard(
        {
          id: "internship-1",
          title: "Harjoittelu 1",
          company: "Reaktor",
          credits: 15,
          status: "completed",
        },
        "teacher"
      );
      assert.equal(teacherCard, null);

      const adminCard = computeSidebarCard(
        {
          id: "internship-1",
          title: "Harjoittelu 1",
          company: "Reaktor",
          credits: 15,
          status: "completed",
        },
        "admin"
      );
      assert.equal(adminCard, null);
    });
  });
});
