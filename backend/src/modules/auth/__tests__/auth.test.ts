import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  setupTestServer,
  loginAs,
  TEST_CREDENTIALS,
} from "../../../test-utils/test-server.ts";

describe("Auth Endpoints (/api/auth) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;

  before(async () => {
    server = await setupTestServer();
  });

  after(async () => {
    await server.close();
  });

  describe("POST /api/auth/login", () => {
    it("returns 200 and a valid token when logging in with Aino (student)", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: TEST_CREDENTIALS.aino.email,
        password: TEST_CREDENTIALS.aino.password,
      });

      assert.equal(res.status, 200);
      assert.ok(typeof res.body.token === "string");
      assert.ok(res.body.token.split(".").length === 3, "Token should be in valid JWT format");
      assert.equal(res.body.user.email, TEST_CREDENTIALS.aino.email);
      assert.equal(res.body.user.role, "student");
      assert.equal(res.body.user.landingPath, "/");
    });

    it("returns 200 and teacher landingPath when logging in with Mikko (teacher)", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: TEST_CREDENTIALS.mikko.email,
        password: TEST_CREDENTIALS.mikko.password,
      });

      assert.equal(res.status, 200);
      assert.ok(typeof res.body.token === "string");
      assert.equal(res.body.user.email, TEST_CREDENTIALS.mikko.email);
      assert.equal(res.body.user.role, "teacher");
      assert.equal(res.body.user.landingPath, "/teacher-view");
    });

    it("returns 401 when password does not match Argon2 hash in database", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: TEST_CREDENTIALS.aino.email,
        password: "wrongpassword123",
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Invalid email or password");
    });

    it("returns 401 when email does not exist in database", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: "nonexistent.user@metropolia.fi",
        password: "password123",
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Invalid email or password");
    });

    it("returns 400 validation error when email is missing or invalid", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: "not-an-email",
        password: "somepassword",
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
      assert.ok(Array.isArray(res.body.details));
    });

    it("returns 400 validation error when password is empty", async () => {
      const res = await server.request.post("/api/auth/login", {
        email: TEST_CREDENTIALS.aino.email,
        password: "",
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await server.request.get("/api/auth/me");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 401 when token is invalid or malformed", async () => {
      const res = await server.request.get("/api/auth/me", {
        headers: { Authorization: "Bearer malformed.invalid.token" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Invalid or expired access token");
    });

    it("returns 200 with user profile for Aino using token from login flow", async () => {
      const ainoSession = await loginAs(
        server,
        TEST_CREDENTIALS.aino.email,
        TEST_CREDENTIALS.aino.password
      );

      const res = await server.request.get("/api/auth/me", {
        headers: ainoSession.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, ainoSession.id);
      assert.equal(res.body.user.email, TEST_CREDENTIALS.aino.email);
      assert.equal(res.body.user.role, "student");
      assert.equal(res.body.user.landingPath, "/");
    });

    it("returns 200 with user profile for Mikko (teacher) using token from login flow", async () => {
      const mikkoSession = await loginAs(
        server,
        TEST_CREDENTIALS.mikko.email,
        TEST_CREDENTIALS.mikko.password
      );

      const res = await server.request.get("/api/auth/me", {
        headers: mikkoSession.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, mikkoSession.id);
      assert.equal(res.body.user.email, TEST_CREDENTIALS.mikko.email);
      assert.equal(res.body.user.role, "teacher");
      assert.equal(res.body.user.landingPath, "/teacher-view");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 200 confirming logout", async () => {
      const res = await server.request.post("/api/auth/logout");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Logged out successfully");
    });
  });
});
