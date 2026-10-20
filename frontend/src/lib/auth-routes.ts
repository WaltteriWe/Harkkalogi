export type Role = "student" | "teacher" | "admin";

export const ROLE_LANDING_PATHS: Record<Role, string> = {
  student: "/",
  teacher: "/teacher-view",
  admin: "/admin",
};

/**
 * Returns the default landing path for a given role, falling back to "/" for unknown roles.
 */
export function getLandingPath(role?: string | null): string {
  if (role === "teacher") return ROLE_LANDING_PATHS.teacher;
  if (role === "admin") return ROLE_LANDING_PATHS.admin;
  return ROLE_LANDING_PATHS.student;
}

/**
 * Single Source of Truth for Role-Based Access Control.
 * Determines whether a user with a given role is allowed to access the specified route path.
 */
export function isRouteAllowedForRole(role: Role | string, path: string): boolean {
  if (role === "student") {
    return (
      path === "/" ||
      path === "/reports" ||
      path.startsWith("/report") ||
      path.startsWith("/documents") ||
      path.startsWith("/messages")
    );
  }
  if (role === "teacher") {
    return (
      path === "/teacher-view" ||
      path.startsWith("/teacher-view/") ||
      path.startsWith("/messages")
    );
  }
  if (role === "admin") {
    return path === "/admin" || path.startsWith("/admin/");
  }
  return false;
}

