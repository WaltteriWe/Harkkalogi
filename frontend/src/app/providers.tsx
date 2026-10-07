"use client";

import React, { type ReactNode } from "react";
import { ReportProvider } from "../context/ReportContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <ReportProvider>{children}</ReportProvider>;
}

