import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, StudyType } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const defaultPassword = "password123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const defaultUsers = [
    {
      email: "aino.korhonen@metropolia.fi",
      name: "Aino Korhonen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "mikko.laine@metropolia.fi",
      name: "Mikko Laine",
      role: Role.TEACHER,
      passwordHash,
    },
    {
      email: "admin@metropolia.fi",
      name: "Admin User",
      role: Role.ADMIN,
      passwordHash,
    },
  ];

  for (const user of defaultUsers) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        studyType: user.studyType ?? null,
        passwordHash: user.passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        studyType: user.studyType ?? null,
        passwordHash: user.passwordHash,
      },
    });

    console.log(`Seeded user: ${upserted.name} (${upserted.email}) [${upserted.role}]`);
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

