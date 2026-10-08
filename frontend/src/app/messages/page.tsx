"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Sidebar from "../../components/sidebar";
import InboxMessageCard, {
  type RoleType,
  type MessageItem,
  type ThreadReply,
  getRolePill,
} from "../../components/inboxMessageCard";

export type { RoleType, MessageItem, ThreadReply };

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: "msg-1",
    subject: "Feedback on your internship agreement",
    sender: "Mikko Laine",
    senderRole: "Supervising teacher",
    senderEmail: "mikko.laine@metropolia.fi",
    date: "Today, 11:20",
    read: false,
    body: "Hi Aino,\n\nI have reviewed your internship agreement with Nordic Pixel Oy. The learning goals are clearly aligned with the curriculum and Laura Nieminen has accepted the role as your workplace supervisor.\n\nKeep logging your hours and feel free to reach out if you have questions regarding the final reporting deadline in December.\n\nBest regards,\nMikko Laine",
    attachments: [
      { name: "Harjoittelusopimus_hyvaksytty.pdf", size: "1.2 MB" },
    ],
    replies: [],
  },
  {
    id: "msg-2",
    subject: "Work certificate (Työtodistus) and final review",
    sender: "Laura Nieminen",
    senderRole: "Workplace supervisor",
    senderEmail: "laura.nieminen@nordicpixel.fi",
    date: "Yesterday, 16:45",
    read: true,
    body: "Hello Aino!\n\nIt has been a pleasure having you on the customer portal frontend team. I have completed and digitally signed your official work certificate (Työtodistus).\n\nYou can attach this PDF directly to your final report in Harkkalogi. Make sure to also complete the learning reflection section before submitting.\n\nKeep in touch!\nLaura",
    attachments: [
      { name: "Tyotodistus_NordicPixel.pdf", size: "840 KB" },
    ],
    replies: [],
  },
  {
    id: "msg-3",
    subject: "Reminder: Final report due on 15.12.",
    sender: "Mikko Laine",
    senderRole: "Supervising teacher",
    senderEmail: "mikko.laine@gradia.fi",
    date: "3.10.2026",
    read: true,
    body: "Hello students,\n\nThis is a general reminder regarding the final report requirements. Please make sure that:\n1. Your total 800 hours are logged.\n2. The tasks and learning section contains at least 300 words connecting your tasks to the internship plan.\n3. The signed work certificate from your supervisor is uploaded.\n\nThe system deadline is 15.12.2026 at 23:59.\n\nBest,\nMikko Laine",
    replies: [],
  },
  {
    id: "msg-4",
    subject: "Internship presentation seminar schedule",
    sender: "Kaisa Virtanen",
    senderRole: "Coordinator",
    senderEmail: "kaisa.virtanen@gradia.fi",
    date: "28.9.2026",
    read: true,
    body: "Dear students,\n\nThe final internship presentation seminar is scheduled for December 18 in auditorium B204. Each student will give a short 10-minute presentation highlighting key projects and learnings.\n\nPlease check your schedule and let me know if there are any conflicting exams.\n\nRegards,\nKaisa Virtanen\nInternship Coordinator",
    replies: [],
  },
  {
    id: "msg-5",
    subject: "Mid-term progress review follow-up",
    sender: "Laura Nieminen",
    senderRole: "Workplace supervisor",
    senderEmail: "laura.nieminen@nordicpixel.fi",
    date: "15.8.2026",
    read: true,
    body: "Hi Aino,\n\nFollowing our mid-term discussion today: you have transitioned exceptionally well into our React workflow and component library tasks. For the second half of the internship, we'd like you to take ownership of the new dashboard widgets.\n\nKeep up the great work!\nLaura",
    replies: [],
  },
];


