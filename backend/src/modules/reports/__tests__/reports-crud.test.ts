import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers } from "../../../test-utils/test-server.ts";

describe("Reports CRUD Endpoints (/api/reports) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;
  let createdReportId: number;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);
  });

  after(async () => {
    await server.close();
  });

  describe("POST /api/reports", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.post("/api/reports", {
        title: "Test Draft Report",
      });
      assert.equal(res.status, 401);
    });

    it("returns 400 when title is empty or missing", async () => {
      const res = await server.request.post(
        "/api/reports",
        { title: "" },
        { headers: testUsers.aino.authHeaders }
      );
      assert.equal(res.status, 400);
    });

    it("creates a new draft report for authenticated student", async () => {
      const res = await server.request.post(
        "/api/reports",
        {
          title: "Mid-Term Progress Draft",
          company: "Nordic Pixel Oy",
          startDate: "2026-06-01",
          endDate: "2026-08-31",
          totalHours: 400,
          tasksAndLearning: "Initial reflections and setup work.",
          attachments: [{ id: "att-1", name: "Doc.pdf", status: "Uploaded", size: "1 MB" }],
          supervisorFeedbackRequested: true,
          status: "DRAFT",
        },
        { headers: testUsers.aino.authHeaders }
      );

      assert.equal(res.status, 201);
      assert.ok(res.body.report);
      assert.equal(res.body.report.title, "Mid-Term Progress Draft");
      assert.equal(res.body.report.status, "DRAFT");
      assert.equal(res.body.report.company, "Nordic Pixel Oy");
      assert.equal(res.body.report.totalHours, 400);
      assert.equal(res.body.report.tasksAndLearning, "Initial reflections and setup work.");
      assert.equal(res.body.report.attachments.length, 1);
      assert.equal(res.body.report.supervisorFeedbackRequested, true);

      createdReportId = res.body.report.id;
    });
  });

  describe("PATCH /api/reports/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.patch(`/api/reports/${createdReportId}`, {
        title: "Updated Title",
      });
      assert.equal(res.status, 401);
    });

    it("returns 403 when another student attempts to update Aino's report", async () => {
      const res = await server.request.patch(
        `/api/reports/${createdReportId}`,
        { title: "Malicious Edit" },
        { headers: testUsers.ville.authHeaders }
      );
      assert.equal(res.status, 403);
    });

    it("auto-saves draft updates successfully for report owner", async () => {
      const res = await server.request.patch(
        `/api/reports/${createdReportId}`,
        {
          tasksAndLearning: "Updated tasks reflection during auto-save.",
          totalHours: 450,
        },
        { headers: testUsers.aino.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.report.tasksAndLearning, "Updated tasks reflection during auto-save.");
      assert.equal(res.body.report.totalHours, 450);
      assert.equal(res.body.report.status, "DRAFT");
    });

    it("submits the report when ready (transitions status to SUBMITTED and sets submittedAt)", async () => {
      const res = await server.request.patch(
        `/api/reports/${createdReportId}`,
        { status: "SUBMITTED" },
        { headers: testUsers.aino.authHeaders }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.report.status, "SUBMITTED");
      assert.ok(res.body.report.submittedAt);
    });
  });

  describe("DELETE /api/reports/:id", () => {
    it("returns 400 when trying to delete a SUBMITTED report", async () => {
      const res = await server.request.delete(`/api/reports/${createdReportId}`, {
        headers: testUsers.aino.authHeaders,
      });
      assert.equal(res.status, 400);
    });

    it("allows deleting a DRAFT report", async () => {
      // Create a temporary draft to delete
      const createRes = await server.request.post(
        "/api/reports",
        { title: "Temporary Draft to Delete", status: "DRAFT" },
        { headers: testUsers.aino.authHeaders }
      );
      const tempId = createRes.body.report.id;

      const deleteRes = await server.request.delete(`/api/reports/${tempId}`, {
        headers: testUsers.aino.authHeaders,
      });
      assert.equal(deleteRes.status, 200);

      // Verify it's gone
      const getRes = await server.request.get(`/api/reports/${tempId}`, {
        headers: testUsers.aino.authHeaders,
      });
      assert.equal(getRes.status, 404);
    });
  });

  describe("Reports Authorization & IDOR Protections", () => {
    it("prevents student Aino from querying Ville's reports list via ?studentId", async () => {
      const res = await server.request.get(
        `/api/reports?studentId=${testUsers.ville.id}`,
        { headers: testUsers.aino.authHeaders }
      );
      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: You cannot view another student's reports"
      );
    });

    it("allows teacher Mikko to query reports by studentId", async () => {
      const res = await server.request.get(
        `/api/reports?studentId=${testUsers.aino.id}`,
        { headers: testUsers.mikko.authHeaders }
      );
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.reports));
    });

    it("prevents student Ville from viewing Aino's report by ID (IDOR prevention)", async () => {
      const res = await server.request.get(`/api/reports/${createdReportId}`, {
        headers: testUsers.ville.authHeaders,
      });
      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: You do not have permission to view this report"
      );
    });

    it("allows teacher Mikko to view student Aino's report by ID", async () => {
      const res = await server.request.get(`/api/reports/${createdReportId}`, {
        headers: testUsers.mikko.authHeaders,
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.report.id, createdReportId);
    });

    it("prevents student Aino from setting review decision status directly", async () => {
      const res = await server.request.patch(
        `/api/reports/${createdReportId}`,
        { status: "REVIEWED" },
        { headers: testUsers.aino.authHeaders }
      );
      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Forbidden: Students can only set report status to DRAFT or SUBMITTED"
      );
    });
  });
});

