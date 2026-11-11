import { z } from "zod";

export const learningGoalSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const savePlanSchema = z.object({
  body: z.object({
    company: z.string().trim().optional().default(""),
    jobTitle: z.string().trim().optional().default(""),
    supervisorName: z.string().trim().optional().default(""),
    supervisorContact: z.string().trim().optional().default(""),
    startDate: z.string().optional().default(""),
    endDate: z.string().optional().default(""),
    plannedHours: z.union([z.number(), z.string()]).optional().default(800),
    hoursPerWeek: z.union([z.number(), z.string()]).optional().default(""),
    jobDescription: z.string().optional().default(""),
    learningGoals: z.array(learningGoalSchema).optional().default([]),
    assessment: z.string().optional().default(""),
    status: z
      .enum(["DRAFT", "SUBMITTED", "APPROVED", "NEEDS_CHANGES"])
      .optional()
      .default("DRAFT"),
    teacherFeedback: z.string().optional(),
  }),
});

export const planParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be numeric").transform(Number),
  }),
});

export type SavePlanInput = z.infer<typeof savePlanSchema>["body"];

