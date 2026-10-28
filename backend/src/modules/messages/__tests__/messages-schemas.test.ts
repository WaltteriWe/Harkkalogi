import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMessageSchema,
  replyMessageSchema,
  threadParamSchema,
} from "../messages.schemas.ts";

describe("messages.schemas: createMessageSchema", () => {
  it("accepts valid message creation payload", async () => {
    const input = {
      body: {
        recipientId: 2,
        subject: "Internship agreement question",
        body: "Hello, I have a question regarding my learning goals.",
      },
    };

    const parsed = await createMessageSchema.parseAsync(input);
    assert.equal(parsed.body.recipientId, 2);
    assert.equal(parsed.body.subject, "Internship agreement question");
  });

  it("rejects empty subject", async () => {
    const input = {
      body: {
        recipientId: 2,
        subject: "   ",
        body: "Some message content",
      },
    };

    await assert.rejects(async () => {
      await createMessageSchema.parseAsync(input);
    });
  });

  it("rejects non-positive recipient ID", async () => {
    const input = {
      body: {
        recipientId: -5,
        subject: "Hello",
        body: "Content",
      },
    };

    await assert.rejects(async () => {
      await createMessageSchema.parseAsync(input);
    });
  });
});

describe("messages.schemas: replyMessageSchema", () => {
  it("transforms numeric string id to number", async () => {
    const input = {
      params: { id: "42" },
      body: { body: "Here is my reply." },
    };

    const parsed = await replyMessageSchema.parseAsync(input);
    assert.equal(parsed.params.id, 42);
    assert.equal(parsed.body.body, "Here is my reply.");
  });

  it("rejects non-numeric thread id", async () => {
    const input = {
      params: { id: "abc" },
      body: { body: "Reply" },
    };

    await assert.rejects(async () => {
      await replyMessageSchema.parseAsync(input);
    });
  });
});

describe("messages.schemas: threadParamSchema", () => {
  it("validates and parses thread id parameter", async () => {
    const input = { params: { id: "10" } };
    const parsed = await threadParamSchema.parseAsync(input);
    assert.equal(parsed.params.id, 10);
  });
});

