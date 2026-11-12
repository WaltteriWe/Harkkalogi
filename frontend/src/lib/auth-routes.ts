export type Role = "student" | "teacher" | "admin";

export const ROLE_LANDING_PATHS: Record<Role, string> = {
  student: "/",
  teacher: "/teacher-view",
  admin: "/admin",
};

const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  student: [
    "/reports",
    "/planning",
    "/report",
    "/documents",
    "/messages",
    "/guidance-evaluation",
  ],
  teacher: ["/teacher-view", "/messages", "/guidance-evaluation"],
  admin: ["/admin"],
};

export function isValidRole(role?: string | null): role is Role {
  return role === "student" || role === "teacher" || role === "admin";
}

export function getLandingPath(role?: string | null): string {
  if (isValidRole(role)) {
    return ROLE_LANDING_PATHS[role];
  }
  return ROLE_LANDING_PATHS.student;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isRouteAllowedForRole(role: string, path: string): boolean {
  if (!isValidRole(role)) return false;

  if (role === "student" && path === "/") {
    return true;
  }

  return ROLE_ALLOWED_PREFIXES[role].some((prefix) =>
    matchesPrefix(path, prefix),
  );
}
