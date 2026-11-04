import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../app.ts";
import { prisma } from "../lib/prisma.ts";

export interface TestResponse<T = any> {
  status: number;
  headers: Headers;
  body: T;
  rawText: string;
}

export interface TestServer {
  baseUrl: string;
  request: {
    get: (path: string, options?: { headers?: Record<string, string> }) => Promise<TestResponse>;
    post: (path: string, body?: any, options?: { headers?: Record<string, string> }) => Promise<TestResponse>;
    patch: (path: string, body?: any, options?: { headers?: Record<string, string> }) => Promise<TestResponse>;
    delete: (path: string, options?: { headers?: Record<string, string> }) => Promise<TestResponse>;
  };
  close: () => Promise<void>;
}

export interface TestUserSession {
  id: number;
  email: string;
  name: string;
  role: string;
  token: string;
  authHeaders: { Authorization: string };
}

export const TEST_CREDENTIALS = {
  aino: {
    email: "aino.korhonen@metropolia.fi",
    password: "password123",
  },
  ville: {
    email: "ville.virtanen@metropolia.fi",
    password: "password123",
  },
  mikko: {
    email: "mikko.laine@metropolia.fi",
    password: "password123",
  },
  hanna: {
    email: "hanna.ope@metropolia.fi",
    password: "password123",
  },
  admin: {
    email: "admin@metropolia.fi",
    password: "password123",
  },
};

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Logs in a user through the real HTTP POST /api/auth/login endpoint flow
 * without any mock or out-of-band JWT signing.
 */
export async function loginAs(
  server: TestServer,
  email: string,
  password = "password123"
): Promise<TestUserSession> {
  const res = await server.request.post("/api/auth/login", { email, password });
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(
      `loginAs failed for ${email}: status ${res.status}, body: ${JSON.stringify(res.body)}`
    );
  }

  return {
    id: res.body.user.id,
    email: res.body.user.email,
    name: res.body.user.name,
    role: res.body.user.role,
    token: res.body.token,
    authHeaders: authHeader(res.body.token),
  };
}

/**
 * Authenticates all project test users through the real HTTP login flow.
 */
export async function getTestUsers(server: TestServer): Promise<{
  aino: TestUserSession;
  ville: TestUserSession;
  mikko: TestUserSession;
  hanna: TestUserSession;
  admin: TestUserSession;
}> {
  const [aino, ville, mikko, hanna, admin] = await Promise.all([
    loginAs(server, TEST_CREDENTIALS.aino.email, TEST_CREDENTIALS.aino.password),
    loginAs(server, TEST_CREDENTIALS.ville.email, TEST_CREDENTIALS.ville.password),
    loginAs(server, TEST_CREDENTIALS.mikko.email, TEST_CREDENTIALS.mikko.password),
    loginAs(server, TEST_CREDENTIALS.hanna.email, TEST_CREDENTIALS.hanna.password),
    loginAs(server, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password),
  ]);

  return { aino, ville, mikko, hanna, admin };
}

export async function cleanupTestArtifacts() {
  try {
    await prisma.message.deleteMany({
      where: {
        OR: [
          { subject: { startsWith: "[TEST]" } },
          { body: { startsWith: "[TEST]" } },
        ],
      },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

async function makeRequest(
  method: string,
  baseUrl: string,
  path: string,
  payload?: any,
  customHeaders?: Record<string, string>
): Promise<TestResponse> {
  const headers: Record<string, string> = { ...(customHeaders ?? {}) };
  let reqBody: string | undefined;

  if (payload !== undefined) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    reqBody = typeof payload === "string" ? payload : JSON.stringify(payload);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: reqBody,
  });

  const rawText = await res.text();
  let parsedJson: any = null;
  try {
    parsedJson = rawText ? JSON.parse(rawText) : null;
  } catch {
    // raw text / not JSON
  }

  return {
    status: res.status,
    headers: res.headers,
    body: parsedJson,
    rawText,
  };
}

export async function setupTestServer(): Promise<TestServer> {
  process.env.NODE_ENV = "test";
  const app = createApp();
  const server: Server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}`;

  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
  };

  const request = {
    get: (path: string, options?: { headers?: Record<string, string> }) =>
      makeRequest("GET", baseUrl, path, undefined, options?.headers),
    post: (path: string, body?: any, options?: { headers?: Record<string, string> }) =>
      makeRequest("POST", baseUrl, path, body, options?.headers),
    patch: (path: string, body?: any, options?: { headers?: Record<string, string> }) =>
      makeRequest("PATCH", baseUrl, path, body, options?.headers),
    delete: (path: string, options?: { headers?: Record<string, string> }) =>
      makeRequest("DELETE", baseUrl, path, undefined, options?.headers),
  };

  return { baseUrl, request, close };
}
