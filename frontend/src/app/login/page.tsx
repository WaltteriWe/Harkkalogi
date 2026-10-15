"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Sign-in failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold tracking-tight text-ink">Harkkalogi</p>
          <p className="text-sm text-ink-muted mt-1">Internship reporting</p>
        </div>

        <div className="card shadow-sm">
          {user && !isLoading ? (
            <>
              <h1 className="text-xl font-bold text-ink">You are signed in</h1>
              <p className="text-sm text-ink-muted mt-2">
                {user.name} · {user.title} · {user.email}
              </p>
              <Link className="btn-primary mt-5 inline-flex" href="/profile">
                View my profile
              </Link>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-ink">Sign in</h1>
                <p className="text-sm text-ink-muted mt-1">
                  Use the account details provided by your support person.
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
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.fi"
                    className="input"
                    autoComplete="username"
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
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="input"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full mt-2"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <div className="mt-6 border-t border-border pt-4 text-sm text-ink-muted">
                <p>
                  Need an account? Ask your support person to create one for you.
                </p>
                <p className="mt-2">
                  Forgot your password? Contact your support person to reset it.
                  They will provide a temporary password, and you will be asked
                  to set a new one after signing in.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
