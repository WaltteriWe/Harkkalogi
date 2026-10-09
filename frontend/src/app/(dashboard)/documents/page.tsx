"use client";

import React, { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useReport } from "@/context/ReportContext";
import DocumentTemplateCard, {
  type DocumentTemplate,
} from "@/components/documentTemplateCard";

interface DocumentItem {
  id: string;
  name: string;
  category: "Agreement" | "Plan" | "Work certificate" | "Final report" | "Other";
  date: string;
  size: string;
  status: "Approved" | "Uploaded" | "Under review" | "Draft" | "Uploading";
  canDelete?: boolean;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    name: "Harjoittelusopimus.pdf",
    category: "Agreement",
    date: "28.5.2026",
    size: "1.4 MB",
    status: "Approved",
    canDelete: false,
  },
  {
    id: "doc-2",
    name: "Harjoittelusuunnitelma.pdf",
    category: "Plan",
    date: "12.5.2026",
    size: "820 KB",
    status: "Approved",
    canDelete: false,
  },
];

const TEMPLATES: DocumentTemplate[] = [
  {
    name: "Internship plan template.docx",
    category: "Planning",
    description: "Official form for defining internship tasks and learning goals.",
    format: "DOCX",
    size: "48 KB",
  },
  {
    name: "Evaluation criteria and guidelines.pdf",
    category: "Guidelines",
    description: "Grading rubrics, assessment guidelines and student obligations.",
    format: "PDF",
    size: "1.2 MB",
  },
  {
    name: "Weekly hours log sheet.xlsx",
    category: "Hours tracking",
    description: "Spreadsheet template for tracking daily work hours.",
    format: "XLSX",
    size: "34 KB",
  },
];

export default function DocumentsPage() {
  const { report, addAttachment } = useReport();
  const [extraDocs, setExtraDocs] = useState<DocumentItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const now = new Date();
      const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;

      const newDoc: DocumentItem = {
        id: `extra-doc-${Date.now()}`,
        name: file.name,
        category: file.name.toLowerCase().includes("todistus")
          ? "Work certificate"
          : "Other",
        date: dateStr,
        size: sizeStr,
        status: "Uploaded",
        canDelete: true,
      };

      setExtraDocs((prev) => [newDoc, ...prev]);

      // If it looks like a certificate, also register to report context
      if (file.name.toLowerCase().includes("todistus")) {
        addAttachment(file.name, sizeStr);
      }

      showNotification(`Document "${file.name}" uploaded successfully.`);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    setExtraDocs((prev) => prev.filter((d) => d.id !== id));
    showNotification("Document removed.");
  };

  const handleDownload = (fileName: string) => {
    showNotification(`Downloading "${fileName}"...`);
  };

  // Combine default documents, extra uploaded documents, and attachments from report context
  const reportAttachments: DocumentItem[] = report.attachments
    .filter(
      (att) =>
        !DEFAULT_DOCUMENTS.some((d) => d.name === att.name) &&
        !extraDocs.some((d) => d.name === att.name)
    )
    .map((att) => ({
      id: att.id,
      name: att.name,
      category: "Work certificate",
      date: "Today",
      size: att.size || "840 KB",
      status: att.status,
      canDelete: true,
    }));

  const finalReportDoc: DocumentItem = {
    id: "doc-final-report",
    name: "Final_internship_report.pdf",
    category: "Final report",
    date: report.submittedAt || (report.lastSavedAt ? `Draft (${report.lastSavedAt})` : "Not submitted"),
    size: "240 KB",
    status: report.status === "submitted" ? "Under review" : "Draft",
    canDelete: false,
  };

  const allDocuments: DocumentItem[] = [
    ...DEFAULT_DOCUMENTS,
    ...extraDocs,
    ...reportAttachments,
    finalReportDoc,
  ];

  return (
    <>
      {/* Header Section */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Documents</h1>
            <p className="meta mt-1 text-base">
              Official agreements, certificates and downloadable internship templates
            </p>
          </div>

          <div>
            <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
              <svg
                className="size-4 stroke-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>+ Upload document</span>
              <input
                type="file"
                className="sr-only"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg"
              />
            </label>
          </div>
        </header>

        {/* Notification Toast */}
        {notification && (
          <div className="rounded-control bg-surface-muted border border-border px-4 py-3 text-sm text-ink transition-all">
            {notification}
          </div>
        )}

        {/* My Internship Documents */}
        <section className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2>My internship documents</h2>
            <span className="meta text-xs">
              {allDocuments.length} files
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-muted border border-border text-ink-muted">
                          <svg
                            className="size-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-ink text-sm">
                            {doc.name}
                          </p>
                          <p className="meta text-xs tabular">{doc.size}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-ink">{doc.category}</span>
                    </td>
                    <td>
                      <span className="meta tabular text-sm">{doc.date}</span>
                    </td>
                    <td>
                      {doc.status === "Approved" || doc.status === "Uploaded" ? (
                        <span className="pill-success">{doc.status}</span>
                      ) : doc.status === "Under review" ? (
                        <span className="pill-info">{doc.status}</span>
                      ) : (
                        <span className="pill-neutral">{doc.status}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {doc.category === "Final report" ? (
                          <Link href="/report" className="link text-sm">
                            Edit report →
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.name)}
                            className="btn-secondary py-1.5 px-3 text-xs"
                          >
                            Download
                          </button>
                        )}

                        {doc.canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="text-ink-subtle hover:text-danger text-sm px-1.5 py-1 transition-colors"
                            title="Remove document"
                            aria-label={`Remove ${doc.name}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Official Guidelines & Templates */}
        <section className="card flex flex-col gap-4">
          <div>
            <h2>Official guidelines &amp; templates</h2>
            <p className="meta mt-1 text-sm">
              Approved resources and blank forms provided by the institution
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {TEMPLATES.map((tmpl) => (
              <DocumentTemplateCard
                key={tmpl.name}
                template={tmpl}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </section>
    </>
  );
}
