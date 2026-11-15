import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MessagesHeader from "../../components/messagesHeader.js";
import MessagesBanners from "../../components/messagesBanners.js";
import MessagesInboxArea from "../../components/messagesInboxArea.js";
import OpenMessageArea from "../../components/openMessageArea.js";
import type { ApiMessageThread } from "../../types/messages.js";

describe("MessagesHeader component", () => {
  it("renders student subtitle when isStudent is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesHeader, {
        isStudent: true,
        canSendMessage: true,
        searchQuery: "",
        onSearchChange: () => {},
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("<h1>Messages</h1>"));
    assert.ok(html.includes("Communicate with your supervising teacher"));
  });

  it("renders teacher subtitle when isStudent is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesHeader, {
        isStudent: false,
        canSendMessage: true,
        searchQuery: "",
        onSearchChange: () => {},
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("<h1>Messages</h1>"));
    assert.ok(html.includes("Communicate with your supervised students"));
  });

  it("disables compose button when canSendMessage is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesHeader, {
        isStudent: true,
        canSendMessage: false,
        searchQuery: "",
        onSearchChange: () => {},
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("disabled=\"\"") || html.includes("disabled"));
    assert.ok(html.includes("cursor-not-allowed"));
    assert.ok(html.includes("Supervisor not assigned"));
  });

  it("renders clear button only when searchQuery is non-empty", () => {
    const emptyHtml = renderToStaticMarkup(
      React.createElement(MessagesHeader, {
        isStudent: true,
        canSendMessage: true,
        searchQuery: "",
        onSearchChange: () => {},
        onOpenCompose: () => {},
      })
    );
    assert.ok(!emptyHtml.includes("Clear search"));

    const withSearchHtml = renderToStaticMarkup(
      React.createElement(MessagesHeader, {
        isStudent: true,
        canSendMessage: true,
        searchQuery: "Harjoittelu",
        onSearchChange: () => {},
        onOpenCompose: () => {},
      })
    );
    assert.ok(withSearchHtml.includes("Clear search"));
    assert.ok(withSearchHtml.includes("value=\"Harjoittelu\""));
  });
});

describe("MessagesBanners component", () => {
  it("renders warning banner when student has no supervisor and is not loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesBanners, {
        isStudent: true,
        hasSupervisor: false,
        isLoading: false,
        error: null,
      })
    );

    assert.ok(html.includes("Supervisor not assigned"));
    assert.ok(html.includes("border-amber-300"));
  });

  it("does not render warning banner when student has supervisor", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesBanners, {
        isStudent: true,
        hasSupervisor: true,
        isLoading: false,
        error: null,
      })
    );

    assert.ok(!html.includes("Supervisor not assigned"));
  });

  it("does not render warning banner while loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesBanners, {
        isStudent: true,
        hasSupervisor: false,
        isLoading: true,
        error: null,
      })
    );

    assert.ok(!html.includes("Supervisor not assigned"));
  });

  it("renders error banner with retry button when error is present", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesBanners, {
        isStudent: false,
        hasSupervisor: true,
        isLoading: false,
        error: "Failed to connect to messages service",
        onRefreshInbox: () => {},
      })
    );

    assert.ok(html.includes("Failed to connect to messages service"));
    assert.ok(html.includes("text-danger"));
    assert.ok(html.includes("Retry"));
  });
});

