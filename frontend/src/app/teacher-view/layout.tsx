import React from "react";
import Sidebar from "@/components/sidebar";
import AuthenticatedLayout from "@/components/authenticatedLayout";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout role="teacher">
      <div className="app-shell">
        <Sidebar role="teacher" />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </AuthenticatedLayout>
  );
}
