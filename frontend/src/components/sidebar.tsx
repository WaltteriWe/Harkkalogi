"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Role = "student" | "teacher" | "admin";

const navByRole: Record<Role, { label: string; href: string }[]> = {
  student: [
    { label: "Overview", href: "/" },
    { label: "Final report", href: "/reporting" },
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
  role: Role;
  userName: string;
};

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="mb-6 px-3">
        <p className="text-xl font-bold">Harkkalogi</p>
        <p className="text-sm text-ink-inverse-muted">Internship reporting</p>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {navByRole[role].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="nav-item"
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="user-badge">
        <p className="text-xs tracking-wider text-ink-inverse-muted uppercase">
          {role}
        </p>
        <p className="font-semibold">{userName}</p>
      </div>
    </aside>
  );
}
