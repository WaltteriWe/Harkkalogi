import { z } from "zod";

export const getInboxSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      unreadOnly: z.enum(["true", "false"]).optional(),
    })
    .optional(),
});

export const noEmojiRegex = /^((?!\p{Extended_Pictographic}).)*$/su;

export const noEmojiSchema = z.string().regex(
  noEmojiRegex,
  "Emojis are not allowed"
);

export const createMessageSchema = z.object({
  body: z.object({
    recipientId: z.number().int().positive("A valid recipient is required"),
    subject: z
      .string()
      .trim()
      .min(1, "Subject cannot be empty")
      .max(200, "Subject must be under 200 characters")
      .pipe(noEmojiSchema),
    body: z
      .string()
      .trim()
      .min(1, "Message content cannot be empty")
      .pipe(noEmojiSchema),
    internshipId: z.number().int().positive().optional(),
  }),
});

export const replyMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Thread ID must be numeric").transform(Number),
  }),
  body: z.object({
    body: z
      .string()
      .trim()
      .min(1, "Reply content cannot be empty")
      .pipe(noEmojiSchema),
  }),
});

export const threadParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Thread ID must be numeric").transform(Number),
  }),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>["body"];
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>["body"];

