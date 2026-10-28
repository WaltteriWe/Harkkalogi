import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMessageDate, getRolePill } from "../../components/inboxMessageCard.js";
import { containsEmoji } from "../messages-validation.js";

describe("messages-utils: formatMessageDate", () => {
  it("formats dates from today as 'Today, HH:mm'", () => {
    const now = new Date();
    const iso = now.toISOString();
    const result = formatMessageDate(iso);
    assert.match(result, /^Today, \d{2}:\d{2}$/);
  });

  it("formats dates from yesterday as 'Yesterday, HH:mm'", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString();
    const result = formatMessageDate(iso);
    assert.match(result, /^Yesterday, \d{2}:\d{2}$/);
  });

  it("formats dates from older years as D.M.YYYY", () => {
    const past = new Date("2024-05-15T10:30:00Z");
    const result = formatMessageDate(past.toISOString());
    assert.equal(result.includes("2024"), true);
    assert.match(result, /\d+\.\d+\.2024/);
  });

  it("falls back to raw string on invalid input", () => {
    assert.equal(formatMessageDate("invalid-date-string"), "invalid-date-string");
  });
});

describe("messages-utils: getRolePill", () => {
  it("maps TEACHER role to pill with 'Teacher' or 'Supervising teacher'", () => {
    const pill1 = getRolePill("TEACHER");
    assert.equal(pill1.props.className, "pill-info");
    assert.equal(pill1.props.children, "Teacher");

    const pill2 = getRolePill("Supervising teacher");
    assert.equal(pill2.props.className, "pill-info");
    assert.equal(pill2.props.children, "Supervising teacher");
  });

  it("maps STUDENT role to neutral pill", () => {
    const pill = getRolePill("STUDENT");
    assert.equal(pill.props.className, "pill-neutral");
    assert.equal(pill.props.children, "Student");
  });

  it("maps ADMIN role to warning pill", () => {
    const pill = getRolePill("ADMIN");
    assert.equal(pill.props.className, "pill-warning");
    assert.equal(pill.props.children, "Admin");
  });

  it("maps Workplace supervisor to success pill", () => {
    const pill = getRolePill("Workplace supervisor");
    assert.equal(pill.props.className, "pill-success");
    assert.equal(pill.props.children, "Workplace supervisor");
  });
});

describe("messages-utils: sorting by lastActivityAt", () => {
  it("sorts threads descending by lastActivityAt", () => {
    const threads = [
      { id: 1, subject: "Old", lastActivityAt: "2026-10-01T10:00:00Z" },
      { id: 2, subject: "Newest", lastActivityAt: "2026-10-28T10:00:00Z" },
      { id: 3, subject: "Middle", lastActivityAt: "2026-10-15T10:00:00Z" },
    ];

    const sorted = [...threads].sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime()
    );

    assert.equal(sorted[0].id, 2);
    assert.equal(sorted[1].id, 3);
    assert.equal(sorted[2].id, 1);
  });
});

describe("messages-validation: containsEmoji", () => {
  it("returns false for regular text without emojis", () => {
    assert.equal(containsEmoji("Hello world!"), false);
    assert.equal(containsEmoji("Ääkköset toimivat Åland"), false);
    assert.equal(containsEmoji("Punctuation: . , ! ? - _ @ # $ %"), false);
    assert.equal(containsEmoji("Numbers: 1234567890"), false);
  });

  it("returns false for multiline text without emojis", () => {
    assert.equal(containsEmoji("Line 1\nLine 2\r\nLine 3"), false);
  });

  it("returns true for strings containing emojis", () => {
    assert.equal(containsEmoji("Hello 😀"), true);
    assert.equal(containsEmoji("Great work 🚀"), true);
    assert.equal(containsEmoji("❤️"), true);
    assert.equal(containsEmoji("Thanks 👍"), true);
    assert.equal(containsEmoji("Party 🎉 time"), true);
  });

  it("returns false for empty or falsy strings", () => {
    assert.equal(containsEmoji(""), false);
  });
});

