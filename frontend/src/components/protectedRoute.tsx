"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/lib/auth-routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  const roleAllowed =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    (user !== null && allowedRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      const redirectUrl =
        pathname !== "/" ? `/login?from=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
      return;
    }

    if (!roleAllowed) {
      router.replace(user.landingPath || "/");
    }
  }, [isLoading, isAuthenticated, user, pathname, router, roleAllowed]);

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

  if (!isAuthenticated || !user || !roleAllowed) {
    return null;
  }

  return <>{children}</>;
}
