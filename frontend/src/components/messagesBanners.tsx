"use client";

import React from "react";

export interface MessagesBannersProps {
  isStudent: boolean;
  hasSupervisor: boolean;
  isLoading: boolean;
  error: string | null;
  onRefreshInbox?: () => void;
}

export default function MessagesBanners({
  isStudent,
  hasSupervisor,
  isLoading,
  error,
  onRefreshInbox,
}: MessagesBannersProps) {
  return (
    <>
      {/* Warning banner when student has no supervisor assigned */}
      {isStudent && !hasSupervisor && !isLoading && (
        <div className="rounded-control border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <svg
              className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Supervisor not assigned</span>
          </div>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            You do not currently have a supervising teacher assigned to your internship. Sending messages and replying is disabled until a supervisor is assigned.
          </p>
        </div>
      )}

      {/* Error banner if fetching failed */}
      {error && (
        <div className="rounded-control border border-danger/30 bg-danger-soft/20 p-4 text-danger flex items-center justify-between">
          <p className="text-sm font-medium">{error}</p>
          {onRefreshInbox && (
            <button
              type="button"
              onClick={onRefreshInbox}
              className="btn-secondary text-xs py-1 px-3"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </>
  );
}
