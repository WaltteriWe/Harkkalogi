"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/components/authenticatedLayout";
import Sidebar from "@/components/sidebar";
import { useAuth, type Role } from "@/context/AuthContext";

type Recipient = {
  id: number;
  name: string;
  email: string;
  role: Role;
  title: string;
};

type ConversationSummary = {
  id: number;
  subject: string;
  updatedAt: string;
  counterpart: Recipient;
  lastMessage: {
    body: string;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
};

type ConversationMessage = {
  id: number;
  body: string;
  createdAt: string;
  senderId: number;
  sender: { id: number; name: string; role: Role };
};

type ConversationDetail = {
  id: number;
  subject: string;
  counterpart: Pick<Recipient, "id" | "name" | "email" | "role">;
  messages: ConversationMessage[];
};

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed.";
    throw new Error(message);
  }
  return body as T;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function roleLabel(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function MessagesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");

  const refreshConversations = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/messages`, {
      credentials: "include",
    });
    const result = await readResponse<{ conversations: ConversationSummary[] }>(
      response
    );
    setConversations(result.conversations);
    return result.conversations;
  }, []);

  const openConversation = useCallback(async (id: number) => {
    setIsLoadingThread(true);
    setPageError(null);
    try {
      const response = await fetch(`${backendUrl}/api/messages/${id}`, {
        credentials: "include",
      });
      const result = await readResponse<{ conversation: ConversationDetail }>(
        response
      );
      setSelectedId(id);
      setSelectedConversation(result.conversation);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation
        )
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not load the conversation."
      );
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;
    void Promise.all([
      fetch(`${backendUrl}/api/messages`, { credentials: "include" }).then(
        (response) => readResponse<{ conversations: ConversationSummary[] }>(response)
      ),
      fetch(`${backendUrl}/api/messages/recipients`, { credentials: "include" }).then(
        (response) => readResponse<{ recipients: Recipient[] }>(response)
      ),
    ])
      .then(([conversationResult, recipientResult]) => {
        if (!active) return;
        setConversations(conversationResult.conversations);
        setRecipients(recipientResult.recipients);
        if (conversationResult.conversations.length > 0) {
          void openConversation(conversationResult.conversations[0].id);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPageError(
            error instanceof Error ? error.message : "Could not load messages."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthLoading, openConversation, user]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation.subject,
        conversation.counterpart.name,
        conversation.counterpart.email,
        conversation.lastMessage?.body ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  async function handleSendNewMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipientId || !subject.trim() || !newMessage.trim()) return;
    setIsSending(true);
    setPageError(null);
    try {
      const response = await fetch(`${backendUrl}/api/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: Number(recipientId),
          subject,
          body: newMessage,
        }),
      });
      const result = await readResponse<{ conversationId: number }>(response);
      setShowCompose(false);
      setRecipientId("");
      setSubject("");
      setNewMessage("");
      await refreshConversations();
      await openConversation(result.conversationId);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not send the message."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setIsSending(true);
    setPageError(null);
    try {
      const response = await fetch(
        `${backendUrl}/api/messages/${selectedId}/replies`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyText }),
        }
      );
      await readResponse<{ success: boolean }>(response);
      setReplyText("");
      await refreshConversations();
      await openConversation(selectedId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not send your reply.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="app-shell">
        <Sidebar role={user?.role} />
        <main className="main flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1>Messages</h1>
              <p className="meta mt-1 text-base">
                Send and receive messages from other Harkkalogi users.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPageError(null);
                setShowCompose((current) => !current);
              }}
              className="btn-primary"
            >
              {showCompose ? "Close new message" : "New message"}
            </button>
          </header>

          {pageError && (
            <p role="alert" className="card border-danger text-sm text-danger">
              {pageError}
            </p>
          )}

          {showCompose && (
            <form
              onSubmit={handleSendNewMessage}
              className="card flex flex-col gap-4"
            >
              <h2>Compose message</h2>
              <div>
                <label htmlFor="message-recipient" className="field-label">
                  Recipient
                </label>
                <select
                  id="message-recipient"
                  className="input"
                  required
                  value={recipientId}
                  onChange={(event) => setRecipientId(event.target.value)}
                >
                  <option value="">Choose a user</option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name} · {roleLabel(recipient.role)} · {recipient.email}
                    </option>
                  ))}
                </select>
                {recipients.length === 0 && (
                  <p className="hint">There are no other user accounts to message yet.</p>
                )}
              </div>
              <div>
                <label htmlFor="message-subject" className="field-label">
                  Subject
                </label>
                <input
                  id="message-subject"
                  className="input"
                  maxLength={160}
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="message-body" className="field-label">
                  Message
                </label>
                <textarea
                  id="message-body"
                  className="textarea"
                  rows={5}
                  maxLength={5000}
                  required
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSending || recipients.length === 0}
                >
                  {isSending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}

          <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
            <section className="card flex max-h-[60dvh] min-h-64 flex-col gap-3 overflow-hidden p-4 lg:max-h-[calc(100dvh-12rem)]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2>Inbox</h2>
                <span className="meta text-xs">
                  {filteredConversations.length}{" "}
                  {filteredConversations.length === 1 ? "conversation" : "conversations"}
                </span>
              </div>
              <label className="sr-only" htmlFor="message-search">
                Search messages
              </label>
              <input
                id="message-search"
                className="input"
                type="search"
                placeholder="Search messages…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                {isLoading ? (
                  <p className="py-6 text-center text-sm text-ink-muted">
                    Loading messages…
                  </p>
                ) : filteredConversations.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-muted">
                    {searchQuery
                      ? "No conversations match your search."
                      : "No messages yet. Start a new conversation."}
                  </p>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => void openConversation(conversation.id)}
                      className={`w-full rounded-control border p-3 text-left ${
                        selectedId === conversation.id
                          ? "border-brand bg-brand-soft/20"
                          : "border-border bg-surface hover:bg-surface-muted"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {conversation.subject}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="pill-info">{conversation.unreadCount} new</span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {conversation.counterpart.name} · {roleLabel(conversation.counterpart.role)}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs text-ink-subtle">
                        {conversation.lastMessage?.body ?? ""}
                      </span>
                      <span className="mt-1 block text-right text-xs text-ink-subtle">
                        {conversation.lastMessage
                          ? formatDate(conversation.lastMessage.createdAt)
                          : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="card flex max-h-[60dvh] min-h-64 min-w-0 flex-col overflow-hidden p-0 lg:max-h-[calc(100dvh-12rem)]">
              {selectedConversation ? (
                <>
                  <header className="border-b border-border p-5">
                    <h2>{selectedConversation.subject}</h2>
                    <p className="meta mt-1 text-sm">
                      Conversation with {selectedConversation.counterpart.name} ·{" "}
                      {selectedConversation.counterpart.email}
                    </p>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                    {isLoadingThread ? (
                      <p className="text-center text-sm text-ink-muted">
                        Loading conversation…
                      </p>
                    ) : (
                      selectedConversation.messages.map((message) => (
                        <article
                          key={message.id}
                          className={`max-w-[90%] rounded-control border p-4 ${
                            message.senderId === user?.id
                              ? "ml-auto border-brand/20 bg-brand-soft/20"
                              : "mr-auto border-border bg-surface-muted"
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-ink">
                              {message.senderId === user?.id ? "You" : message.sender.name}
                            </span>
                            <time className="text-ink-subtle">
                              {formatDate(message.createdAt)}
                            </time>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.body}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                  <form
                    onSubmit={handleSendReply}
                    className="flex flex-col gap-3 border-t border-border p-4"
                  >
                    <label htmlFor="message-reply" className="field-label mb-0">
                      Reply
                    </label>
                    <textarea
                      id="message-reply"
                      className="textarea min-h-20"
                      rows={3}
                      maxLength={5000}
                      required
                      placeholder="Write your message…"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSending || !replyText.trim()}
                      >
                        {isSending ? "Sending…" : "Send reply"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <p className="text-sm text-ink-muted">
                    {isLoading
                      ? "Loading messages…"
                      : "Select a conversation or start a new message."}
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
