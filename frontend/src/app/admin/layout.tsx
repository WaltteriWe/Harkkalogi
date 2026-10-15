import React from "react";
import Sidebar from "@/components/sidebar";
import AuthenticatedLayout from "@/components/authenticatedLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout role="admin">
      <div className="app-shell">
        <Sidebar role="admin" />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </AuthenticatedLayout>
  );
}
