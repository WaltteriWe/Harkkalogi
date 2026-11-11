import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers } from "../../../test-utils/test-server.ts";

describe("Plans Endpoints (/api/plans) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);
  });

  after(async () => {
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
      const res = await server.request.patch(
        "/api/plans/my-plan",
        {
          status: "SUBMITTED",
        },
        { headers: testUsers.ville.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.plan.status, "submitted");
      assert.ok(res.body.plan.submittedAt);
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
  });
});

