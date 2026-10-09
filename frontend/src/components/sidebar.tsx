"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export type Role = "student" | "teacher" | "admin";

const navByRole: Record<Role, { label: string; href: string }[]> = {
  student: [
    { label: "Overview", href: "/" },
    { label: "Reports", href: "/reports" },
    { label: "Documents", href: "/documents" },
    { label: "Messages", href: "/messages" },
  ],
  teacher: [
    { label: "Review queue", href: "/teacher-view" },
    { label: "My students", href: "/teacher-view/students" },
    { label: "Messages", href: "/messages" },
  ],
  admin: [
    { label: "Overview", href: "/admin" },
    { label: "Users and roles", href: "/admin/users" },
    { label: "Programmes", href: "/admin/programmes" },
    { label: "Settings", href: "/admin/settings" },
  ],
};

type SidebarProps = {
  role?: Role;
  userName?: string;
};

export default function Sidebar({ role, userName }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const activeRole: Role = role ?? user?.role ?? "student";
  const activeUserName = userName ?? user?.name ?? "Aino Korhonen";

  return (
    <aside className="sidebar">
      <div className="mb-6 px-3 shrink-0">
        <p className="text-xl font-bold">Harkkalogi</p>
        <p className="text-sm text-ink-inverse-muted">Internship reporting</p>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1 shrink-0">
        {navByRole[activeRole]?.map(({ label, href }) => {
          const isCurrent =
            pathname === href ||
            (href === "/reports" && (pathname === "/report" || pathname.startsWith("/report/")));

          return (
            <Link
              key={href}
              href={href}
              className="nav-item"
              aria-current={isCurrent ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="user-badge flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs tracking-wider text-ink-inverse-muted uppercase">
            {activeRole}
          </p>
          <p className="font-semibold truncate">{activeUserName}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-medium text-ink-inverse-muted hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors shrink-0"
          title="Sign out and return to login"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
