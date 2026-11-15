"use client";

import React, { useState, useRef, useEffect } from "react";
import { getRolePill, formatMessageDate } from "@/components/inboxMessageCard";
import { containsEmoji } from "@/lib/messages-validation";
import type { ApiMessageThread } from "@/types/messages";

export interface OpenMessageAreaProps {
  selectedThread: ApiMessageThread | null;
  isStudent: boolean;
  hasSupervisor: boolean;
  canSendMessage: boolean;
  isSubmittingReply: boolean;
  onSendReply: (replyText: string) => Promise<void>;
}

export default function OpenMessageArea({
  selectedThread,
  isStudent,
  hasSupervisor,
  canSendMessage,
  isSubmittingReply,
  onSendReply,
}: OpenMessageAreaProps) {
  const [replyText, setReplyText] = useState<string>("");
  const [replySuccess, setReplySuccess] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [replyMode, setReplyMode] = useState<"inline" | "overlay">("inline");

  const messagePaneRef = useRef<HTMLElement>(null);

  // Reset reply state whenever selectedThread changes
  useEffect(() => {
    setShowReplyForm(false);
    setReplyText("");
    setReplyError(null);
    setReplyMode("inline");
  }, [selectedThread?.id]);

  const handleOpenReply = () => {
    if (!canSendMessage) return;

    if (messagePaneRef.current) {
      const rect = messagePaneRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 40;
      setReplyMode(spaceBelow < 220 ? "overlay" : "inline");
    } else {
      setReplyMode("inline");
    }
    setShowReplyForm(true);
  };

  // Dynamically update reply mode on viewport resize when form is open
  useEffect(() => {
    if (!showReplyForm) return;

    const handleResize = () => {
      if (messagePaneRef.current) {
        const rect = messagePaneRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 40;
        if (replyMode === "inline" && spaceBelow < 220) {
          setReplyMode("overlay");
        } else if (replyMode === "overlay" && spaceBelow >= 220) {
          setReplyMode("inline");
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showReplyForm, replyMode]);

  const handleSendReply = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread || !canSendMessage) return;

    if (containsEmoji(replyText)) {
      setReplyError("Emojis are not allowed.");
      return;
    }

    setReplyError(null);
    try {
      await onSendReply(replyText);
      setReplyText("");
      setShowReplyForm(false);
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send reply. Please try again.";
      setReplyError(msg);
    }
  };

  return (
    <section
      ref={messagePaneRef}
      className="card relative flex flex-col p-0 overflow-hidden max-h-[50dvh] lg:max-h-[calc(100dvh-11rem)]"
    >
      {selectedThread ? (
        <>
          <div
            className="flex flex-col gap-6 p-6 overflow-y-auto min-h-0 flex-1"
            style={{
              paddingBottom:
                showReplyForm && replyMode === "overlay" ? "16rem" : undefined,
            }}
          >
            {/* Header of the Selected Message */}
            <div className="flex flex-col gap-4 border-b border-border pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {/* Subject of selected message */}
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    {selectedThread.subject}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">
                      {selectedThread.sender?.name || "Sender"}
                    </span>
                    {selectedThread.sender?.email && (
                      <span className="meta">
                        ({selectedThread.sender.email})
                      </span>
                    )}
                    <span className="text-ink-subtle">·</span>
                    {getRolePill(selectedThread.sender?.role || "STUDENT")}
                  </div>
                </div>
                <span className="meta tabular text-xs shrink-0 mt-1">
                  {formatMessageDate(selectedThread.createdAt)}
                </span>
              </div>
            </div>

            {/* Message Body Content */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-ink whitespace-pre-line">
              {selectedThread.body}
            </div>

            {/* Attachments Section if present */}
            {selectedThread.attachments &&
              selectedThread.attachments.length > 0 && (
                <div className="rounded-control border border-border bg-surface-muted p-4">
                  <p className="label mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedThread.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 rounded-control border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-ink"
                      >
                        <svg
                          className="size-4 text-ink-muted shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span className="truncate max-w-[200px]">{att.name}</span>
                        {att.size && <span className="meta">({att.size})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Thread Replies if any */}
            {selectedThread.replies && selectedThread.replies.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="label">Replies in this thread</p>
                {selectedThread.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-control border border-brand/20 bg-brand-soft/20 p-4"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {reply.sender?.name || "User"}
                        </span>
                        {getRolePill(reply.sender?.role || "STUDENT")}
                      </div>
                      <span className="meta tabular">
                        {formatMessageDate(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                      {reply.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Quick Reply Form (when space allows) */}
            {showReplyForm && replyMode === "inline" && (
              <form
                onSubmit={handleSendReply}
                className="border-t border-border pt-4 flex flex-col gap-3 mt-auto"
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="reply-input-inline" className="field-label mb-0">
                    Reply to thread
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText("");
                      setReplyError(null);
                    }}
                    className="text-xs text-ink-muted hover:text-ink font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {replyError && (
                  <p className="text-xs font-semibold text-danger">{replyError}</p>
                )}

                <textarea
                  id="reply-input-inline"
                  className="textarea min-h-24"
                  rows={3}
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText("");
                      setReplyError(null);
                    }}
                    className="btn-secondary"
                    disabled={isSubmittingReply}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="btn-primary"
                  >
                    {isSubmittingReply ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </form>
            )}

            {/* Reply Trigger Button or Disabled Warning */}
            {!showReplyForm && (
              <div className="border-t border-border pt-4 flex items-center justify-between">
                {canSendMessage ? (
                  <button
                    type="button"
                    onClick={handleOpenReply}
                    className="btn-primary flex items-center gap-2"
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
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                    <span>Reply</span>
                  </button>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Supervisor not assigned. You cannot send replies.
                  </p>
                )}

                {replySuccess && (
                  <p className="text-xs font-semibold text-success">
                    ✓ Reply sent successfully!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Overlay Quick Reply Form (for compact viewports) */}
          {showReplyForm && replyMode === "overlay" && (
            <div className="absolute bottom-0 inset-x-0 rounded-b-card border-t border-border bg-surface/98 backdrop-blur p-4 sm:p-5 shadow-2xl z-10">
              <form onSubmit={handleSendReply} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="reply-input-overlay" className="field-label mb-0">
                    Reply to thread
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText("");
                      setReplyError(null);
                    }}
                    className="text-ink-muted hover:text-ink text-sm p-1 leading-none"
                    aria-label="Close reply form"
                  >
                    ✕
                  </button>
                </div>

                {replyError && (
                  <p className="text-xs font-semibold text-danger">{replyError}</p>
                )}

                <textarea
                  id="reply-input-overlay"
                  className="textarea min-h-24"
                  rows={3}
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText("");
                      setReplyError(null);
                    }}
                    className="btn-secondary"
                    disabled={isSubmittingReply}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="btn-primary"
                  >
                    {isSubmittingReply ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="p-16 text-center">
          <p className="text-base text-ink-muted">
            {isStudent && !hasSupervisor
              ? "Supervisor not assigned. Once your internship supervisor is assigned, you can communicate with them here."
              : "Select a message from the list to view its contents."}
          </p>
        </div>
      )}
    </section>
  );
}
