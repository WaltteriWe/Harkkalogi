import React from "react";
import Sidebar from "@/components/sidebar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar role="teacher" />
      <main className="main flex flex-col gap-6">{children}</main>
    </div>
  );
}

