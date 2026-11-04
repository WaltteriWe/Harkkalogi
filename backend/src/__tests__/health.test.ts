import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestServer } from "../test-utils/test-server.ts";

describe("Healthcheck endpoint", () => {
  let server: Awaited<ReturnType<typeof setupTestServer>>;

  before(async () => {
    server = await setupTestServer();
  });

  after(async () => {
    await server.close();
  });

  it("GET /health returns 200 with status ok and ISO timestamp", async () => {
    const res = await server.request.get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.ok(typeof res.body.timestamp === "string");
    assert.ok(!isNaN(Date.parse(res.body.timestamp)));
  });
});

