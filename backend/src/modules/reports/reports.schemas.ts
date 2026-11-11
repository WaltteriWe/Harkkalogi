import { z } from "zod";

export const reportAttachmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Attachment name is required"),
  status: z.enum(["Uploaded", "Uploading"]).default("Uploaded"),
  size: z.string().optional(),
});

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    company: z.string().trim().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    totalHours: z.union([z.number(), z.string()]).optional(),
    tasksAndLearning: z.string().optional().default(""),
    attachments: z.array(reportAttachmentSchema).optional().default([]),
    supervisorFeedbackRequested: z.boolean().optional().default(false),
    status: z.enum(["DRAFT", "SUBMITTED"]).optional().default("DRAFT"),
    internshipId: z.number().int().positive().optional(),
  }),
});

export const updateReportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Report ID must be numeric").transform(Number),
  }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    company: z.string().trim().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    totalHours: z.union([z.number(), z.string()]).optional(),
    tasksAndLearning: z.string().optional(),
    attachments: z.array(reportAttachmentSchema).optional(),
    supervisorFeedbackRequested: z.boolean().optional(),
    status: z
      .enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVIEWED", "REJECTED"])
      .optional(),
  }),
});

export const reportParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Report ID must be numeric").transform(Number),
  }),
});

export type CreateReportInput = z.infer<typeof createReportSchema>["body"];
export type UpdateReportInput = z.infer<typeof updateReportSchema>["body"];

