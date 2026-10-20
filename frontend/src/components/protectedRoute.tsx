"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/components/sidebar";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  allowedPathsForOtherRoles?: {
    roles: Role[];
    paths: string[];
  }[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowedPathsForOtherRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      const redirectUrl =
        pathname !== "/" ? `/login?from=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
      return;
    }

    if (allowedRoles && allowedRoles.includes(user.role)) {
      return;
    }

    if (allowedPathsForOtherRoles) {
      const isAllowedException = allowedPathsForOtherRoles.some(
        (rule) =>
          rule.roles.includes(user.role) &&
          rule.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
      );
      if (isAllowedException) return;
    }

    router.replace(user.landingPath || "/");
  }, [
    isLoading,
    isAuthenticated,
    user,
    pathname,
    router,
    allowedRoles,
    allowedPathsForOtherRoles,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-ink-muted">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const roleAllowed = allowedRoles?.includes(user.role);
  const pathExceptionAllowed = allowedPathsForOtherRoles?.some(
    (rule) =>
      rule.roles.includes(user.role) &&
      rule.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );

  if (!roleAllowed && !pathExceptionAllowed) {
    return null;
  }

  return <>{children}</>;
}

