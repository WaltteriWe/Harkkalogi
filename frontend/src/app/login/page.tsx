"use client";

import React from "react";
import { Role } from "@/components/sidebar";
import { useLoginForm } from "@/hooks/useLoginForm";

function getRoleBadge(role: Role) {
  switch (role) {
    case "teacher":
      return <span className="pill-info">Teacher</span>;
    case "admin":
      return <span className="pill-warning">Admin</span>;
    case "student":
    default:
      return <span className="pill-neutral">Student</span>;
  }
}

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    errorMessage,
    presets,
    currentUser,
    handleSubmit,
    handleSelectPreset,
    handleQuickLogin,
  } = useLoginForm();

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold tracking-tight text-ink">Harkkalogi</p>
          <p className="text-sm text-ink-muted mt-1">Internship reporting prototype</p>
        </div>

        {/* Login card */}
        <div className="card shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-ink">Sign in</h1>
            <p className="text-sm text-ink-muted mt-1">
              Select an account mode or enter your credentials to log in.
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
                list="preset-emails"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@metropolia.fi"
                className="input"
                autoComplete="email"
              />
              <datalist id="preset-emails">
                {presets.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </datalist>

              {/* Email quick-fill suggestion chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-subtle">Suggestions:</span>
                {presets.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectPreset(u.email)}
                    className="text-xs px-2 py-0.5 rounded-full border border-border bg-surface-muted hover:border-brand hover:text-brand transition-colors"
                  >
                    {u.role}: {u.email.split("@")[0]}
                  </button>
                ))}
              </div>
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
              />
              <p className="hint text-xs">
                Default password for test accounts is <code>password123</code>.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Quick role switcher presets */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
              1-Click Role Switcher
            </p>
            <div className="flex flex-col gap-2.5">
              {presets.map((u) => {
                const isCurrentActive = currentUser?.email === u.email;
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-control border transition-all ${
                      isCurrentActive
                        ? "border-brand bg-brand-soft/30"
                        : "border-border bg-surface-muted/50 hover:border-border-strong"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink truncate">
                          {u.name}
                        </span>
                        {getRoleBadge(u.role)}
                      </div>
                      <p className="text-xs text-ink-muted truncate mt-0.5">
                        {u.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(u.role)}
                      className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                    >
                      {isCurrentActive ? "Active" : `Switch to ${u.role}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Prototype footnote */}
        <p className="text-center text-xs text-ink-subtle mt-6">
          Role modes authenticate against the backend API and assign standard session tokens.
        </p>
      </div>
    </div>
  );
}
