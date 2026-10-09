"use client";

import React, { useState } from "react";
import { useAuth, MOCK_USER_LIST } from "@/context/AuthContext";
import { Role } from "@/components/sidebar";

export default function LoginPage() {
  const { login, quickLogin, user: currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("password123");
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "teacher":
        return <span className="pill-info">Teacher</span>;
      case "admin":
        return <span className="pill-warning">Admin</span>;
      case "student":
      default:
        return <span className="pill-neutral">Student</span>;
    }
  };

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
              Select an account mode or type your email to switch roles.
            </p>
          </div>

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
                {MOCK_USER_LIST.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </datalist>

              {/* Email quick-fill suggestion chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-subtle">Suggestions:</span>
                {MOCK_USER_LIST.map((u) => (
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
              <p className="hint text-xs">
                Prototype preview mode: any password is accepted.
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
              {MOCK_USER_LIST.map((u) => {
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
                      onClick={() => quickLogin(u.role)}
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
          Role modes switch the sidebar navigation and routes without backend API calls.
        </p>
      </div>
    </div>
  );
}
