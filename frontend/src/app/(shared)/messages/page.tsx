"use client";

import React, { useState, useMemo } from "react";
import ComposeMessageModal from "@/components/composeMessageModal";
import MessagesHeader from "@/components/messagesHeader";
import MessagesBanners from "@/components/messagesBanners";
import MessagesInboxArea from "@/components/messagesInboxArea";
import OpenMessageArea from "@/components/openMessageArea";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/context/AuthContext";

export default function MessagesPage() {
  const { user } = useAuth();
  const {
    threads,
    selectedThread,
    isLoading,
    error,
    hasSupervisor,
    supervisor,
    recipients,
    isSubmittingReply,
    selectThread,
    sendReply,
    createThread,
    refreshInbox,
  } = useMessages();

  const isStudent = user?.role === "student" || (user?.role as string) === "STUDENT";
  const canSendMessage = !isStudent || hasSupervisor;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;

    return threads.filter((m) => {
      const otherName =
        user?.id && m.senderId === user.id
          ? m.recipient?.name || ""
          : m.sender?.name || "";

      return (
        m.subject.toLowerCase().includes(q) ||
        otherName.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        (m.replies && m.replies.some((r) => r.body.toLowerCase().includes(q)))
      );
    });
  }, [threads, searchQuery, user]);

  return (
    <>
      <MessagesHeader
        isStudent={isStudent}
        canSendMessage={canSendMessage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      <MessagesBanners
        isStudent={isStudent}
        hasSupervisor={hasSupervisor}
        isLoading={isLoading}
        error={error}
        onRefreshInbox={refreshInbox}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[24rem_1fr]">
        <MessagesInboxArea
          threads={filteredMessages}
          selectedThreadId={selectedThread?.id ?? null}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          onSelectThread={selectThread}
          isStudent={isStudent}
          hasSupervisor={hasSupervisor}
          canSendMessage={canSendMessage}
          onOpenCompose={() => setIsComposeOpen(true)}
          currentUserId={user?.id}
        />

        <OpenMessageArea
          selectedThread={selectedThread}
          isStudent={isStudent}
          hasSupervisor={hasSupervisor}
          canSendMessage={canSendMessage}
          isSubmittingReply={isSubmittingReply}
          onSendReply={async (replyText) => {
            if (selectedThread) {
              await sendReply(selectedThread.id, replyText);
            }
          }}
        />
      </div>

      {isComposeOpen && (
        <ComposeMessageModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSubmit={createThread}
          isStudent={isStudent}
          supervisor={supervisor}
          recipients={recipients}
        />
      )}
    </>
  );
}
