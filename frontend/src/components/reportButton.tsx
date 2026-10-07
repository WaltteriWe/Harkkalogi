"use client";

import Link from "next/link";
import { useReport } from "../context/ReportContext";

export default function ReportButton() {
  const { report } = useReport();

  return (
    <Link href="/reporting" className="btn-primary">
      {report.status === "submitted" ? "View final report" : "Write final report"}
    </Link>
  );
}
