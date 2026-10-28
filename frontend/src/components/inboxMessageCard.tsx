"use client";

import React from "react";
import type { ApiMessageThread } from "@/types/messages";

export function formatMessageDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;

    if (isToday) {
      return `Today, ${time}`;
    }
    if (isYesterday) {
      return `Yesterday, ${time}`;
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (year === now.getFullYear()) {
      return `${day}.${month}. ${time}`;
    }

    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

export function getRolePill(role: string) {
  const normalized = role?.toUpperCase();

  switch (normalized) {
    case "TEACHER":
    case "SUPERVISING TEACHER":
      return <span className="pill-info">{role === "TEACHER" ? "Teacher" : role}</span>;
    case "WORKPLACE SUPERVISOR":
      return <span className="pill-success">{role}</span>;
    case "COORDINATOR":
    case "ADMIN":
      return <span className="pill-warning">{role === "ADMIN" ? "Admin" : role}</span>;
    case "STUDENT":
      return <span className="pill-neutral">Student</span>;
    default:
      return <span className="pill-neutral">{role || "User"}</span>;
  }
}

export interface InboxMessageCardProps {
  thread: ApiMessageThread;
  isSelected: boolean;
  onSelect: (id: number) => void;
  currentUserId?: number;
}

export default function InboxMessageCard({
  thread,
  isSelected,
  onSelect,
  currentUserId,
}: InboxMessageCardProps) {
  const isSender = Boolean(currentUserId && thread.senderId === currentUserId);
  const otherPartyName = isSender
    ? `To: ${thread.recipient?.name || "Teacher"}`
    : thread.sender?.name || "Unknown";
  const otherPartyRole = isSender
    ? thread.recipient?.role || "TEACHER"
    : thread.sender?.role || "STUDENT";

  const isUnread = Boolean(
    (thread.unreadCount && thread.unreadCount > 0) ||
      (!thread.read && thread.recipientId === currentUserId)
  );

  const formattedDate = formatMessageDate(
    thread.lastActivityAt || thread.updatedAt || thread.createdAt
  );

  // Snippet: if there are replies, show the newest reply text preview; else root body
  const latestReply =
    thread.replies && thread.replies.length > 0
      ? thread.replies[thread.replies.length - 1]
      : null;
  const snippet = latestReply ? latestReply.body : thread.body;

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={`group w-full rounded-control p-3.5 text-left transition-all border ${
        isSelected
          ? "border-brand bg-brand-soft/20 ring-1 ring-brand/30"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted/60"
      }`}
    >
      {/* Subject line with unread indicator & timestamp */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isUnread && (
            <span
              className="size-2 rounded-full bg-brand shrink-0"
              title="Unread message"
              aria-label="Unread message"
            />
          )}
          <p
            className={`truncate text-sm font-semibold ${
              isSelected ? "text-brand-ink" : "text-ink"
            }`}
          >
            {thread.subject}
          </p>
        </div>
        <span className="meta tabular text-xs shrink-0">{formattedDate}</span>
      </div>

      {/* Other party name and Role Badge */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-medium text-ink">{otherPartyName}</span>
        <span className="text-ink-subtle">·</span>
        {getRolePill(otherPartyRole)}
        {thread.replies && thread.replies.length > 0 && (
          <span className="text-[11px] text-ink-muted">
            ({thread.replies.length}{" "}
            {thread.replies.length === 1 ? "reply" : "replies"})
          </span>
        )}
      </div>

      {/* Snippet / preview */}
      <p className="meta mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {snippet ? snippet.replace(/\n+/g, " ") : ""}
      </p>
    </button>
  );
}
