"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type Role } from "@/context/AuthContext";

export default function AuthenticatedLayout({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const hasRequiredRole = !role || user?.role === role;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.passwordChangeRequired && pathname !== "/profile") {
      router.replace("/profile");
      return;
    }
    if (!hasRequiredRole) {
      router.replace(
        user.role === "admin"
          ? "/admin"
          : user.role === "teacher"
            ? "/teacher-view"
            : "/"
      );
    }
  }, [hasRequiredRole, isLoading, pathname, router, user]);

  if (
    isLoading ||
    !user ||
    (user.passwordChangeRequired && pathname !== "/profile") ||
    !hasRequiredRole
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Loading account…
      </main>
    );
  }

  return children;
}
