import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers } from "../../../test-utils/test-server.ts";
import { prisma } from "../../../lib/prisma.ts";

describe("Plans Endpoints (/api/plans) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);
    await prisma.plan.deleteMany({
      where: { studentId: { in: [testUsers.ville.id, testUsers.sara.id] } },
    });
  });

  after(async () => {
    await prisma.plan.deleteMany({
      where: { studentId: { in: [testUsers.ville.id, testUsers.sara.id] } },
    });
    await server.close();
  });

  describe("GET /api/plans/my-plan", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/plans/my-plan");
      assert.equal(res.status, 401);
    });

    it("returns 200 for authenticated student Aino", async () => {
      const res = await server.request.get("/api/plans/my-plan", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.plan !== undefined);
    });
  });

  describe("POST /api/plans & PATCH /api/plans/my-plan", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.post("/api/plans", {
        company: "Test Co",
      });
      assert.equal(res.status, 401);
    });

    it("saves/auto-saves plan draft for Ville", async () => {
      const res = await server.request.post(
        "/api/plans",
        {
          company: "Software Innovations Oy",
          jobTitle: "Fullstack Trainee",
          supervisorName: "Mikko Supervisor",
          supervisorContact: "mikko@company.fi",
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          plannedHours: 600,
          hoursPerWeek: 37.5,
          jobDescription: "Developing fullstack applications using Node and React.",
          learningGoals: [
            { id: "g1", text: "Learn Express and Prisma" },
            { id: "g2", text: "Write integration tests" },
            { id: "g3", text: "Deploy containers with Docker" },
          ],
          assessment: "Weekly meetings with team lead.",
          status: "DRAFT",
        },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.ok(res.body.plan);
      assert.equal(res.body.plan.company, "Software Innovations Oy");
      assert.equal(res.body.plan.jobTitle, "Fullstack Trainee");
      assert.equal(res.body.plan.status, "draft");
      assert.equal(res.body.plan.plannedHours, 600);
      assert.equal(res.body.plan.learningGoals.length, 3);
    });

    it("auto-saves updates via PATCH /api/plans/my-plan", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          jobDescription: "Updated description during auto-save debounce.",
        },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.jobDescription, "Updated description during auto-save debounce.");
      assert.equal(res.body.plan.status, "draft");
    });

    it("submits the plan when ready (transitions status to SUBMITTED)", async () => {
      const compliantDescription =
        "Developing fullstack applications using Node and React in a production agile environment. " +
        "My daily tasks include implementing RESTful endpoints, participating in code reviews, " +
        "collaborating with cross-functional team members, and designing PostgreSQL schemas. " +
        "I will also write automated tests, configure CI/CD pipelines, document architecture, " +
        "and optimize database query performance for large dataset scalability and reliability. " +
        "Additionally, I will participate in daily standups and sprint planning sessions to coordinate deliverables. " +
        "Furthermore, I will investigate bug reports from QA, implement secure JWT session authentication, " +
        "enforce role-based access control policies, analyze API latency metrics, and refine error handling across microservices. " +
        "This practical internship will give me hands-on industry experience in software engineering best practices, modern cloud tooling, and teamwork.";

      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          company: "Software Innovations Oy",
          companyAddress: "Mannerheimintie 10, 00100 Helsinki",
          companyWebsite: "https://innovations.fi",
          startDate: "2026-09-01",
          endDate: "2026-11-15",
          workloadType: "FULL_TIME",
          isInternational: false,
          isPaid: true,
          jobDescription: compliantDescription,
          learningGoals: [
            { id: "g1", text: "Learn Express and Prisma" },
            { id: "g2", text: "Write integration tests" },
            { id: "g3", text: "Deploy containers with Docker" },
          ],
          status: "SUBMITTED",
        },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.status, "submitted");
      assert.ok(res.body.plan.submittedAt);
      assert.equal(res.body.plan.calculatedWeeks, 10.9);
      assert.equal(res.body.plan.estimatedHours, 409);
      assert.equal(res.body.plan.estimatedCredits, 15);
    });

    it("blocks student mutation with HTTP 409 when plan is already submitted", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          jobDescription: "Attempted edit on submitted plan",
        },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 409);
      assert.equal(res.body.error, "Cannot modify an already submitted plan");
    });

    it("prevents Aino from editing Ville's plan by ID", async () => {
      // Fetch Ville's plan ID
      const villePlanRes = await server.request.get("/api/plans/my-plan", {
        headers: testUsers.ville.authHeaders,
      });
      const villePlanId = villePlanRes.body.plan.id;

      // Attempt to edit as Aino
      const res = await server.request.patch(
        `/api/plans/${villePlanId}`,
        { company: "Hacked Company" },
        { headers: testUsers.aino.authHeaders }
      );

      assert.equal(res.status, 403);
    });

    it("prevents student Aino from viewing Ville's plan by ID (IDOR prevention)", async () => {
      const villePlanRes = await server.request.get("/api/plans/my-plan", {
        headers: testUsers.ville.authHeaders,
      });
      const villePlanId = villePlanRes.body.plan.id;

      const res = await server.request.get(`/api/plans/${villePlanId}`, {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: You do not have permission to view this plan"
      );
    });

    it("allows teacher Mikko to view student Ville's plan by ID", async () => {
      const villePlanRes = await server.request.get("/api/plans/my-plan", {
        headers: testUsers.ville.authHeaders,
      });
      const villePlanId = villePlanRes.body.plan.id;

      const res = await server.request.get(`/api/plans/${villePlanId}`, {
        headers: testUsers.mikko.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.id, villePlanId);
      assert.equal(res.body.plan.company, "Software Innovations Oy");
    });

    it("prevents student Ville from self-approving their plan", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        { status: "APPROVED" },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: Students cannot set approval status"
      );
    });

    it("prevents student Ville from writing teacher feedback", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        { teacherFeedback: "Forged teacher approval." },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: Students cannot modify teacher feedback"
      );
    });

    it("allows teacher Mikko to approve Ville's plan with feedback", async () => {
      const villePlanRes = await server.request.get("/api/plans/my-plan", {
        headers: testUsers.ville.authHeaders,
      });
      const villePlanId = villePlanRes.body.plan.id;

      const res = await server.request.patch(
        `/api/plans/${villePlanId}`,
        {
          status: "APPROVED",
          teacherFeedback: "Approved by Mikko: Good goals and plan.",
        },
        { headers: testUsers.mikko.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.status, "approved");
      assert.equal(
        res.body.plan.teacherFeedback,
        "Approved by Mikko: Good goals and plan."
      );
      assert.ok(res.body.plan.approvedAt);
    });

    it("prevents student Ville from modifying an already approved plan", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        { company: "Modified After Approval" },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: Approved plans cannot be modified by students"
      );
    });
  });

  describe("Compliance Validation and Dynamic Calculations", () => {
    const compliantJobDescription =
      "Developing fullstack applications using Node and React in a production agile environment. " +
      "My daily tasks include implementing RESTful endpoints, participating in code reviews, " +
      "collaborating with cross-functional team members, and designing PostgreSQL schemas. " +
      "I will also write automated tests, configure CI/CD pipelines, document architecture, " +
      "and optimize database query performance for large dataset scalability and reliability. " +
      "Additionally, I will participate in daily standups and sprint planning sessions to coordinate deliverables. " +
      "Furthermore, I will investigate bug reports from QA, implement secure JWT session authentication, " +
      "enforce role-based access control policies, analyze API latency metrics, and refine error handling across microservices. " +
      "This practical internship will give me hands-on industry experience in software engineering best practices, modern cloud tooling, and teamwork.";

    it("saves partial draft and derives dynamic weeks, hours, and credits in formatPlan", async () => {
      const res = await server.request.post(
        "/api/plans",
        {
          company: "Part Time Tech",
          startDate: "2026-09-01",
          endDate: "2026-11-15",
          workloadType: "PART_TIME",
          hoursPerWeek: 20,
          status: "DRAFT",
        },
        { headers: testUsers.sara.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.calculatedWeeks, 10.9);
      assert.equal(res.body.plan.estimatedHours, 218);
      assert.equal(res.body.plan.estimatedCredits, 8.1);
      assert.equal(res.body.plan.workloadType, "PART_TIME");
    });

    it("fails submission of unpaid plan when supervisor contact details are missing (400 Bad Request)", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          company: "Unpaid Media Lab",
          companyAddress: "Fabianinkatu 1, 00130 Helsinki",
          companyWebsite: "https://medialab.fi",
          startDate: "2026-09-01",
          endDate: "2026-11-15",
          workloadType: "FULL_TIME",
          isPaid: false,
          jobDescription: compliantJobDescription,
          learningGoals: [
            { id: "g1", text: "Goal 1" },
            { id: "g2", text: "Goal 2" },
            { id: "g3", text: "Goal 3" },
          ],
          status: "SUBMITTED",
        },
        { headers: testUsers.sara.authHeaders }
      );

      assert.equal(res.status, 400);
      assert.ok(res.body.details);
      const messages = res.body.details.map((d: any) => d.message);
      assert.ok(
        messages.some((m: string) => m.includes("Supervisor name is required"))
      );
      assert.ok(
        messages.some((m: string) => m.includes("Supervisor phone is required"))
      );
      assert.ok(
        messages.some((m: string) =>
          m.includes("Valid supervisor email is required")
        )
      );
      assert.ok(
        messages.some((m: string) => m.includes("Supervisor title is required"))
      );
    });

    it("successfully submits unpaid plan when all supervisor contact details are provided", async () => {
      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          company: "Unpaid Media Lab",
          companyAddress: "Fabianinkatu 1, 00130 Helsinki",
          companyWebsite: "https://medialab.fi",
          startDate: "2026-09-01",
          endDate: "2026-11-15",
          workloadType: "FULL_TIME",
          isPaid: false,
          supervisorName: "Johanna Ohjaaja",
          supervisorPhone: "+358401234567",
          supervisorEmail: "johanna@medialab.fi",
          supervisorTitle: "Lead Designer",
          jobDescription: compliantJobDescription,
          learningGoals: [
            { id: "g1", text: "Goal 1" },
            { id: "g2", text: "Goal 2" },
            { id: "g3", text: "Goal 3" },
          ],
          status: "SUBMITTED",
        },
        { headers: testUsers.sara.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.status, "submitted");
      assert.equal(res.body.plan.supervisorName, "Johanna Ohjaaja");
      assert.equal(res.body.plan.supervisorPhone, "+358401234567");
      assert.equal(res.body.plan.supervisorEmail, "johanna@medialab.fi");
      assert.equal(res.body.plan.supervisorTitle, "Lead Designer");
      assert.equal(res.body.plan.isPaid, false);
    });

    it("successfully submits unpaid plan with legacy supervisorContact string", async () => {
      await prisma.plan.deleteMany({ where: { studentId: testUsers.sara.id } });

      const res = await server.request.post(
        "/api/plans",
        {
          company: "Legacy Non-Profit",
          companyAddress: "Unioninkatu 5, 00170 Helsinki",
          companyWebsite: "https://legacy-np.org",
          startDate: "2026-09-01",
          endDate: "2026-11-15",
          workloadType: "FULL_TIME",
          isPaid: false,
          supervisorContact:
            "Matti Meikäläinen, 0409876543, matti@legacy-np.org, Director",
          jobDescription: compliantJobDescription,
          learningGoals: [
            { id: "g1", text: "Goal 1" },
            { id: "g2", text: "Goal 2" },
            { id: "g3", text: "Goal 3" },
          ],
          status: "SUBMITTED",
        },
        { headers: testUsers.sara.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.status, "submitted");
      assert.equal(
        res.body.plan.supervisorContact,
        "Matti Meikäläinen, 0409876543, matti@legacy-np.org, Director"
      );
    });
  });
});

