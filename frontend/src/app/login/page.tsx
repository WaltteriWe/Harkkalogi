"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLoginForm } from "@/hooks/useLoginForm";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(user.landingPath || "/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  const {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    errorMessage,
    handleSubmit,
  } = useLoginForm();

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold tracking-tight text-ink">Harkkalogi</p>
          <p className="text-sm text-ink-muted mt-1">Internship reporting</p>
        </div>

        {/* Login card */}
        <div className="card shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-ink">Sign in</h1>
            <p className="text-sm text-ink-muted mt-1">
              Enter your credentials to access your account.
            </p>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div
              className="mb-4 p-3 rounded-control border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-center justify-between"
              role="alert"
            >
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@metropolia.fi"
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
