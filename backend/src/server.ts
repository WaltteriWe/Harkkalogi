import "dotenv/config";
import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { prisma } from "./db";
import {
  generateTemporaryPassword,
  hashPassword,
  minimumPasswordLength,
  verifyPassword,
} from "./passwords";

const port = Number(process.env.PORT ?? 4000);
const sessionCookieName = "harkkalogi_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

type SessionUser = {
  id: number;
  email: string;
  name: string;
  title: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  passwordChangeRequired: boolean;
};

type AuthenticatedSession = {
  id: number;
  token: string;
  user: SessionUser;
};

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function publicUser(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    title: user.title,
    role: user.role.toLowerCase(),
    passwordChangeRequired: user.passwordChangeRequired,
  };
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${sessionCookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function getCookie(request: IncomingMessage, name: string): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const entry = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return entry ? entry.slice(name.length + 1) : null;
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 16_384) {
      throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
    }
    chunks.push(buffer);
  }

  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Expected a JSON object.");
    }
    return body as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error("A valid JSON object is required."), { statusCode: 400 });
  }
}

async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const session = await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });
  return { session, token };
}

async function getSession(request: IncomingMessage): Promise<AuthenticatedSession | null> {
  const token = getCookie(request, sessionCookieName);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.id,
    token,
    user: {
      ...session.user,
      title: session.user.title,
      passwordChangeRequired: session.user.passwordChangeRequired,
    },
  };
}

async function requireAdmin(
  request: IncomingMessage,
  response: ServerResponse
): Promise<AuthenticatedSession | null> {
  const session = await getSession(request);
  if (!session) {
    sendJson(response, 401, { error: "Sign in to continue." });
    return null;
  }
  if (session.user.role !== "ADMIN") {
    sendJson(response, 403, { error: "Administrator access is required." });
    return null;
  }
  if (session.user.passwordChangeRequired) {
    sendJson(response, 403, { error: "Change the temporary password before continuing." });
    return null;
  }
  return session;
}

function validatePassword(password: unknown): password is string {
  return typeof password === "string" &&
    password.length >= minimumPasswordLength &&
    password.length <= 256;
}

