"use client";

import React, { useEffect, useState, useMemo } from "react";
import { type Role } from "@/context/AuthContext";

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  supervisingTeacher: string | null;
  supervisingTeacherId: number | null;
  title: string;
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed.";
    throw new Error(message);
  }
  return body as T;
}

export default function UsersAndRolesPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [savingSupervisorId, setSavingSupervisorId] = useState<number | null>(null);

  // Form states for Add User
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");

  useEffect(() => {
    void apiRequest<{ users: ManagedUser[] }>("/api/admin/users")
      .then(({ users: loadedUsers }) => setUsers(loadedUsers))
      .catch((error: unknown) => {
        setPageError(
          error instanceof Error ? error.message : "Could not load user accounts."
        );
      });
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.supervisingTeacher && u.supervisingTeacher.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const teachers = useMemo(
    () => users.filter((user) => user.role === "teacher"),
    [users]
  );

  const handleAssignTeacher = async (student: ManagedUser, value: string) => {
    const supervisingTeacherId = value ? Number(value) : null;
    setPageError(null);
    setSavingSupervisorId(student.id);
    try {
      const result = await apiRequest<{
        student: {
          id: number;
          supervisingTeacherId: number | null;
          supervisingTeacher: string | null;
        };
      }>(`/api/admin/users/${student.id}/supervisor`, {
        method: "PATCH",
        body: JSON.stringify({ supervisingTeacherId }),
      });
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === student.id ? { ...user, ...result.student } : user
        )
      );
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not assign teacher.");
    } finally {
      setSavingSupervisorId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setPageError(null);
    try {
      await apiRequest(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(editingUser),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? editingUser : u))
      );
      setEditingUser(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not save user.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);
    try {
      const result = await apiRequest<{
        user: ManagedUser;
        temporaryPassword: string;
      }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          title: newTitle,
          email: newEmail,
          role: newRole,
        }),
      });
      setUsers((prev) => [...prev, result.user]);
      setTemporaryPassword(result.temporaryPassword);
      setNewName("");
      setNewTitle("");
      setNewEmail("");
      setNewRole("student");
      setIsAddModalOpen(false);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not create account.");
    }
  };

  const handleResetPassword = async (user: ManagedUser) => {
    setPageError(null);
    try {
      const result = await apiRequest<{ temporaryPassword: string }>(
        `/api/admin/users/${user.id}/reset-password`,
        { method: "POST" }
      );
      setTemporaryPassword(`${user.email}: ${result.temporaryPassword}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not reset password.");
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "student":
        return <span className="pill-neutral">Student</span>;
      case "teacher":
        return <span className="pill-info">Teacher</span>;
      case "admin":
        return <span className="pill-warning">Admin</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Top Right Controls */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Users and roles
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Assign supervising teachers and manage access
          </p>
        </div>

        {/* Search users & Add user aligned to top right */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="search-users" className="text-xs font-semibold text-ink">
              Search users
            </label>
            <input
              id="search-users"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or email"
              className="input py-2 text-sm w-56 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary text-sm py-2 px-4 shrink-0 font-semibold shadow-xs"
          >
            Add user
          </button>
        </div>
      </header>

      {pageError && (
        <p role="alert" className="card border-danger text-sm text-danger">
          {pageError}
        </p>
      )}
      {temporaryPassword && (
        <section className="card border-warning">
          <h2 className="font-semibold text-ink">Temporary password</h2>
          <p className="text-sm text-ink-muted mt-1">
            Share this securely with the user. It is shown only once; the user
            must change it after signing in.
          </p>
          <code className="mt-2 block break-all rounded bg-surface-muted p-3 text-sm">
            {temporaryPassword}
          </code>
          <button
            type="button"
            onClick={() => setTemporaryPassword(null)}
            className="btn-secondary mt-3 self-start text-sm"
          >
            Close
          </button>
        </section>
      )}

      {/* Main Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-1/4">Name</th>
                <th className="w-1/4">Email</th>
                <th className="w-1/6">Role</th>
                <th className="w-1/4">Supervising teacher</th>
                <th className="text-right">Account</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ink-muted">
                    {users.length === 0
                      ? "No accounts have been created yet."
                      : `No users matching "${searchQuery}"`}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-muted/30 transition-colors">
                    {/* Name */}
                    <td className="font-bold text-ink">
                      {user.name}
                    </td>

                    {/* Email */}
                    <td className="text-ink-muted text-sm">
                      {user.email}
                    </td>

                    {/* Role */}
                    <td>
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Supervising Teacher */}
                    <td>
                      {user.role === "student" ? (
                        <select
                          aria-label={`Supervising teacher for ${user.name}`}
                          value={user.supervisingTeacherId ?? ""}
                          disabled={savingSupervisorId === user.id}
                          onChange={(event) =>
                            void handleAssignTeacher(user, event.target.value)
                          }
                          className="input max-w-56 py-1.5 text-sm"
                        >
                          <option value="">Not assigned</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink-muted font-normal">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="font-semibold text-brand hover:text-brand-hover text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResetPassword(user)}
                          className="font-semibold text-brand hover:text-brand-hover text-sm"
                        >
                          Reset password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl animate-fade-in">
            <h2 className="text-lg font-bold text-ink mb-1">
              Edit User &amp; Role
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              Update account details for {editingUser.name}.
            </p>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Professional title</label>
                <input
                  type="text"
                  value={editingUser.title}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, title: e.target.value })
                  }
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const newR = e.target.value as Role;
                    setEditingUser({
                      ...editingUser,
                      role: newR,
                    });
                  }}
                  className="input text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl animate-fade-in">
            <h2 className="text-lg font-bold text-ink mb-1">Add new user</h2>
            <p className="text-xs text-ink-muted mb-4">
              Create an account. The temporary password will be shown after creation.
            </p>

            <form onSubmit={handleAddUser} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ville Hämäläinen"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Professional title</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineering Student"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  placeholder="e.g. ville.hamalainen@example.fi"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="input text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
