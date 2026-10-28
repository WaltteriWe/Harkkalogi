export const TOKEN_COOKIE_NAME = "harkkalogi_token";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/**
 * Stores the JWT token in a first-party cookie so that the Next.js server-side
 * proxy can inspect authentication and authorization on page requests.
 */
export function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${SEVEN_DAYS_SECONDS}; SameSite=Lax${isSecure}`;
}

/**
 * Clears the authentication cookie upon logout or token invalidation.
 */
export function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Validates a redirect target to prevent open redirect vulnerabilities.
 * Ensures the target is an internal relative path starting with a single slash.
 */
export function sanitizeRedirectPath(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return null;
}

