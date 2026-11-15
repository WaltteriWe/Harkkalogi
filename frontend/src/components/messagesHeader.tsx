"use client";

import React from "react";

export interface MessagesHeaderProps {
  isStudent: boolean;
  canSendMessage: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCompose: () => void;
}

export default function MessagesHeader({
  isStudent,
  canSendMessage,
  searchQuery,
  onSearchChange,
  onOpenCompose,
}: MessagesHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1>Messages</h1>
        <p className="meta mt-1 text-base">
          {isStudent
            ? "Communicate with your supervising teacher"
            : "Communicate with your supervised students"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* New message compose button */}
        <button
          type="button"
          onClick={onOpenCompose}
          disabled={!canSendMessage}
          className={`btn-primary flex items-center justify-center gap-2 text-sm ${
            !canSendMessage ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={!canSendMessage ? "Supervisor not assigned" : "Start a new conversation"}
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New message</span>
        </button>

        {/* Search box */}
        <div className="relative w-full sm:w-72">
          <label htmlFor="message-search" className="sr-only">
            Search messages
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-subtle">
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="message-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages..."
              className="input pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-subtle hover:text-ink text-sm"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
