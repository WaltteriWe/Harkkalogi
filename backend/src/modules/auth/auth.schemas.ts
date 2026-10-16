import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("A valid email address is required")
      .toLowerCase(),
    password: z.string().min(1, "Password is required"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];