export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [selectedId, setSelectedId] = useState<string>("msg-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");
  const [replySuccess, setReplySuccess] = useState<boolean>(false);
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [replyMode, setReplyMode] = useState<"inline" | "overlay">("inline");
  const messagePaneRef = useRef<HTMLElement>(null);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;

    return messages.filter((m) => {
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        m.senderRole.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery]);

  // Current selected message
  const selectedMessage = useMemo(() => {
    const match = filteredMessages.find((m) => m.id === selectedId);
    return match || filteredMessages[0] || null;
  }, [filteredMessages, selectedId]);

  const handleSelectMessage = (id: string) => {
    setSelectedId(id);
    setShowReplyForm(false);
    setReplyText("");
    setReplyMode("inline");
    // Mark as read
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, read: true } : msg))
    );
  };

  const handleOpenReply = () => {
    if (messagePaneRef.current) {
      const rect = messagePaneRef.current.getBoundingClientRect();
      // Distance from bottom of message card to viewport bottom (accounting for 40px padding)
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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    const newReply: ThreadReply = {
      id: `reply-${Date.now()}`,
      sender: "Aino Korhonen",
      role: "Student",
      body: replyText.trim(),
      date: "Just now",
    };

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === selectedMessage.id
          ? { ...msg, replies: [...(msg.replies || []), newReply] }
          : msg
      )
    );

    setReplyText("");
    setShowReplyForm(false);
    setReplySuccess(true);
    setTimeout(() => setReplySuccess(false), 3000);
  };

  return (
    <div className="app-shell">
      <Sidebar role="student" userName="Aino Korhonen" />

      <main className="main flex flex-col gap-6">
        {/* Top Header with title on left and Search Box on top-right */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Messages</h1>
            <p className="meta mt-1 text-base">
              Communicate with your supervising teacher and workplace supervisor
            </p>
          </div>

          {/* Search box in the top right corner */}
          <div className="relative w-full sm:w-80">
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="input pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-subtle hover:text-ink text-sm"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 2-Column Split: Vertical Messages List (Left) and Message Detail (Right) */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[24rem_1fr]">
          {/* Vertical Messages List */}
          <section className="card flex flex-col p-4 sm:p-5 max-h-[50dvh] lg:max-h-[calc(100dvh-11rem)] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-border shrink-0 mb-3">
              <h2 className="text-base font-semibold text-ink">
                Inbox
              </h2>
              <span className="meta text-xs">
                {filteredMessages.length}{" "}
                {filteredMessages.length === 1 ? "message" : "messages"}
              </span>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-muted">
                  No messages found matching &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="link mt-2 text-xs"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-1">
                {filteredMessages.map((msg) => (
                  <InboxMessageCard
                    key={msg.id}
                    message={msg}
                    isSelected={selectedMessage?.id === msg.id}
                    onSelect={handleSelectMessage}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Message Detail & Reading Pane (Right) */}
          <section
            ref={messagePaneRef}
            className="card relative flex flex-col p-0 overflow-hidden max-h-[50dvh] lg:max-h-[calc(100dvh-11rem)]"
          >
            {selectedMessage ? (
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
                          {selectedMessage.subject}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-ink">
                            {selectedMessage.sender}
                          </span>
                          <span className="meta">({selectedMessage.senderEmail})</span>
                          <span className="text-ink-subtle">·</span>
                          {getRolePill(selectedMessage.senderRole)}
                        </div>
                      </div>
                      <span className="meta tabular text-xs shrink-0 mt-1">
                        {selectedMessage.date}
                      </span>
                    </div>
                  </div>

                  {/* Message Body Content */}
                  <div className="space-y-4 text-sm sm:text-base leading-relaxed text-ink whitespace-pre-line">
                    {selectedMessage.body}
                  </div>

                  {/* Attachments Section if present */}
                  {selectedMessage.attachments &&
                    selectedMessage.attachments.length > 0 && (
                      <div className="rounded-control border border-border bg-surface-muted p-4">
                        <p className="label mb-2">Attachments</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMessage.attachments.map((att) => (
                            <div
                              key={att.name}
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
                              <span className="meta">({att.size})</span>
                              <span className="pill-success ml-1">Attached</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Thread Replies if any */}
                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-border pt-4">
                      <p className="label">Replies in this thread</p>
                      {selectedMessage.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="rounded-control border border-brand/20 bg-brand-soft/20 p-4"
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">
                                {reply.sender}
                              </span>
                              <span className="pill-neutral">{reply.role}</span>
                            </div>
                            <span className="meta tabular">{reply.date}</span>
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
                          Reply to {selectedMessage.sender}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReplyForm(false);
                            setReplyText("");
                          }}
                          className="text-xs text-ink-muted hover:text-ink font-medium"
                        >
                          Cancel
                        </button>
                      </div>
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
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="btn-primary"
                        >
                          Send reply
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reply Trigger Button when reply form is closed */}
                  {!showReplyForm && (
                    <div className="border-t border-border pt-4 flex items-center justify-between">
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

                      {replySuccess && (
                        <p className="text-xs font-semibold text-success">
                          ✓ Reply sent successfully!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Overlay Quick Reply Form (when space is constrained: opens on top of bottom of message) */}
                {showReplyForm && replyMode === "overlay" && (
                  <div className="absolute bottom-0 inset-x-0 rounded-b-card border-t border-border bg-surface/98 backdrop-blur p-4 sm:p-5 shadow-2xl z-10">
                    <form onSubmit={handleSendReply} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="reply-input-overlay" className="field-label mb-0">
                          Reply to {selectedMessage.sender}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReplyForm(false);
                            setReplyText("");
                          }}
                          className="text-ink-muted hover:text-ink text-sm p-1 leading-none"
                          aria-label="Close reply form"
                        >
                          ✕
                        </button>
                      </div>
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
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="btn-primary"
                        >
                          Send reply
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="p-16 text-center">
                <p className="text-base text-ink-muted">
                  Select a message from the list to view its contents.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
