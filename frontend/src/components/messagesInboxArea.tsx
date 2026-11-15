"use client";

import React from "react";
import InboxMessageCard from "@/components/inboxMessageCard";
import type { ApiMessageThread } from "@/types/messages";

export interface MessagesInboxAreaProps {
  threads: ApiMessageThread[];
  selectedThreadId: number | null;
  isLoading: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onSelectThread: (id: number) => void;
  isStudent: boolean;
  hasSupervisor: boolean;
  canSendMessage: boolean;
  onOpenCompose: () => void;
  currentUserId?: number;
}

export default function MessagesInboxArea({
  threads,
  selectedThreadId,
  isLoading,
  searchQuery,
  onClearSearch,
  onSelectThread,
  isStudent,
  hasSupervisor,
  canSendMessage,
  onOpenCompose,
  currentUserId,
}: MessagesInboxAreaProps) {
  return (
    <section className="card flex flex-col p-4 sm:p-5 max-h-[50dvh] lg:max-h-[calc(100dvh-11rem)] overflow-hidden">
      <div className="flex items-center justify-between pb-2 border-b border-border shrink-0 mb-3">
        <h2 className="text-base font-semibold text-ink">Inbox</h2>
        <span className="meta text-xs">
          {threads.length} {threads.length === 1 ? "thread" : "threads"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-6">
          <div className="h-16 animate-pulse rounded-control bg-surface-muted" />
          <div className="h-16 animate-pulse rounded-control bg-surface-muted" />
          <div className="h-16 animate-pulse rounded-control bg-surface-muted" />
        </div>
      ) : threads.length === 0 ? (
        <div className="py-8 text-center">
          {searchQuery ? (
            <>
              <p className="text-sm text-ink-muted">
                No messages found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={onClearSearch}
                className="link mt-2 text-xs"
              >
                Clear search
              </button>
            </>
          ) : isStudent && !hasSupervisor ? (
            <p className="text-sm text-ink-muted">
              Supervisor not assigned. Once your internship supervisor is assigned, you can communicate with them here.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                No messages in your inbox yet.
              </p>
              {canSendMessage && (
                <button
                  type="button"
                  onClick={onOpenCompose}
                  className="btn-secondary mt-3 text-xs"
                >
                  Start a conversation
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-1">
          {threads.map((msg) => (
            <InboxMessageCard
              key={msg.id}
              thread={msg}
              isSelected={selectedThreadId === msg.id}
              onSelect={onSelectThread}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
