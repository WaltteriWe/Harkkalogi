import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMessageSchema,
  replyMessageSchema,
  threadParamSchema,
  noEmojiSchema,
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

  it("rejects subject containing emojis", async () => {
    const input = {
      body: {
        recipientId: 2,
        subject: "Internship question 😀",
        body: "Hello, I have a question.",
      },
    };

    await assert.rejects(
      async () => {
        await createMessageSchema.parseAsync(input);
      },
      (err: any) => {
        assert.equal(err.issues[0].message, "Emojis are not allowed");
        return true;
      }
    );
  });

  it("rejects message body containing emojis", async () => {
    const input = {
      body: {
        recipientId: 2,
        subject: "Internship question",
        body: "Hello, look at this 🚀",
      },
    };

    await assert.rejects(
      async () => {
        await createMessageSchema.parseAsync(input);
      },
      (err: any) => {
        assert.equal(err.issues[0].message, "Emojis are not allowed");
        return true;
      }
    );
  });

  it("accepts valid multiline message body without emojis", async () => {
    const input = {
      body: {
        recipientId: 2,
        subject: "Question about hours",
        body: "Hello teacher,\n\nHere is paragraph two.\n\nBest regards,\nJuho",
      },
    };

    const parsed = await createMessageSchema.parseAsync(input);
    assert.equal(parsed.body.body, input.body.body);
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

  it("rejects reply body containing emojis", async () => {
    const input = {
      params: { id: "42" },
      body: { body: "Sounds great! 👍" },
    };

    await assert.rejects(
      async () => {
        await replyMessageSchema.parseAsync(input);
      },
      (err: any) => {
        assert.equal(err.issues[0].message, "Emojis are not allowed");
        return true;
      }
    );
  });

  it("accepts multiline reply without emojis", async () => {
    const input = {
      params: { id: "42" },
      body: { body: "Thanks for the feedback!\nI will update the document.\n\n- Juho" },
    };

    const parsed = await replyMessageSchema.parseAsync(input);
    assert.equal(parsed.body.body, input.body.body);
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

describe("messages.schemas: noEmojiSchema", () => {
  it("accepts text without emojis", async () => {
    assert.equal(await noEmojiSchema.parseAsync("Hello world! Ääkköset 123?"), "Hello world! Ääkköset 123?");
    assert.equal(await noEmojiSchema.parseAsync("Multi\nline\ntext"), "Multi\nline\ntext");
  });

  it("rejects various emoji characters", async () => {
    const emojis = ["😀", "🚀", "❤️", "👍", "🎉", "Text with 🔥 fire"];
    for (const emoji of emojis) {
      await assert.rejects(
        async () => {
          await noEmojiSchema.parseAsync(emoji);
        },
        (err: any) => {
          assert.equal(err.issues[0].message, "Emojis are not allowed");
          return true;
        }
      );
    }
  });
});

