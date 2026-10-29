"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { Role, getLandingPath } from "@/lib/auth-routes";

export type { Role };

const navByRole: Record<Role, { label: string; href: string }[]> = {
  student: [
    { label: "Overview", href: "/" },
    { label: "Internship plan", href: "/planning" },
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
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const activeRole: Role = role ?? user?.role ?? "student";
  const activeUserName = userName ?? user?.name ?? "User";
  const landingHref = getLandingPath(activeRole);

  // Close mobile menu whenever navigation pathname changes (handled during render per React guidelines)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent background scrolling when mobile menu overlay is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset menu open state if viewport is resized to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile Top Bar (< md) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-raised bg-sidebar px-4 text-ink-inverse md:hidden">
        <Link
          href={landingHref}
          className="flex items-center"
          onClick={() => setIsOpen(false)}
          title="Harkkalogi home"
        >
          <Image
            src="/harkkalogi-logo-reversed.svg"
            alt="Harkkalogi"
            width={132}
            height={27}
            priority
          />
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-control p-2 text-ink-inverse-muted transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          {isOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Navigation Dropdown Overlay (< md) */}
      {isOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 top-14 z-30 bg-black/60 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation"
            className="fixed inset-x-0 top-14 z-40 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-4 overflow-y-auto border-b border-sidebar-raised bg-sidebar p-4 shadow-2xl"
          >
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1 shrink-0">
              {navByRole[activeRole]?.map(({ label, href }) => {
                const isCurrent =
                  pathname === href ||
                  (href === "/reports" &&
                    (pathname === "/report" || pathname.startsWith("/report/")));

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="nav-item"
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="user-badge flex items-center justify-between gap-2 mt-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-ink-inverse-muted">
                  {activeRole}
                </p>
                <p className="truncate font-semibold">{activeUserName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-ink-inverse-muted transition-colors hover:bg-white/10 hover:text-white"
                title="Sign out and return to login"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar (>= md) */}
      <aside className="sidebar">
        <div className="mb-6 px-3 shrink-0">
          <Link href={landingHref} className="block">
            <Image
              src="/harkkalogi-logo-reversed.svg"
              alt="Harkkalogi"
              width={160}
              height={33}
              priority
            />
          </Link>
          <p className="text-sm text-ink-inverse-muted">Internship reporting</p>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1 shrink-0">
          {navByRole[activeRole]?.map(({ label, href }) => {
            const isCurrent =
              pathname === href ||
              (href === "/reports" &&
                (pathname === "/report" || pathname.startsWith("/report/")));

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
            <p className="text-xs uppercase tracking-wider text-ink-inverse-muted">
              {activeRole}
            </p>
            <p className="truncate font-semibold">{activeUserName}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-ink-inverse-muted transition-colors hover:bg-white/10 hover:text-white"
            title="Sign out and return to login"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
