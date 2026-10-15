"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import AuthenticatedLayout from "@/components/authenticatedLayout";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const passwordRequired = user?.passwordChangeRequired;

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Your password has been changed.");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Could not change your password."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="app-shell">
        <Sidebar role={user?.role} />
        <main className="main flex flex-col gap-6">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-ink">My profile</h1>
            <p className="text-sm text-ink-muted mt-1">
              Your account details and password.
            </p>
          </header>

          <section className="card flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-ink">Personal details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="field-label">Name</dt>
                <dd className="text-sm text-ink">{user?.name}</dd>
              </div>
              <div>
                <dt className="field-label">Professional title</dt>
                <dd className="text-sm text-ink">{user?.title}</dd>
              </div>
              <div>
                <dt className="field-label">Email address</dt>
                <dd className="text-sm text-ink">{user?.email}</dd>
              </div>
            </dl>
          </section>

          <section className="card flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Change password</h2>
              <p className="text-sm text-ink-muted mt-1">
                Your current password is required before choosing a new one.
              </p>
            </div>
            {passwordRequired && (
              <p role="status" className="text-sm font-medium text-warning">
                Set a new password to finish activating your account.
              </p>
            )}

            <form onSubmit={handleChangePassword} className="flex max-w-lg flex-col gap-4">
              <div>
                <label htmlFor="current-password" className="field-label">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="field-label">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="input"
                />
                <p className="hint text-xs">Use at least 12 characters.</p>
              </div>
              <div>
                <label htmlFor="confirm-password" className="field-label">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="input"
                />
              </div>

              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {message && <p role="status" className="text-sm text-success">{message}</p>}

              <div className="flex items-center gap-4">
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? "Saving…" : "Change password"}
                </button>
                {!passwordRequired && (
                  <Link href="/" className="text-sm text-ink-muted hover:text-ink">
                    Cancel
                  </Link>
                )}
              </div>
            </form>
          </section>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
