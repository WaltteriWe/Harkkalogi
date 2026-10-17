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
import {
  deleteProfileImage,
  ensureProfileImageBucket,
  getProfileImage,
  saveProfileImage,
} from "./profileStorage";

const port = Number(process.env.PORT ?? 4000);
const sessionCookieName = "harkkalogi_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const maxProfileImageBytes = 5 * 1024 * 1024;
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

type SessionUser = {
  id: number;
  email: string;
  name: string;
  title: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  supervisingTeacherId: number | null;
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

async function readRawBody(
  request: IncomingMessage,
  maxBytes: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw Object.assign(new Error("The uploaded image must be 5 MB or smaller."), {
        statusCode: 413,
      });
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function detectImageType(body: Buffer): string | null {
  if (
    body.length >= 8 &&
    body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    body.length >= 3 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    body.length >= 12 &&
    body.toString("ascii", 0, 4) === "RIFF" &&
    body.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
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

  if (method === "GET" && path === "/api/messages/recipients") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const recipients = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, role: true, title: true },
    });
    sendJson(response, 200, {
      recipients: recipients.map((recipient) => ({
        ...recipient,
        role: recipient.role.toLowerCase(),
      })),
    });
    return;
  }

  if (method === "GET" && path === "/api/messages") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantOneId: session.user.id },
          { participantTwoId: session.user.id },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        participantOne: {
          select: { id: true, name: true, email: true, role: true, title: true },
        },
        participantTwo: {
          select: { id: true, name: true, email: true, role: true, title: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = conversation.messages[0];
        const counterpart =
          conversation.participantOneId === session.user.id
            ? conversation.participantTwo
            : conversation.participantOne;
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: session.user.id },
            readAt: null,
          },
        });
        return {
          id: conversation.id,
          subject: conversation.subject,
          updatedAt: conversation.updatedAt,
          counterpart: { ...counterpart, role: counterpart.role.toLowerCase() },
          lastMessage: lastMessage
            ? {
                body: lastMessage.body,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      })
    );
    sendJson(response, 200, { conversations: result });
    return;
  }

  if (method === "POST" && path === "/api/messages") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const body = await readJson(request);
    const recipientId = body.recipientId;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.body === "string" ? body.body.trim() : "";
    if (
      typeof recipientId !== "number" ||
      !Number.isSafeInteger(recipientId) ||
      recipientId <= 0 ||
      recipientId === session.user.id
    ) {
      sendJson(response, 400, { error: "Choose a valid recipient." });
      return;
    }
    if (!subject || subject.length > 160) {
      sendJson(response, 400, { error: "Subject is required and must be at most 160 characters." });
      return;
    }
    if (!message || message.length > 5000) {
      sendJson(response, 400, { error: "Message is required and must be at most 5,000 characters." });
      return;
    }
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) {
      sendJson(response, 404, { error: "The selected recipient was not found." });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        subject,
        participantOneId: session.user.id,
        participantTwoId: recipient.id,
        messages: {
          create: { body: message, senderId: session.user.id },
        },
      },
      select: { id: true },
    });
    sendJson(response, 201, { conversationId: conversation.id });
    return;
  }

  const messageReplyMatch = path.match(/^\/api\/messages\/(\d+)\/replies$/);
  if (method === "POST" && messageReplyMatch) {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const conversationId = Number(messageReplyMatch[1]);
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participantOneId: session.user.id },
          { participantTwoId: session.user.id },
        ],
      },
      select: { id: true },
    });
    if (!conversation) {
      sendJson(response, 404, { error: "Conversation was not found." });
      return;
    }
    const body = await readJson(request);
    const message = typeof body.body === "string" ? body.body.trim() : "";
    if (!message || message.length > 5000) {
      sendJson(response, 400, { error: "Reply is required and must be at most 5,000 characters." });
      return;
    }
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId: session.user.id,
          body: message,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    sendJson(response, 201, { success: true });
    return;
  }

  const messageConversationMatch = path.match(/^\/api\/messages\/(\d+)$/);
  if (method === "GET" && messageConversationMatch) {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const conversationId = Number(messageConversationMatch[1]);
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participantOneId: session.user.id },
          { participantTwoId: session.user.id },
        ],
      },
      include: {
        participantOne: {
          select: { id: true, name: true, email: true, role: true },
        },
        participantTwo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!conversation) {
      sendJson(response, 404, { error: "Conversation was not found." });
      return;
    }
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
    const counterpart =
      conversation.participantOneId === session.user.id
        ? conversation.participantTwo
        : conversation.participantOne;
    sendJson(response, 200, {
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        counterpart: { ...counterpart, role: counterpart.role.toLowerCase() },
        messages: messages.map((item) => ({
          id: item.id,
          body: item.body,
          createdAt: item.createdAt,
          senderId: item.senderId,
          sender: { ...item.sender, role: item.sender.role.toLowerCase() },
        })),
      },
    });
    return;
  }

  if (method === "GET" && path === "/api/profile") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phoneNumber: true,
        address: true,
        bio: true,
        studyProgramme: true,
        profilePhotoUpdatedAt: true,
      },
    });
    if (!user) {
      sendJson(response, 404, { error: "User account was not found." });
      return;
    }
    sendJson(response, 200, {
      profile: {
        phoneNumber: user.phoneNumber ?? "",
        address: user.address ?? "",
        bio: user.bio ?? "",
        studyProgramme: user.studyProgramme ?? "",
        profilePhotoUrl: user.profilePhotoUpdatedAt
          ? `/api/profile/photo?v=${user.profilePhotoUpdatedAt.getTime()}`
          : null,
      },
    });
    return;
  }

  if (method === "POST" && path === "/api/profile") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    const body = await readJson(request);
    const fields = [
      ["phoneNumber", 30],
      ["address", 300],
      ["bio", 500],
      ["studyProgramme", 160],
    ] as const;
    const values: {
      phoneNumber?: string | null;
      address?: string | null;
      bio?: string | null;
      studyProgramme?: string | null;
    } = {};

    for (const [field, maxLength] of fields) {
      const value = body[field];
      if (value !== undefined && typeof value !== "string") {
        sendJson(response, 400, { error: `${field} must be text.` });
        return;
      }
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed.length > maxLength) {
        sendJson(response, 400, {
          error: `${field} must be ${maxLength} characters or fewer.`,
        });
        return;
      }
      values[field] = trimmed || null;
    }

    const profile = await prisma.user.update({
      where: { id: session.user.id },
      data: values,
      select: {
        phoneNumber: true,
        address: true,
        bio: true,
        studyProgramme: true,
        profilePhotoUpdatedAt: true,
      },
    });
    sendJson(response, 200, {
      profile: {
        phoneNumber: profile.phoneNumber ?? "",
        address: profile.address ?? "",
        bio: profile.bio ?? "",
        studyProgramme: profile.studyProgramme ?? "",
        profilePhotoUrl: profile.profilePhotoUpdatedAt
          ? `/api/profile/photo?v=${profile.profilePhotoUpdatedAt.getTime()}`
          : null,
      },
    });
    return;
  }

  if (method === "GET" && path === "/api/profile/photo") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profilePhotoUpdatedAt: true },
    });
    if (!user?.profilePhotoUpdatedAt) {
      sendJson(response, 404, { error: "No profile image has been uploaded." });
      return;
    }

    try {
      const image = await getProfileImage(session.user.id);
      if (!image.Body) {
        sendJson(response, 404, { error: "Profile image was not found." });
        return;
      }
      response.writeHead(200, {
        "Content-Type": image.ContentType ?? "application/octet-stream",
        "Content-Length": image.ContentLength,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      for await (const chunk of image.Body as AsyncIterable<Uint8Array>) {
        response.write(chunk);
      }
      response.end();
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "$metadata" in error &&
        error.$metadata && typeof error.$metadata === "object" &&
        "httpStatusCode" in error.$metadata
          ? error.$metadata.httpStatusCode
          : undefined;
      if (statusCode === 404) {
        sendJson(response, 404, { error: "Profile image was not found." });
        return;
      }
      throw error;
    }
    return;
  }

  if (method === "POST" && path === "/api/profile/photo") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }

    const body = await readRawBody(request, maxProfileImageBytes);
    const contentType = detectImageType(body);
    if (!contentType || request.headers["content-type"]?.split(";")[0] !== contentType) {
      sendJson(response, 400, {
        error: "Upload a valid PNG, JPEG, or WebP image.",
      });
      return;
    }

    await saveProfileImage(session.user.id, body, contentType);
    const profilePhotoUpdatedAt = new Date();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { profilePhotoUpdatedAt },
    });
    sendJson(response, 200, {
      profilePhotoUrl: `/api/profile/photo?v=${profilePhotoUpdatedAt.getTime()}`,
    });
    return;
  }

  if (method === "POST" && path === "/api/profile/photo/delete") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }

    await deleteProfileImage(session.user.id);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { profilePhotoUpdatedAt: null },
    });
    sendJson(response, 200, { success: true });
    return;
  }

  if (method === "POST" && path === "/api/student/reports") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    if (session.user.role !== "STUDENT") {
      sendJson(response, 403, { error: "Student access is required." });
      return;
    }
    if (!session.user.supervisingTeacherId) {
      sendJson(response, 409, {
        error: "Your supervising teacher has not been assigned yet. Ask an administrator to assign one before submitting.",
      });
      return;
    }

    const body = await readJson(request);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const period = typeof body.period === "string" ? body.period.trim() : "";
    const content =
      typeof body.tasksAndLearning === "string" ? body.tasksAndLearning.trim() : "";
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const totalHours = Number(body.totalHours);

    if (!title || title.length > 200) {
      sendJson(response, 400, { error: "Report title is required and must be at most 200 characters." });
      return;
    }
    if (!company || company.length > 200) {
      sendJson(response, 400, { error: "Company is required and must be at most 200 characters." });
      return;
    }
    if (!period || period.length > 160) {
      sendJson(response, 400, { error: "Internship period is required and must be at most 160 characters." });
      return;
    }
    if (!content || content.length > 20_000) {
      sendJson(response, 400, { error: "Report details are required and must be at most 20,000 characters." });
      return;
    }
    if (!Number.isSafeInteger(totalHours) || totalHours <= 0 || totalHours > 100_000) {
      sendJson(response, 400, { error: "Total hours must be a positive whole number." });
      return;
    }
    if (!clientId || clientId.length > 80) {
      sendJson(response, 400, { error: "The report identifier is invalid." });
      return;
    }

    const teacher = await prisma.user.findUnique({
      where: { id: session.user.supervisingTeacherId },
      select: { id: true, role: true },
    });
    if (!teacher || teacher.role !== "TEACHER") {
      sendJson(response, 409, {
        error: "Your supervising teacher is unavailable. Ask an administrator to check the assignment.",
      });
      return;
    }

    const savedReport = await prisma.$transaction(async (transaction) => {
      let internship = await transaction.internship.findFirst({
        where: { studentId: session.user.id, company },
        orderBy: { startDate: "desc" },
      });
      if (internship) {
        internship = await transaction.internship.update({
          where: { id: internship.id },
          data: { teacherId: teacher.id },
        });
      } else {
        internship = await transaction.internship.create({
          data: {
            company,
            startDate: new Date(),
            studentId: session.user.id,
            teacherId: teacher.id,
          },
        });
      }

      const existing = await transaction.report.findFirst({
        where: { internshipId: internship.id, clientId },
        include: {
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      if (
        existing?.status === "REVIEWED" &&
        existing.reviews[0]?.decision === "APPROVED"
      ) {
        throw Object.assign(new Error("An approved report cannot be changed."), {
          statusCode: 409,
        });
      }

      const data = {
        title,
        content,
        period,
        totalHours,
        status: "SUBMITTED" as const,
        submittedAt: new Date(),
      };
      return existing
        ? transaction.report.update({ where: { id: existing.id }, data })
        : transaction.report.create({
            data: { ...data, internshipId: internship.id, clientId },
          });
    });

    sendJson(response, 200, {
      report: {
        id: savedReport.id,
        clientId: savedReport.clientId,
        status: savedReport.status.toLowerCase(),
        submittedAt: savedReport.submittedAt,
      },
    });
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

  if (method === "GET" && path === "/api/teacher/reports") {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    if (session.user.role !== "TEACHER") {
      sendJson(response, 403, { error: "Teacher access is required." });
      return;
    }

    const reports = await prisma.report.findMany({
      where: {
        status: { in: ["SUBMITTED", "REVIEWED"] },
        internship: {
          student: { supervisingTeacherId: session.user.id },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        internship: {
          include: {
            student: {
              select: { id: true, name: true, title: true, studyProgramme: true },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { teacher: { select: { name: true } } },
        },
      },
    });

    sendJson(response, 200, {
      reports: reports.map((report) => {
        const review = report.reviews[0];
        const status =
          report.status === "SUBMITTED"
            ? "needs_review"
            : review?.decision === "APPROVED"
              ? "approved"
              : review?.decision === "NEEDS_CHANGES"
                ? "changes_requested"
                : "reviewed";
        return {
          id: String(report.id),
          student: report.internship.student.name,
          programme:
            report.internship.student.studyProgramme ||
            report.internship.student.title,
          title: report.title,
          company: report.internship.company,
          period: report.period,
          submittedDate: report.submittedAt?.toLocaleDateString("fi-FI") ?? "",
          hours: report.totalHours,
          content: report.content,
          status,
          feedback: review?.comment ?? null,
        };
      }),
    });
    return;
  }

  const reviewReportMatch = path.match(/^\/api\/teacher\/reports\/(\d+)\/review$/);
  if (method === "PATCH" && reviewReportMatch) {
    const session = await getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Sign in to continue." });
      return;
    }
    if (session.user.role !== "TEACHER") {
      sendJson(response, 403, { error: "Teacher access is required." });
      return;
    }

    const reportId = Number(reviewReportMatch[1]);
    const body = await readJson(request);
    const decision = body.decision;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (decision !== "APPROVED" && decision !== "NEEDS_CHANGES") {
      sendJson(response, 400, { error: "Choose an approval or request changes decision." });
      return;
    }
    if (comment.length > 3000) {
      sendJson(response, 400, { error: "Feedback must be 3,000 characters or fewer." });
      return;
    }
    if (decision === "NEEDS_CHANGES" && !comment) {
      sendJson(response, 400, { error: "Add feedback before requesting changes." });
      return;
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { internship: { include: { student: true } } },
    });
    if (!report || report.internship.student.supervisingTeacherId !== session.user.id) {
      sendJson(response, 404, { error: "Report was not found for your assigned students." });
      return;
    }
    if (report.status !== "SUBMITTED") {
      sendJson(response, 409, { error: "This report is no longer waiting for review." });
      return;
    }

    await prisma.$transaction([
      prisma.review.create({
        data: {
          reportId,
          teacherId: session.user.id,
          decision,
          comment: comment || "Report approved.",
        },
      }),
      prisma.report.update({
        where: { id: reportId },
        data: { status: "REVIEWED" },
      }),
    ]);
    sendJson(response, 200, { success: true });
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

void ensureProfileImageBucket()
  .then(() => {
    server.listen(port, () => {
      console.log(`Harkkalogi backend listening on port ${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Could not initialize profile image storage:", error);
    process.exitCode = 1;
  });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
