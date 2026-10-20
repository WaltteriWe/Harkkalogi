import React from "react";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/protectedRoute";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["student", "teacher"]}>
      <div className="app-shell">
        <Sidebar />
        <main className="main flex flex-col gap-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

