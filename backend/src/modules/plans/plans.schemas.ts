import { z } from "zod";

export const learningGoalSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const savePlanSchema = z.object({
  body: z
    .object({
      scope: z.enum(["h1", "h2", "combined"]).optional(),
      company: z.string().trim().optional(),
      companyAddress: z.string().trim().optional(),
      companyWebsite: z.string().trim().optional(),
      jobTitle: z.string().trim().optional(),
      supervisorName: z.string().trim().optional(),
      supervisorPhone: z.string().trim().optional(),
      supervisorEmail: z.string().trim().optional(),
      supervisorTitle: z.string().trim().optional(),
      supervisorContact: z.string().trim().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      workloadType: z.enum(["FULL_TIME", "PART_TIME"]).optional(),
      plannedHours: z.union([z.number(), z.string()]).optional(),
      hoursPerWeek: z.union([z.number(), z.string()]).optional(),
      isInternational: z.boolean().optional(),
      isPaid: z.boolean().optional(),
      jobDescription: z.string().optional(),
      learningGoals: z.array(learningGoalSchema).optional(),
      assessment: z.string().optional(),
      status: z
        .enum(["DRAFT", "SUBMITTED", "APPROVED", "NEEDS_CHANGES"])
        .optional(),
      teacherFeedback: z.string().optional(),
      internshipId: z.union([z.number(), z.string()]).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.status === "SUBMITTED") {
        if (!data.company || data.company.trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company name is required",
            path: ["company"],
          });
        }
        if (!data.companyAddress || data.companyAddress.trim().length < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company address is required",
            path: ["companyAddress"],
          });
        }
        if (
          !data.companyWebsite ||
          !/^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/.test(
            data.companyWebsite.trim()
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Valid company website is required",
            path: ["companyWebsite"],
          });
        }
        if (!data.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Start date is required",
            path: ["startDate"],
          });
        }
        if (!data.endDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date is required",
            path: ["endDate"],
          });
        }
        if (
          data.startDate &&
          data.endDate &&
          new Date(data.startDate) > new Date(data.endDate)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date must be after start date",
            path: ["endDate"],
          });
        }
        if (data.workloadType === "PART_TIME") {
          const hpw = Number(data.hoursPerWeek);
          if (isNaN(hpw) || hpw < 1 || hpw > 60) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Hours per week must be between 1 and 60 for part-time workload",
              path: ["hoursPerWeek"],
            });
          }
        }
        const words = data.jobDescription
          ? data.jobDescription.trim().split(/\s+/).filter(Boolean).length
          : 0;
        if (words < 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Job description must be at least 100 words (currently ${words})`,
            path: ["jobDescription"],
          });
        }
        const validGoals = Array.isArray(data.learningGoals)
          ? data.learningGoals.filter(
              (g) => g && g.text && g.text.trim().length > 0
            )
          : [];
        if (validGoals.length < 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least 3 learning goals are required",
            path: ["learningGoals"],
          });
        }
        if (data.isPaid === false) {
          const hasLegacy = Boolean(
            data.supervisorContact && data.supervisorContact.trim().length > 0
          );
          if (!hasLegacy) {
            if (!data.supervisorName || data.supervisorName.trim().length === 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Supervisor name is required for unpaid internships",
                path: ["supervisorName"],
              });
            }
            if (
              !data.supervisorPhone ||
              data.supervisorPhone.trim().length === 0
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Supervisor phone is required for unpaid internships",
                path: ["supervisorPhone"],
              });
            }
            if (
              !data.supervisorEmail ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supervisorEmail.trim())
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "Valid supervisor email is required for unpaid internships",
                path: ["supervisorEmail"],
              });
            }
            if (
              !data.supervisorTitle ||
              data.supervisorTitle.trim().length === 0
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Supervisor title is required for unpaid internships",
                path: ["supervisorTitle"],
              });
            }
          }
        }
      }
    }),
});

export const planParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be numeric").transform(Number),
  }),
});

export type SavePlanInput = z.infer<typeof savePlanSchema>["body"];

