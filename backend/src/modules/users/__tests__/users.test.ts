import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer, getTestUsers, TEST_CREDENTIALS } from "../../../test-utils/test-server.ts";

describe("Users Endpoints (/api/users) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);
  });

  after(async () => {
    await server.close();
  });

  describe("GET /api/users", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/users");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 403 when authenticated as STUDENT (Aino)", async () => {
      const res = await server.request.get("/api/users", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 403);
      assert.ok(res.body.error.includes("Forbidden"));
    });

    it("returns 200 with all real users from PostgreSQL when authenticated as TEACHER (Mikko)", async () => {
      const res = await server.request.get("/api/users", {
        headers: testUsers.mikko.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
      assert.ok(res.body.users.length >= 5);

      const emails = res.body.users.map((u: any) => u.email);
      assert.ok(emails.includes(TEST_CREDENTIALS.aino.email));
      assert.ok(emails.includes(TEST_CREDENTIALS.ville.email));
      assert.ok(emails.includes(TEST_CREDENTIALS.mikko.email));
      assert.ok(emails.includes(TEST_CREDENTIALS.hanna.email));
      assert.ok(emails.includes(TEST_CREDENTIALS.admin.email));
    });

    it("returns 200 with all real users when authenticated as ADMIN", async () => {
      const res = await server.request.get("/api/users", {
        headers: testUsers.admin.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
      assert.ok(res.body.users.length >= 5);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get(`/api/users/${testUsers.aino.id}`);
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with Aino's profile details from PostgreSQL", async () => {
      const res = await server.request.get(`/api/users/${testUsers.aino.id}`, {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, testUsers.aino.id);
      assert.equal(res.body.user.email, TEST_CREDENTIALS.aino.email);
      assert.equal(res.body.user.role, "student");
    });

    it("returns 200 with Mikko's profile details from PostgreSQL", async () => {
      const res = await server.request.get(`/api/users/${testUsers.mikko.id}`, {
        headers: testUsers.mikko.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, testUsers.mikko.id);
      assert.equal(res.body.user.email, TEST_CREDENTIALS.mikko.email);
      assert.equal(res.body.user.role, "teacher");
    });

    it("returns 404 when requested user does not exist in PostgreSQL", async () => {
      const res = await server.request.get("/api/users/999999", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "User not found");
    });
  });
});
