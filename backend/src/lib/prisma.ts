import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { env } from "../config/env.ts";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

