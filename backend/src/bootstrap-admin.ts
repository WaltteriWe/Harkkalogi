import "dotenv/config";
import { prisma } from "./db";
import { hashPassword, minimumPasswordLength } from "./passwords";

const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.INITIAL_ADMIN_NAME?.trim();
const title = process.env.INITIAL_ADMIN_TITLE?.trim();
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!email || !name || !title || !password) {
  throw new Error(
    "Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_TITLE, and INITIAL_ADMIN_PASSWORD before bootstrapping the first admin."
  );
}
if (password.length < minimumPasswordLength) {
  throw new Error(`The initial admin password must be at least ${minimumPasswordLength} characters.`);
}

const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
if (existingAdmin) {
  if (
    existingAdmin.email === email &&
    existingAdmin.passwordHash === null
  ) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name,
        title,
        passwordHash: await hashPassword(password),
      },
    });
    console.log(`Administrator credentials initialized for ${email}.`);
    await prisma.$disconnect();
    process.exit(0);
  }
  throw new Error(
    "An administrator account already exists; the bootstrap command will not replace its credentials."
  );
}

const existingEmail = await prisma.user.findUnique({ where: { email } });
if (existingEmail) {
  throw new Error("An account already uses INITIAL_ADMIN_EMAIL.");
}

await prisma.user.create({
  data: {
    email,
    name,
    title,
    role: "ADMIN",
    passwordHash: await hashPassword(password),
  },
});

console.log(`Initial administrator account created for ${email}.`);
await prisma.$disconnect();
