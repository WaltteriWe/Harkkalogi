"use client";

import React, { type ReactNode } from "react";
import { ReportProvider } from "../context/ReportContext";
import { AuthProvider } from "../context/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ReportProvider>{children}</ReportProvider>
    </AuthProvider>
  );
}

