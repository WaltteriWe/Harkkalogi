import "dotenv/config";
import { z } from "zod";

const DEFAULT_DEV_JWT_SECRET = "super-secret-jwt-key-for-development-harkkalogi";

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().default(DEFAULT_DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return (
          data.JWT_SECRET.length >= 32 &&
          data.JWT_SECRET !== DEFAULT_DEV_JWT_SECRET
        );
      }
      return true;
    },
    {
      message:
        "In production, JWT_SECRET must be explicitly set with at least 32 characters and cannot use the development default.",
      path: ["JWT_SECRET"],
    }
  );

export const env = envSchema.parse(process.env);