describe("MessagesInboxArea component", () => {
  const dummyThread: ApiMessageThread = {
    id: 101,
    subject: "Harjoittelusuunnitelman tarkistus",
    body: "Olen päivittänyt tavoitteet.",
    read: true,
    createdAt: "2026-11-10T10:00:00Z",
    updatedAt: "2026-11-10T10:00:00Z",
    lastActivityAt: "2026-11-10T10:00:00Z",
    senderId: 1,
    recipientId: 2,
    sender: { id: 1, name: "Eetu Mäkinen", email: "eetu@example.com", role: "STUDENT" },
    recipient: { id: 2, name: "Tiina Opettaja", email: "tiina@example.com", role: "TEACHER" },
    attachments: [],
    replies: [],
  };

  it("displays correct thread count format for single and plural counts", () => {
    const singleHtml = renderToStaticMarkup(
      React.createElement(MessagesInboxArea, {
        threads: [dummyThread],
        selectedThreadId: null,
        isLoading: false,
        searchQuery: "",
        onClearSearch: () => {},
        onSelectThread: () => {},
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        onOpenCompose: () => {},
      })
    );
    assert.ok(singleHtml.includes("1 thread"));

    const pluralHtml = renderToStaticMarkup(
      React.createElement(MessagesInboxArea, {
        threads: [dummyThread, { ...dummyThread, id: 102 }],
        selectedThreadId: null,
        isLoading: false,
        searchQuery: "",
        onClearSearch: () => {},
        onSelectThread: () => {},
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        onOpenCompose: () => {},
      })
    );
    assert.ok(pluralHtml.includes("2 threads"));
  });

  it("shows loading pulse skeleton when isLoading is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesInboxArea, {
        threads: [],
        selectedThreadId: null,
        isLoading: true,
        searchQuery: "",
        onClearSearch: () => {},
        onSelectThread: () => {},
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("animate-pulse"));
  });

  it("shows empty search result message with clear search button", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesInboxArea, {
        threads: [],
        selectedThreadId: null,
        isLoading: false,
        searchQuery: "test-query",
        onClearSearch: () => {},
        onSelectThread: () => {},
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("No messages found matching"));
    assert.ok(html.includes("test-query"));
    assert.ok(html.includes("Clear search"));
  });

  it("renders thread card list when threads are available", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessagesInboxArea, {
        threads: [dummyThread],
        selectedThreadId: 101,
        isLoading: false,
        searchQuery: "",
        onClearSearch: () => {},
        onSelectThread: () => {},
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        onOpenCompose: () => {},
      })
    );

    assert.ok(html.includes("Harjoittelusuunnitelman tarkistus"));
    assert.ok(html.includes("Olen päivittänyt tavoitteet."));
  });
});

describe("OpenMessageArea component", () => {
  const sampleThread: ApiMessageThread = {
    id: 201,
    subject: "Kysymys raportointiin liittyen",
    body: "Moi! Milloin raportti pitää viimeistään palauttaa?\nYt, Eetu",
    read: true,
    createdAt: "2026-11-12T14:30:00Z",
    updatedAt: "2026-11-12T14:30:00Z",
    lastActivityAt: "2026-11-12T14:30:00Z",
    senderId: 1,
    recipientId: 2,
    sender: { id: 1, name: "Eetu Mäkinen", email: "eetu@example.com", role: "STUDENT" },
    recipient: { id: 2, name: "Tiina Opettaja", email: "tiina@example.com", role: "TEACHER" },
    attachments: [
      { id: 1, name: "liite.pdf", size: "120 KB", fileUrl: "/api/files/1" },
    ],
    replies: [
      {
        id: 501,
        body: "Hei Eetu! Raportti palautetaan ennen arviointia.",
        read: true,
        createdAt: "2026-11-12T15:00:00Z",
        sender: { id: 2, name: "Tiina Opettaja", email: "tiina@example.com", role: "TEACHER" },
      },
    ],
  };

  it("renders empty state placeholder when selectedThread is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpenMessageArea, {
        selectedThread: null,
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        isSubmittingReply: false,
        onSendReply: async () => {},
      })
    );

    assert.ok(html.includes("Select a message from the list to view its contents."));
  });

  it("renders supervisor unassigned notice when selectedThread is null and supervisor missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpenMessageArea, {
        selectedThread: null,
        isStudent: true,
        hasSupervisor: false,
        canSendMessage: false,
        isSubmittingReply: false,
        onSendReply: async () => {},
      })
    );

    assert.ok(html.includes("Supervisor not assigned"));
  });

  it("renders thread subject, body, attachments, and replies when thread is selected", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpenMessageArea, {
        selectedThread: sampleThread,
        isStudent: true,
        hasSupervisor: true,
        canSendMessage: true,
        isSubmittingReply: false,
        onSendReply: async () => {},
      })
    );

    assert.ok(html.includes("Kysymys raportointiin liittyen"));
    assert.ok(html.includes("Moi! Milloin raportti pitää viimeistään palauttaa?"));
    assert.ok(html.includes("liite.pdf"));
    assert.ok(html.includes("120 KB"));
    assert.ok(html.includes("Hei Eetu! Raportti palautetaan ennen arviointia."));
    assert.ok(html.includes("Reply"));
  });

  it("renders supervisor warning instead of Reply button when canSendMessage is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpenMessageArea, {
        selectedThread: sampleThread,
        isStudent: true,
        hasSupervisor: false,
        canSendMessage: false,
        isSubmittingReply: false,
        onSendReply: async () => {},
      })
    );

    assert.ok(html.includes("Supervisor not assigned. You cannot send replies."));
  });
});
