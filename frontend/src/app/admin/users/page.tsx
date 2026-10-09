"use client";

import React, { useState, useMemo } from "react";
import { Role } from "@/components/sidebar";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  supervisingTeacher: string | null;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: "usr-1",
    name: "Aino Korhonen",
    email: "aino.korhonen@example.fi",
    role: "student",
    supervisingTeacher: "Mikko Laine",
  },
  {
    id: "usr-2",
    name: "Linnea Berg",
    email: "linnea.berg@example.fi",
    role: "student",
    supervisingTeacher: "Hanna Peltonen",
  },
  {
    id: "usr-3",
    name: "Aleksi Virtanen",
    email: "aleksi.virtanen@example.fi",
    role: "student",
    supervisingTeacher: null, // "Not assigned"
  },
  {
    id: "usr-4",
    name: "Oskari Nurmi",
    email: "oskari.nurmi@example.fi",
    role: "student",
    supervisingTeacher: "Hanna Peltonen",
  },
  {
    id: "usr-5",
    name: "Mikko Laine",
    email: "mikko.laine@example.fi",
    role: "teacher",
    supervisingTeacher: null,
  },
  {
    id: "usr-6",
    name: "Hanna Peltonen",
    email: "hanna.peltonen@example.fi",
    role: "teacher",
    supervisingTeacher: null,
  },
  {
    id: "usr-7",
    name: "Riikka Aalto",
    email: "riikka.aalto@example.fi",
    role: "admin",
    supervisingTeacher: null,
  },
];

const AVAILABLE_TEACHERS = ["Mikko Laine", "Hanna Peltonen"];

export default function UsersAndRolesPage() {
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Add User
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");
  const [newTeacher, setNewTeacher] = useState<string>("");

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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? editingUser : u))
    );
    setEditingUser(null);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const created: ManagedUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      supervisingTeacher:
        newRole === "student" && newTeacher ? newTeacher : null,
    };

    setUsers((prev) => [...prev, created]);
    setNewName("");
    setNewEmail("");
    setNewRole("student");
    setNewTeacher("");
    setIsAddModalOpen(false);
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
                <th className="w-16 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ink-muted">
                    No users matching &quot;{searchQuery}&quot;
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
                        user.supervisingTeacher ? (
                          <span className="text-ink font-normal">
                            {user.supervisingTeacher}
                          </span>
                        ) : (
                          <span className="font-semibold text-danger">
                            Not assigned
                          </span>
                        )
                      ) : (
                        <span className="text-ink-muted font-normal">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="font-semibold text-brand hover:text-brand-hover text-sm"
                      >
                        Edit
                      </button>
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
              Update role and supervising teacher assignment for {editingUser.name}.
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
                      supervisingTeacher:
                        newR === "student" ? editingUser.supervisingTeacher : null,
                    });
                  }}
                  className="input text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {editingUser.role === "student" && (
                <div>
                  <label className="field-label">Supervising Teacher</label>
                  <select
                    value={editingUser.supervisingTeacher || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        supervisingTeacher: e.target.value || null,
                      })
                    }
                    className="input text-sm"
                  >
                    <option value="">Not assigned</option>
                    {AVAILABLE_TEACHERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
              Create a new user account and set their role and teacher assignment.
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

              {newRole === "student" && (
                <div>
                  <label className="field-label">Supervising Teacher</label>
                  <select
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">Not assigned</option>
                    {AVAILABLE_TEACHERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

