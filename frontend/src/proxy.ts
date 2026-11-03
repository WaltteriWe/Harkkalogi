import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_COOKIE_NAME } from "./lib/auth-cookie";
import {
  getLandingPath,
  isRouteAllowedForRole,
  isValidRole,
} from "./lib/auth-routes";

interface JwtHeader {
  alg?: string;
  typ?: string;
}

interface JwtPayload {
  userId: number;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  exp?: number;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "super-secret-jwt-key-for-development-harkkalogi";

function base64UrlToBytes(base64Url: string): Uint8Array {
  const base64 = base64Url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(base64Url: string): T {
  const bytes = base64UrlToBytes(base64Url);
  const jsonString = new TextDecoder().decode(bytes);
  return JSON.parse(jsonString) as T;
}

/**
 * Cryptographically verifies an HMAC-SHA256 JWT using the native Web Crypto API.
 * Returns the decoded payload if valid, properly role-typed, and not expired, or null otherwise.
 */
async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 1. Verify header algorithm to prevent algorithm confusion
    const header = decodeBase64UrlJson<JwtHeader>(headerB64);
    if (header.alg !== "HS256") return null;

    // 2. Import secret key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // 3. Verify cryptographic signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToBytes(signatureB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      data,
    );
    if (!isValid) return null;

    // 4. Decode payload with UTF-8 support (handles ä, ö, å safely)
    const payload = decodeBase64UrlJson<JwtPayload>(payloadB64);

    // 5. Verify expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // 6. Verify role validity upfront to prevent redirect loops
    if (
      typeof payload.role !== "string" ||
      !isValidRole(payload.role.toLowerCase())
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login" || pathname === "/logIn";

  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const payload = tokenCookie ? await verifyJwt(tokenCookie, JWT_SECRET) : null;

  // Unauthenticated, expired, or invalid role -> clear cookie and send to /login
  if (!payload) {
    if (isLoginPage) {
      const response = NextResponse.next();
      if (tokenCookie) {
        response.cookies.delete(TOKEN_COOKIE_NAME);
      }
      return response;
    }

    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      redirectUrl.searchParams.set("from", pathname);
    }

    const response = NextResponse.redirect(redirectUrl);
    if (tokenCookie) {
      response.cookies.delete(TOKEN_COOKIE_NAME);
    }
    return response;
  }

  // Authenticated user with a guaranteed valid role ("student" | "teacher" | "admin")
  const clientRole = payload.role.toLowerCase();
  const landingPath = getLandingPath(clientRole);

  // Authenticated user attempting to visit login
  if (isLoginPage) {
    return NextResponse.redirect(new URL(landingPath, request.url));
  }

  // Role-Based Access Control check
  if (!isRouteAllowedForRole(clientRole, pathname)) {
    return NextResponse.redirect(new URL(landingPath, request.url));
  }

  return NextResponse.next();
}

// Backwards-compatible alias for Next.js middleware conventions
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.json
     * - public assets (svg, png, jpg, jpeg, gif, webp, ico, woff, woff2, ttf, txt, xml, json)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|txt|xml|json)$).*)",
  ],
};
