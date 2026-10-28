"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type {
  ApiMessageThread,
  ApiMessageReply,
  ApiRecipient,
  ApiRecipientsResponse,
  ApiUserSummary,
} from "@/types/messages";

export function useMessages() {
  const { isAuthenticated, user } = useAuth();

  const [threads, setThreads] = useState<ApiMessageThread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [hasSupervisor, setHasSupervisor] = useState<boolean>(true);
  const [supervisor, setSupervisor] = useState<ApiUserSummary | null>(null);
  const [recipients, setRecipients] = useState<ApiRecipient[]>([]);

  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [isCreatingThread, setIsCreatingThread] = useState<boolean>(false);

  const fetchInbox = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      setError(null);

      const data = await apiFetch<{ messages: ApiMessageThread[] }>(
        "/messages/inbox"
      );

      setThreads(data.messages || []);

      setSelectedId((prevId) => {
        if (!data.messages || data.messages.length === 0) return null;
        if (prevId && data.messages.some((m) => m.id === prevId)) return prevId;
        return data.messages[0].id;
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load messages inbox.";
      setError(msg);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  const fetchRecipients = useCallback(async () => {
    try {
      const data = await apiFetch<ApiRecipientsResponse>("/messages/recipients");
      setHasSupervisor(data.hasSupervisor);
      setSupervisor(data.supervisor);
      setRecipients(data.recipients || []);
    } catch (err) {
      console.error("Failed to load message recipients:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [inboxRes, recRes] = await Promise.all([
          apiFetch<{ messages: ApiMessageThread[] }>("/messages/inbox"),
          apiFetch<ApiRecipientsResponse>("/messages/recipients"),
        ]);

        if (!isMounted) return;

        const msgs = inboxRes.messages || [];
        setThreads(msgs);
        setSelectedId((prevId) => {
          if (msgs.length === 0) return null;
          if (prevId && msgs.some((m) => m.id === prevId)) return prevId;
          return msgs[0].id;
        });

        setHasSupervisor(recRes.hasSupervisor);
        setSupervisor(recRes.supervisor);
        setRecipients(recRes.recipients || []);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load messages inbox.";
        setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Window focus revalidation
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => {
      fetchInbox(false);
      fetchRecipients();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated, fetchInbox, fetchRecipients]);

  const selectThread = useCallback((id: number) => {
    setSelectedId(id);

    // Optimistically mark messages as read for this thread in state
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === id) {
          return {
            ...thread,
            read: true,
            unreadCount: 0,
            replies: thread.replies.map((r) => ({ ...r, read: true })),
          };
        }
        return thread;
      })
    );

    // Synchronize read status with backend
    apiFetch(`/messages/thread/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, []);

  const sendReply = useCallback(
    async (threadId: number, body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!trimmed) return false;

      setIsSubmittingReply(true);
      try {
        const res = await apiFetch<{ reply: ApiMessageReply }>(
          `/messages/thread/${threadId}/reply`,
          {
            method: "POST",
            body: JSON.stringify({ body: trimmed }),
          }
        );

        const newReply = res.reply;

        // Update thread in local state
        setThreads((prev) => {
          const updated = prev.map((t) => {
            if (t.id === threadId) {
              const updatedReplies = [...t.replies, newReply];
              return {
                ...t,
                replies: updatedReplies,
                lastActivityAt: newReply.createdAt,
                updatedAt: newReply.createdAt,
              };
            }
            return t;
          });

          // Re-sort descending by lastActivityAt so replied thread bubbles to top
          return updated.sort(
            (a, b) =>
              new Date(b.lastActivityAt).getTime() -
              new Date(a.lastActivityAt).getTime()
          );
        });

        return true;
      } catch (err) {
        throw err;
      } finally {
        setIsSubmittingReply(false);
      }
    },
    []
  );

  const createThread = useCallback(
    async (
      recipientId: number,
      subject: string,
      body: string
    ): Promise<boolean> => {
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      if (!trimmedSubject || !trimmedBody) return false;

      setIsCreatingThread(true);
      try {
        const res = await apiFetch<{ message: ApiMessageThread }>("/messages", {
          method: "POST",
          body: JSON.stringify({
            recipientId,
            subject: trimmedSubject,
            body: trimmedBody,
          }),
        });

        const newThread = res.message;

        setThreads((prev) => [newThread, ...prev]);
        setSelectedId(newThread.id);

        return true;
      } catch (err) {
        throw err;
      } finally {
        setIsCreatingThread(false);
      }
    },
    []
  );

  const selectedThread = useMemo(() => {
    return threads.find((t) => t.id === selectedId) || threads[0] || null;
  }, [threads, selectedId]);

  return {
    threads,
    selectedId,
    selectedThread,
    isLoading,
    error,
    hasSupervisor,
    supervisor,
    recipients,
    isSubmittingReply,
    isCreatingThread,
    selectThread,
    sendReply,
    createThread,
    refreshInbox: () => fetchInbox(false),
    currentUser: user,
  };
}
