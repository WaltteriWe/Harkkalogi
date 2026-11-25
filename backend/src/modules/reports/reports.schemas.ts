import { z } from "zod";

export const reportAttachmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Attachment name is required"),
  status: z.enum(["Uploaded", "Uploading"]).default("Uploaded"),
  size: z.string().optional(),
  fileUrl: z.string().optional(),
  mimeType: z.string().optional(),
});

export const goalReflectionSchema = z.object({
  goalId: z.string(),
  goalText: z.string(),
  reflection: z.string().default(""),
  status: z.enum(["ACHIEVED", "PARTIALLY_ACHIEVED", "NOT_ACHIEVED"]).default("ACHIEVED"),
});

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200).default("Harjoitteluraportti ja työtodistus"),
    realizedHours: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) || 400 : val))
      .pipe(z.number().int().min(1, "Tuntimäärän on oltava vähintään 1").max(2000, "Tuntimäärä ei voi ylittää 2000 tuntia"))
      .optional()
      .default(400),
    generalSummary: z.string().optional().default(""),
    goalReflections: z.array(goalReflectionSchema).optional().default([]),
    attachments: z.array(reportAttachmentSchema).optional().default([]),
    status: z.enum(["DRAFT", "SUBMITTED"]).optional().default("DRAFT"),
    internshipId: z.number().int().positive().optional(),
    // Backward-compat aliases
    tasksAndLearning: z.string().optional(),
    totalHours: z.union([z.number(), z.string()]).optional(),
  }),
});

export const updateReportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Report ID must be numeric").transform(Number),
  }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    realizedHours: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) || 400 : val))
      .pipe(z.number().int().min(1, "Tuntimäärän on oltava vähintään 1").max(2000, "Tuntimäärä ei voi ylittää 2000 tuntia"))
      .optional(),
    generalSummary: z.string().optional(),
    goalReflections: z.array(goalReflectionSchema).optional(),
    attachments: z.array(reportAttachmentSchema).optional(),
    status: z
      .enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVIEWED", "REJECTED"])
      .optional(),
    // Backward-compat aliases
    tasksAndLearning: z.string().optional(),
    totalHours: z.union([z.number(), z.string()]).optional(),
  }),
});

export const reportParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Report ID must be numeric").transform(Number),
  }),
});

export const createReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Report ID must be numeric").transform(Number),
  }),
  body: z
    .object({
      decision: z.enum(["APPROVED", "NEEDS_CHANGES"]),
      comment: z.string().trim().optional().default(""),
      creditsPutToOma: z.boolean().optional(),
    })
    .refine(
      (data) => data.decision !== "NEEDS_CHANGES" || data.comment.trim().length > 0,
      {
        message: "Comment is required when requesting changes",
        path: ["comment"],
      }
    ),
});

export type CreateReportInput = z.infer<typeof createReportSchema>["body"];
export type UpdateReportInput = z.infer<typeof updateReportSchema>["body"];
export type CreateReviewInput = z.infer<typeof createReviewSchema>["body"];
