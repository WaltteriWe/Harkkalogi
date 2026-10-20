import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_COOKIE_NAME } from "./lib/auth-cookie";
import { getLandingPath, isRouteAllowedForRole } from "./lib/auth-routes";

interface JwtPayload {
  userId: number;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  exp?: number;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "super-secret-jwt-key-for-development-harkkalogi";

function base64UrlToBytes(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cryptographically verifies an HMAC-SHA256 JWT using the native Web Crypto API.
 * Returns the decoded payload if valid and not expired, or null if invalid or tampered.
 */
async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 1. Import secret key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // 2. Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToBytes(signatureB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      data
    );
    if (!isValid) return null;

    // 3. Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload: JwtPayload = JSON.parse(payloadJson);

    // 4. Verify expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
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

  // Unauthenticated or token invalid/expired
  if (!payload) {
    if (isLoginPage) {
      return NextResponse.next();
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

  // Authenticated user
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
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
