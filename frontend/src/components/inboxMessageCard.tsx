"use client";

import React from "react";

export type RoleType = "Supervising teacher" | "Workplace supervisor" | "Coordinator";

export interface ThreadReply {
  id: string;
  sender: string;
  role: string;
  body: string;
  date: string;
}

export interface MessageItem {
  id: string;
  subject: string;
  sender: string;
  senderRole: RoleType;
  senderEmail: string;
  date: string;
  read: boolean;
  body: string;
  attachments?: { name: string; size: string }[];
  replies?: ThreadReply[];
}

export function getRolePill(role: RoleType) {
  switch (role) {
    case "Supervising teacher":
      return <span className="pill-info">{role}</span>;
    case "Workplace supervisor":
      return <span className="pill-success">{role}</span>;
    case "Coordinator":
      return <span className="pill-warning">{role}</span>;
    default:
      return <span className="pill-neutral">{role}</span>;
  }
}

export interface InboxMessageCardProps {
  message: MessageItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function InboxMessageCard({
  message,
  isSelected,
  onSelect,
}: InboxMessageCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(message.id)}
      className={`group w-full rounded-control p-3.5 text-left transition-all border ${
        isSelected
          ? "border-brand bg-brand-soft/20 ring-1 ring-brand/30"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted/60"
      }`}
    >
      {/* Subject visible first, with unread indicator & timestamp */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!message.read && (
            <span
              className="size-2 rounded-full bg-brand shrink-0"
              title="Unread"
              aria-label="Unread message"
            />
          )}
          <p
            className={`truncate text-sm font-semibold ${
              isSelected ? "text-brand-ink" : "text-ink"
            }`}
          >
            {message.subject}
          </p>
        </div>
        <span className="meta tabular text-xs shrink-0">
          {message.date}
        </span>
      </div>

      {/* Sender name and Role Badge */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-medium text-ink">
          {message.sender}
        </span>
        <span className="text-ink-subtle">·</span>
        {getRolePill(message.senderRole)}
      </div>

      {/* Snippet / preview */}
      <p className="meta mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {message.body.replace(/\n+/g, " ")}
      </p>
    </button>
  );
}

