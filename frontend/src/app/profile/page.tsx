"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import AuthenticatedLayout from "@/components/authenticatedLayout";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  phoneNumber: string;
  address: string;
  bio: string;
  studyProgramme: string;
  profilePhotoUrl: string | null;
};

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const emptyProfile: Profile = {
  phoneNumber: "",
  address: "",
  bio: "",
  studyProgramme: "",
  profilePhotoUrl: null,
};

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body &&
    typeof body.error === "string"
    ? body.error
    : "The request could not be completed.";
}

export default function ProfilePage() {
  const { user, isLoading, changePassword } = useAuth();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const passwordRequired = user?.passwordChangeRequired;

  useEffect(() => {
    if (!user) return;
    let active = true;
    void fetch(`${backendUrl}/api/profile`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return response.json() as Promise<{ profile: Profile }>;
      })
      .then(({ profile: savedProfile }) => {
        if (active) setProfile(savedProfile);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setProfileError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your profile."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);
    try {
      const response = await fetch(`${backendUrl}/api/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: profile.phoneNumber,
          address: profile.address,
          bio: profile.bio,
          studyProgramme: profile.studyProgramme,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { profile: Profile };
      setProfile(result.profile);
      setProfileMessage("Your profile details have been saved.");
    } catch (saveError) {
      setProfileError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your profile."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setPhotoMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("The image must be 5 MB or smaller.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPhotoError("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    setIsSavingPhoto(true);
    try {
      const response = await fetch(`${backendUrl}/api/profile/photo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { profilePhotoUrl: string };
      setProfile((current) => ({ ...current, profilePhotoUrl: result.profilePhotoUrl }));
      setPhotoMessage("Your profile photo has been updated.");
    } catch (uploadError) {
      setPhotoError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload your profile photo."
      );
    } finally {
      setIsSavingPhoto(false);
    }
  }

  async function handleDeletePhoto() {
    setPhotoError(null);
    setPhotoMessage(null);
    setIsSavingPhoto(true);
    try {
      const response = await fetch(`${backendUrl}/api/profile/photo/delete`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await readError(response));
      setProfile((current) => ({ ...current, profilePhotoUrl: null }));
      setPhotoMessage("Your profile photo has been removed.");
    } catch (deleteError) {
      setPhotoError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not remove your profile photo."
      );
    } finally {
      setIsSavingPhoto(false);
    }
  }

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

  if (isLoading) return null;

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

          <section className="card flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-ink">Personal details</h2>
              <p className="text-sm text-ink-muted mt-1">
                Add contact information and details about your studies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {profile.profilePhotoUrl ? (
                <Image
                  src={`${backendUrl}${profile.profilePhotoUrl}`}
                  alt={`${user?.name ?? "Your"} profile`}
                  width={88}
                  height={88}
                  unoptimized
                  className="h-[88px] w-[88px] rounded-full object-cover"
                />
              ) : (
                <div
                  aria-label="No profile photo"
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-surface-muted text-2xl font-semibold text-ink-muted"
                >
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex flex-col items-start gap-2">
                <label className="btn-secondary cursor-pointer">
                  {isSavingPhoto ? "Uploading…" : "Choose profile photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    disabled={isSavingPhoto}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-ink-muted">PNG, JPEG, or WebP; maximum 5 MB.</p>
                {profile.profilePhotoUrl && (
                  <button
                    type="button"
                    disabled={isSavingPhoto}
                    onClick={() => void handleDeletePhoto()}
                    className="text-sm text-danger hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            {photoError && <p role="alert" className="text-sm text-danger">{photoError}</p>}
            {photoMessage && <p role="status" className="text-sm text-success">{photoMessage}</p>}

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

            <form onSubmit={handleSaveProfile} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-phone" className="field-label">Phone number</label>
                <input
                  id="profile-phone"
                  type="tel"
                  maxLength={30}
                  value={profile.phoneNumber}
                  onChange={(event) =>
                    setProfile({ ...profile, phoneNumber: event.target.value })
                  }
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="profile-programme" className="field-label">Study programme</label>
                <input
                  id="profile-programme"
                  maxLength={160}
                  value={profile.studyProgramme}
                  onChange={(event) =>
                    setProfile({ ...profile, studyProgramme: event.target.value })
                  }
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="profile-address" className="field-label">Address</label>
                <input
                  id="profile-address"
                  maxLength={300}
                  value={profile.address}
                  onChange={(event) =>
                    setProfile({ ...profile, address: event.target.value })
                  }
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="profile-bio" className="field-label">About me</label>
                <textarea
                  id="profile-bio"
                  maxLength={500}
                  rows={4}
                  value={profile.bio}
                  onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                  className="input"
                />
                <p className="hint text-xs">{profile.bio.length}/500 characters</p>
              </div>
              {profileError && (
                <p role="alert" className="text-sm text-danger sm:col-span-2">{profileError}</p>
              )}
              {profileMessage && (
                <p role="status" className="text-sm text-success sm:col-span-2">{profileMessage}</p>
              )}
              <div className="sm:col-span-2">
                <button type="submit" disabled={isSavingProfile} className="btn-primary">
                  {isSavingProfile ? "Saving…" : "Save personal details"}
                </button>
              </div>
            </form>
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
