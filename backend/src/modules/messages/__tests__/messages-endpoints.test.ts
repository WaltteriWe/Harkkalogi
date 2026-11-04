import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  setupTestServer,
  getTestUsers,
  cleanupTestArtifacts,
} from "../../../test-utils/test-server.ts";
import { prisma } from "../../../lib/prisma.ts";

describe("Messages Endpoints (/api/messages) [E2E HTTP Flow]", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;
  let testUsers: Awaited<ReturnType<typeof getTestUsers>>;
  let seededThreadId: number;

  before(async () => {
    server = await setupTestServer();
    testUsers = await getTestUsers(server);

    const thread = await prisma.message.findFirst({
      where: {
        parentId: null,
        subject: "Feedback on your internship agreement",
        senderId: testUsers.mikko.id,
        recipientId: testUsers.aino.id,
      },
    });
    if (!thread) {
      throw new Error("Seeded message thread between Mikko and Aino missing. Run seed script.");
    }
    seededThreadId = thread.id;
  });

  after(async () => {
    await cleanupTestArtifacts();
    await server.close();
  });

  describe("GET /api/messages/inbox", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/messages/inbox");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 200 with inbox threads for Aino from PostgreSQL", async () => {
      const res = await server.request.get("/api/messages/inbox", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.messages));
      assert.ok(res.body.messages.length >= 1);
      assert.ok(
        res.body.messages.some(
          (m: any) => m.subject === "Feedback on your internship agreement"
        )
      );
    });

    it("filters inbox threads by search query", async () => {
      const res = await server.request.get(
        "/api/messages/inbox?search=agreement",
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.ok(res.body.messages.length >= 1);
      assert.ok(
        res.body.messages.every((m: any) =>
          m.subject.toLowerCase().includes("agreement")
        )
      );
    });
  });

  describe("GET /api/messages/recipients", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get("/api/messages/recipients");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns supervising teacher (Mikko) for student Aino", async () => {
      const res = await server.request.get("/api/messages/recipients", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.hasSupervisor, true);
      assert.equal(res.body.supervisor.id, testUsers.mikko.id);
      assert.equal(res.body.recipients.length, 1);
      assert.equal(res.body.recipients[0].id, testUsers.mikko.id);
    });

    it("returns hasSupervisor false for student Ville (no supervisor assigned)", async () => {
      const res = await server.request.get("/api/messages/recipients", {
        headers: testUsers.ville.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.hasSupervisor, false);
      assert.equal(res.body.supervisor, null);
      assert.deepEqual(res.body.recipients, []);
    });

    it("returns supervised student (Aino) for teacher Mikko", async () => {
      const res = await server.request.get("/api/messages/recipients", {
        headers: testUsers.mikko.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.hasSupervisor, true);
      assert.ok(res.body.recipients.some((r: any) => r.id === testUsers.aino.id));
    });

    it("returns all users for Admin", async () => {
      const res = await server.request.get("/api/messages/recipients", {
        headers: testUsers.admin.authHeaders,
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.recipients.length >= 3);
    });
  });

  describe("GET /api/messages/thread/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.get(
        `/api/messages/thread/${seededThreadId}`
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 400 validation error when thread ID is non-numeric", async () => {
      const res = await server.request.get("/api/messages/thread/abc", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("returns 200 with full thread and replies from PostgreSQL for participant (Aino)", async () => {
      const res = await server.request.get(
        `/api/messages/thread/${seededThreadId}`,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.thread.id, seededThreadId);
      assert.equal(
        res.body.thread.subject,
        "Feedback on your internship agreement"
      );
      assert.ok(Array.isArray(res.body.thread.replies));
    });

    it("returns 403 when user is not a participant in the thread (Ville)", async () => {
      const res = await server.request.get(
        `/api/messages/thread/${seededThreadId}`,
        {
          headers: testUsers.ville.authHeaders,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "You do not have permission to view this thread"
      );
    });

    it("returns 404 when thread does not exist in PostgreSQL", async () => {
      const res = await server.request.get("/api/messages/thread/999999", {
        headers: testUsers.aino.authHeaders,
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Message thread not found");
    });
  });

  describe("POST /api/messages", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.post("/api/messages", {
        recipientId: testUsers.mikko.id,
        subject: "Hello",
        body: "Test content",
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 400 validation error when subject contains emojis", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.mikko.id,
          subject: "Subject with 🔥 emoji",
          body: "Valid body text",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("returns 400 validation error when body is empty", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.mikko.id,
          subject: "Valid subject",
          body: "   ",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("returns 400 when sender attempts to message themselves", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.aino.id,
          subject: "Note to self",
          body: "Body text",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Cannot message yourself");
    });

    it("returns 403 when student Aino attempts to message someone other than supervisor (Ville)", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.ville.id,
          subject: "Hello peer",
          body: "Message content",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "Students may only message their assigned supervising teacher"
      );
    });

    it("returns 400 when student Ville (without supervisor) attempts to send a message", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.mikko.id,
          subject: "Inquiry",
          body: "Trying to message teacher without assignment",
        },
        {
          headers: testUsers.ville.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Supervisor not assigned");
    });

    it("returns 201 and creates thread in PostgreSQL when student Aino messages supervisor Mikko", async () => {
      const res = await server.request.post(
        "/api/messages",
        {
          recipientId: testUsers.mikko.id,
          subject: "[TEST] Question regarding learning journal",
          body: "[TEST] Hello Mikko, I have logged my initial hours.",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 201);
      assert.ok(typeof res.body.message.id === "number");
      assert.equal(
        res.body.message.subject,
        "[TEST] Question regarding learning journal"
      );
      assert.equal(res.body.message.senderId, testUsers.aino.id);
      assert.equal(res.body.message.recipientId, testUsers.mikko.id);
    });
  });

  describe("POST /api/messages/thread/:id/reply", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.post(
        `/api/messages/thread/${seededThreadId}/reply`,
        {
          body: "Reply content",
        }
      );

      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 400 validation error when reply contains emojis", async () => {
      const res = await server.request.post(
        `/api/messages/thread/${seededThreadId}/reply`,
        {
          body: "Great progress! 👍",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("returns 400 when student without supervisor (Ville) attempts to reply", async () => {
      const res = await server.request.post(
        `/api/messages/thread/${seededThreadId}/reply`,
        {
          body: "Trying to reply without assigned supervisor",
        },
        {
          headers: testUsers.ville.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Supervisor not assigned");
    });

    it("returns 403 when non-participant teacher (Hanna) attempts to reply", async () => {
      const res = await server.request.post(
        `/api/messages/thread/${seededThreadId}/reply`,
        {
          body: "Trying to reply to someone else's thread",
        },
        {
          headers: testUsers.hanna.authHeaders,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "You do not have permission to reply to this thread"
      );
    });

    it("returns 404 when replying to non-existent thread in PostgreSQL", async () => {
      const res = await server.request.post(
        "/api/messages/thread/999999/reply",
        {
          body: "Reply to missing thread",
        },
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Message thread not found");
    });

    it("returns 201 and persists reply in PostgreSQL when participant (Mikko) replies", async () => {
      const res = await server.request.post(
        `/api/messages/thread/${seededThreadId}/reply`,
        {
          body: "[TEST] Acknowledging receipt of update.",
        },
        {
          headers: testUsers.mikko.authHeaders,
        }
      );

      assert.equal(res.status, 201);
      assert.equal(res.body.reply.parentId, seededThreadId);
      assert.equal(res.body.reply.senderId, testUsers.mikko.id);
      assert.equal(res.body.reply.body, "[TEST] Acknowledging receipt of update.");
    });
  });

  describe("PATCH /api/messages/thread/:id/read", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await server.request.patch(
        `/api/messages/thread/${seededThreadId}/read`
      );

      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Access token is missing");
    });

    it("returns 400 validation error when thread ID is non-numeric", async () => {
      const res = await server.request.patch(
        "/api/messages/thread/xyz/read",
        undefined,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("returns 200 confirming thread marked as read in PostgreSQL", async () => {
      const res = await server.request.patch(
        `/api/messages/thread/${seededThreadId}/read`,
        undefined,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.count === "number");
    });

    it("returns 403 when non-participant (Ville) attempts to mark thread as read", async () => {
      const res = await server.request.patch(
        `/api/messages/thread/${seededThreadId}/read`,
        undefined,
        {
          headers: testUsers.ville.authHeaders,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(
        res.body.error,
        "You do not have permission to access this thread"
      );
    });

    it("returns 404 when marking non-existent thread as read in PostgreSQL", async () => {
      const res = await server.request.patch(
        "/api/messages/thread/999999/read",
        undefined,
        {
          headers: testUsers.aino.authHeaders,
        }
      );

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Message thread not found");
    });
  });
});
