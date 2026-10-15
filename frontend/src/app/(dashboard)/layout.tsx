import React from "react";
import Sidebar from "@/components/sidebar";
import AuthenticatedLayout from "@/components/authenticatedLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout role="student">
      <div className="app-shell">
        <Sidebar />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </AuthenticatedLayout>
  );
}