function allowLoginAttempt(key: string): boolean {
  const now = Date.now();
  if (loginAttempts.size > 1000) {
    for (const [attemptKey, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(attemptKey);
    }
  }
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (current.count >= 10) return false;
  current.count += 1;
  return true;
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse): boolean {
  const origin = request.headers.origin;
  if (origin && origin !== frontendOrigin) return false;
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (!setCorsHeaders(request, response)) {
    sendJson(response, 403, { error: "Request origin is not allowed." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = url.pathname;
  const method = request.method ?? "GET";

  if (method === "GET" && path === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (method === "POST" && path === "/api/auth/login") {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const address = request.socket.remoteAddress ?? "unknown";
    const attemptKey = address;

    if (!allowLoginAttempt(attemptKey)) {
      sendJson(response, 429, { error: "Too many sign-in attempts. Try again later." });
      return;
    }

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      sendJson(response, 401, { error: "Email or password is incorrect." });
      return;
    }

    const { token } = await createSession(user.id);
    loginAttempts.delete(attemptKey);
    sendJson(
      response,
      200,
      { user: publicUser(user) },
      { "Set-Cookie": sessionCookie(token, sessionLifetimeMs / 1000) }
    );
    return;
  }

  if (method === "GET" && path === "/api/auth/me") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    sendJson(response, 200, { user: publicUser(session.user) });
    return;
  }

  if (method === "GET" && path === "/api/teacher/students") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    if (session.user.role !== "TEACHER") {
      sendJson(response, 403, { error: "Teacher access is required." });
      return;
    }

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", supervisingTeacherId: session.user.id },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      include: {
        internships: {
          orderBy: { startDate: "desc" },
          take: 1,
          include: {
            reports: {
              orderBy: { updatedAt: "desc" },
              select: { status: true, updatedAt: true },
            },
          },
        },
      },
    });

    sendJson(response, 200, {
      students: students.map((student) => {
        const internship = student.internships[0];
        const reports = internship?.reports ?? [];
        const reportStatus = reports.some((report) => report.status === "SUBMITTED")
          ? "needs_review"
          : reports.some((report) => report.status === "REVIEWED")
            ? "reviewed"
            : "in_progress";
        return {
          id: student.id,
          name: student.name,
          title: student.title,
          email: student.email,
          company: internship?.company ?? null,
          reportStatus,
        };
      }),
    });
    return;
  }

  if (method === "POST" && path === "/api/auth/logout") {
    const session = await getSession(request);
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    sendJson(
      response,
      200,
      { success: true },
      { "Set-Cookie": sessionCookie("", 0) }
    );
    return;
  }

  if (method === "POST" && path === "/api/auth/change-password") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }

    const body = await readJson(request);
    const currentPassword = typeof body.currentPassword === "string"
      ? body.currentPassword
      : "";
    const newPassword = body.newPassword;
    const storedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (
      !storedUser?.passwordHash ||
      !(await verifyPassword(currentPassword, storedUser.passwordHash))
    ) {
      sendJson(response, 400, { error: "Current password is incorrect." });
      return;
    }
    if (!validatePassword(newPassword)) {
      sendJson(response, 400, {
        error: `New password must be between ${minimumPasswordLength} and 256 characters.`,
      });
      return;
    }
    if (await verifyPassword(newPassword, storedUser.passwordHash)) {
      sendJson(response, 400, { error: "Choose a password different from the current one." });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: storedUser.id },
      data: { passwordHash, passwordChangeRequired: false },
    });
    await prisma.session.deleteMany({ where: { userId: storedUser.id } });
    const { token } = await createSession(storedUser.id);
    const updatedUser = { ...storedUser, passwordChangeRequired: false };
    sendJson(
      response,
      200,
      { user: publicUser(updatedUser) },
      { "Set-Cookie": sessionCookie(token, sessionLifetimeMs / 1000) }
    );
    return;
  }

  if (method === "GET" && path === "/api/admin/users") {
    const session = await requireAdmin(request, response);
    if (!session) return;
    const users = await prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      include: {
        supervisingTeacher: { select: { id: true, name: true } },
      },
    });
    sendJson(response, 200, {
      users: users.map(({ supervisingTeacher, ...user }) => ({
        ...user,
        role: user.role.toLowerCase(),
        supervisingTeacherId: supervisingTeacher?.id ?? null,
        supervisingTeacher: supervisingTeacher?.name ?? null,
      })),
    });
    return;
  }

  const assignTeacherMatch = path.match(/^\/api\/admin\/users\/(\d+)\/supervisor$/);
  if (method === "PATCH" && assignTeacherMatch) {
    const session = await requireAdmin(request, response);
    if (!session) return;

    const studentId = Number(assignTeacherMatch[1]);
    const body = await readJson(request);
    const teacherId = body.supervisingTeacherId;
    if (
      teacherId !== null &&
      (typeof teacherId !== "number" ||
        !Number.isSafeInteger(teacherId) ||
        teacherId <= 0)
    ) {
      sendJson(response, 400, { error: "Choose a valid teacher or leave the student unassigned." });
      return;
    }
    const supervisingTeacherId = teacherId as number | null;

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== "STUDENT") {
      sendJson(response, 404, { error: "Student account was not found." });
      return;
    }

    if (supervisingTeacherId !== null) {
      const teacher = await prisma.user.findUnique({
        where: { id: supervisingTeacherId },
        select: { id: true, role: true },
      });
      if (!teacher || teacher.role !== "TEACHER") {
        sendJson(response, 400, { error: "The selected account is not a teacher." });
        return;
      }
    }

    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { supervisingTeacherId },
      include: { supervisingTeacher: { select: { id: true, name: true } } },
    });
    sendJson(response, 200, {
      student: {
        id: updatedStudent.id,
        supervisingTeacherId: updatedStudent.supervisingTeacher?.id ?? null,
        supervisingTeacher: updatedStudent.supervisingTeacher?.name ?? null,
      },
    });
    return;
  }

  if (method === "POST" && path === "/api/admin/users") {
    const session = await requireAdmin(request, response);
    if (!session) return;
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.toUpperCase() : "";

    if (!name || name.length > 120 || !title || title.length > 120) {
      sendJson(response, 400, { error: "Name and professional title are required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      sendJson(response, 400, { error: "Enter a valid email address." });
      return;
    }
    if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      sendJson(response, 400, { error: "Choose a valid account role." });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendJson(response, 409, { error: "An account with this email already exists." });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const user = await prisma.user.create({
      data: {
        name,
        title,
        email,
        role: role as "STUDENT" | "TEACHER" | "ADMIN",
        passwordHash: await hashPassword(temporaryPassword),
        passwordChangeRequired: true,
      },
    });
    sendJson(response, 201, {
      user: publicUser(user),
      temporaryPassword,
    });
    return;
  }

  const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (method === "PATCH" && userMatch) {
    const session = await requireAdmin(request, response);
    if (!session) return;
    const userId = Number(userMatch[1]);
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.toUpperCase() : "";

    if (!name || name.length > 120 || !title || title.length > 120) {
      sendJson(response, 400, { error: "Name and professional title are required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      sendJson(response, 400, { error: "Enter a valid email address." });
      return;
    }
    if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      sendJson(response, 400, { error: "Choose a valid account role." });
      return;
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          title,
          email,
          role: role as "STUDENT" | "TEACHER" | "ADMIN",
          supervisingTeacherId: role === "STUDENT" ? undefined : null,
        },
        include: { supervisingTeacher: { select: { id: true, name: true } } },
      });
      sendJson(response, 200, {
        user: {
          ...publicUser(user),
          supervisingTeacherId: user.supervisingTeacher?.id ?? null,
          supervisingTeacher: user.supervisingTeacher?.name ?? null,
        },
      });
    } catch (error) {
      if (
        error && typeof error === "object" && "code" in error &&
        error.code === "P2002"
      ) {
        sendJson(response, 409, { error: "An account with this email already exists." });
        return;
      }
      throw error;
    }
    return;
  }

  const resetPasswordMatch = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
  if (method === "POST" && resetPasswordMatch) {
    const session = await requireAdmin(request, response);
    if (!session) return;

    const userId = Number(resetPasswordMatch[1]);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendJson(response, 404, { error: "User account was not found." });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        passwordChangeRequired: true,
      },
    });
    await prisma.session.deleteMany({ where: { userId } });
    sendJson(response, 200, { temporaryPassword });
    return;
  }

  sendJson(response, 404, { error: "Route not found." });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    if (statusCode === 500) {
      console.error("Request failed:", error);
    }
    if (!response.headersSent) {
      sendJson(response, statusCode, {
        error: statusCode === 500
          ? "An unexpected server error occurred."
          : error instanceof Error
            ? error.message
            : "Request failed.",
      });
    } else {
      response.destroy();
    }
  });
});

server.listen(port, () => {
  console.log(`Harkkalogi backend listening on port ${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
