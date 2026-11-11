import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers } from "../../../test-utils/test-server.ts";
import { prisma } from "../../../lib/prisma.ts";

describe("Reports Endpoints (/api/reports) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;
  let seededReportId: number;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);

    const report = await prisma.report.findFirst({
      include: { internship: true },
    });
    if (!report) {
      throw new Error("Seeded report missing. Run seed script.");
    }
    seededReportId = report.id;
  });

  after(async () => {
    await server.close();
  });

  describe("GET /api/reports", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/reports");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with reports list from PostgreSQL for authenticated user", async () => {
      const res = await server.request.get("/api/reports", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.reports));
      assert.ok(res.body.reports.length >= 1);
      const seeded = res.body.reports.find((r: any) => r.id === seededReportId);
      assert.ok(seeded);
      assert.equal(seeded.title, "Ensimmäisen kuukauden väliraportti");
      assert.ok(Array.isArray(seeded.reviews));
    });

    it("filters reports by studentId", async () => {
      const res = await server.request.get(
        `/api/reports?studentId=${testUsers.aino.id}`,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.ok(res.body.reports.length >= 1);
      assert.equal(
        res.body.reports[0].internship.student.id,
        testUsers.aino.id
      );
    });

    it("filters reports by status", async () => {
      const res = await server.request.get("/api/reports?status=SUBMITTED", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.reports.length >= 1);
      assert.ok(res.body.reports.every((r: any) => r.status === "SUBMITTED"));
    });
  });

  describe("GET /api/reports/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get(`/api/reports/${seededReportId}`);
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with report details, internship, and reviews from PostgreSQL", async () => {
      const res = await server.request.get(`/api/reports/${seededReportId}`, {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.report.id, seededReportId);
      assert.equal(res.body.report.title, "Ensimmäisen kuukauden väliraportti");
      assert.equal(res.body.report.internship.student.id, testUsers.aino.id);
      assert.equal(res.body.report.internship.teacher.id, testUsers.mikko.id);
      assert.ok(res.body.report.reviews.length >= 1);
      assert.equal(res.body.report.reviews[0].decision, "APPROVED");
    });

    it("returns 404 when report does not exist in PostgreSQL", async () => {
      const res = await server.request.get("/api/reports/999999", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Report not found");
    });
  });
});
