import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers } from "../../../test-utils/test-server.ts";
import { prisma } from "../../../lib/prisma.ts";

describe("Internships Endpoints (/api/internships) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;
  let ainoInternshipId: number;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);

    const ainoInternship = await prisma.internship.findFirst({
      where: { studentId: testUsers.aino.id },
    });
    if (!ainoInternship) {
      throw new Error("Aino's internship not found in database. Run seed script.");
    }
    ainoInternshipId = ainoInternship.id;
  });

  after(async () => {
    await server.close();
  });

  describe("GET /api/internships", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/internships");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with real internships from PostgreSQL", async () => {
      const res = await server.request.get("/api/internships", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.internships));
      assert.ok(res.body.internships.length >= 2);

      const companies = res.body.internships.map((i: any) => i.company);
      assert.ok(companies.includes("Nordic Pixel Oy"));
    });

    it("filters internships by studentId", async () => {
      const res = await server.request.get(
        `/api/internships?studentId=${testUsers.aino.id}`,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.ok(res.body.internships.length >= 1);
      assert.ok(
        res.body.internships.every((i: any) => i.studentId === testUsers.aino.id)
      );
      assert.equal(res.body.internships[0].company, "Nordic Pixel Oy");
    });

    it("filters internships by teacherId", async () => {
      const res = await server.request.get(
        `/api/internships?teacherId=${testUsers.mikko.id}`,
        {
          headers: testUsers.mikko.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.ok(res.body.internships.length >= 1);
      assert.ok(
        res.body.internships.every((i: any) => i.teacherId === testUsers.mikko.id)
      );
    });
  });

  describe("GET /api/internships/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get(`/api/internships/${ainoInternshipId}`);
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with internship details and relations from PostgreSQL", async () => {
      const res = await server.request.get(
        `/api/internships/${ainoInternshipId}`,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.internship.id, ainoInternshipId);
      assert.equal(res.body.internship.company, "Nordic Pixel Oy");
      assert.equal(res.body.internship.student.id, testUsers.aino.id);
      assert.equal(res.body.internship.teacher.id, testUsers.mikko.id);
      assert.ok(Array.isArray(res.body.internship.reports));
      assert.ok(Array.isArray(res.body.internship.messages));
    });

    it("returns 404 when internship does not exist in PostgreSQL", async () => {
      const res = await server.request.get("/api/internships/999999", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Internship not found");
    });
  });
});
