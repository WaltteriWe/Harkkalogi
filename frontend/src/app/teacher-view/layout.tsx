import React from "react";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/protectedRoute";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <div className="app-shell">
        <Sidebar role="teacher" />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

