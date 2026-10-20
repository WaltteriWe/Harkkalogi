import React from "react";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/protectedRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="app-shell">
        <Sidebar role="admin" />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

