import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { env } from "backend/env";

export default definePrismaConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
