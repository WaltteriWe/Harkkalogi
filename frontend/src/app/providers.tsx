"use client";

import React, { type ReactNode } from "react";
import { ReportProvider } from "../context/ReportContext";
import { PlanProvider } from "../context/PlanContext";
import { AuthProvider } from "../context/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ReportProvider>
        <PlanProvider>{children}</PlanProvider>
      </ReportProvider>
    </AuthProvider>
  );
}

