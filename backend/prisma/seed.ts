import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { Role, StudyType, InternshipStatus } from "../generated/prisma/enums.ts";
import { hashPassword } from "../src/lib/password.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const defaultPassword = "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const defaultUsers = [
    {
      email: "aino.korhonen@metropolia.fi",
      name: "Aino Korhonen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "ville.virtanen@metropolia.fi",
      name: "Ville Virtanen",
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

  const userMap = new Map<string, any>();

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

    userMap.set(upserted.email, upserted);
    console.log(`Seeded user: ${upserted.name} (${upserted.email}) [${upserted.role}]`);
  }

  const aino = userMap.get("aino.korhonen@metropolia.fi");
  const mikko = userMap.get("mikko.laine@metropolia.fi");
  const ville = userMap.get("ville.virtanen@metropolia.fi");

  // Seed Internship for Aino with Mikko as supervisor
  let ainoInternship = await prisma.internship.findFirst({
    where: { studentId: aino.id },
  });

  if (!ainoInternship) {
    ainoInternship = await prisma.internship.create({
      data: {
        company: "Nordic Pixel Oy",
        description: "Frontend developer internship focusing on React and Next.js portal development.",
        startDate: new Date("2026-06-01T08:00:00Z"),
        endDate: new Date("2026-11-30T16:00:00Z"),
        status: InternshipStatus.ONGOING,
        studentId: aino.id,
        teacherId: mikko.id,
      },
    });
    console.log(`Seeded internship for Aino Korhonen with supervisor Mikko Laine`);
  } else {
    ainoInternship = await prisma.internship.update({
      where: { id: ainoInternship.id },
      data: {
        teacherId: mikko.id,
        company: "Nordic Pixel Oy",
      },
    });
  }

  // Ensure Ville Virtanen has an internship with NO teacher assigned (unassigned supervisor testing)
  let villeInternship = await prisma.internship.findFirst({
    where: { studentId: ville.id },
  });

  if (!villeInternship) {
    await prisma.internship.create({
      data: {
        company: "Software Innovations Oy",
        description: "Full stack trainee internship.",
        startDate: new Date("2026-09-01T08:00:00Z"),
        status: InternshipStatus.ONGOING,
        studentId: ville.id,
        teacherId: null, // Explicitly unassigned!
      },
    });
    console.log(`Seeded unassigned internship for Ville Virtanen (teacherId: null)`);
  }

  // Seed initial conversation messages between Mikko and Aino
  const existingThread = await prisma.message.findFirst({
    where: {
      subject: "Feedback on your internship agreement",
      senderId: mikko.id,
      recipientId: aino.id,
    },
  });

  if (!existingThread) {
    const thread1 = await prisma.message.create({
      data: {
        subject: "Feedback on your internship agreement",
        body: "Hi Aino,\n\nI have reviewed your internship agreement with Nordic Pixel Oy. The learning goals are clearly aligned with the curriculum.\n\nKeep logging your hours and feel free to reach out if you have questions regarding the final reporting deadline in December.\n\nBest regards,\nMikko Laine",
        read: false,
        senderId: mikko.id,
        recipientId: aino.id,
        internshipId: ainoInternship.id,
        parentId: null,
        createdAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
        attachments: {
          create: [
            {
              name: "Harjoittelusopimus_hyvaksytty.pdf",
              size: "1.2 MB",
              fileUrl: "/documents/Harjoittelusopimus_hyvaksytty.pdf",
              mimeType: "application/pdf",
            },
          ],
        },
      },
    });

    await prisma.message.create({
      data: {
        parentId: thread1.id,
        senderId: aino.id,
        recipientId: mikko.id,
        body: "Thank you Mikko! I will keep logging my hours regularly.",
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      },
    });

    await prisma.message.create({
      data: {
        subject: "Reminder: Final report due on 15.12.",
        body: "Hello students,\n\nThis is a general reminder regarding the final report requirements. Please make sure that your 800 hours are logged and supervisor evaluations uploaded.\n\nBest,\nMikko Laine",
        read: true,
        senderId: mikko.id,
        recipientId: aino.id,
        internshipId: ainoInternship.id,
        parentId: null,
        createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
      },
    });

    console.log("Seeded sample message threads between Mikko Laine and Aino Korhonen");
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
