import { z } from "zod";

export const learningGoalSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const savePlanSchema = z.object({
  body: z.object({
    scope: z.enum(["h1", "h2", "combined"]).optional(),
    company: z.string().trim().optional(),
    jobTitle: z.string().trim().optional(),
    supervisorName: z.string().trim().optional(),
    supervisorContact: z.string().trim().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    plannedHours: z.union([z.number(), z.string()]).optional(),
    hoursPerWeek: z.union([z.number(), z.string()]).optional(),
    jobDescription: z.string().optional(),
    learningGoals: z.array(learningGoalSchema).optional(),
    assessment: z.string().optional(),
    status: z
      .enum(["DRAFT", "SUBMITTED", "APPROVED", "NEEDS_CHANGES"])
      .optional(),
    teacherFeedback: z.string().optional(),
  }),
});

export const planParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be numeric").transform(Number),
  }),
});

export type SavePlanInput = z.infer<typeof savePlanSchema>["body"];

