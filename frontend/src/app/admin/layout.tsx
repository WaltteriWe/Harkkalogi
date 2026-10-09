import React from "react";
import Sidebar from "@/components/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar role="admin" />
      <main className="main flex flex-col gap-6">{children}</main>
    </div>
  );
}

