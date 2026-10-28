"use client";

import React, { useState, useEffect } from "react";
import type { ApiRecipient, ApiUserSummary } from "@/types/messages";
import { containsEmoji } from "@/lib/messages-validation";

export interface ComposeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    recipientId: number,
    subject: string,
    body: string
  ) => Promise<boolean>;
  isStudent: boolean;
  supervisor: ApiUserSummary | null;
  recipients: ApiRecipient[];
  initialRecipientId?: number;
}

export default function ComposeMessageModal({
  isOpen,
  onClose,
  onSubmit,
  isStudent,
  supervisor,
  recipients,
  initialRecipientId,
}: ComposeMessageModalProps) {
  const defaultRecipientId: number | "" =
    isStudent && supervisor
      ? supervisor.id
      : initialRecipientId ?? (recipients.length > 0 ? recipients[0].id : "");

  const [recipientId, setRecipientId] = useState<number | "">(defaultRecipientId);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveRecipientId = isStudent && supervisor ? supervisor.id : recipientId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveRecipientId || !subject.trim() || !body.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (containsEmoji(subject)) {
      setError("Emojis are not allowed in subject.");
      return;
    }

    if (containsEmoji(body)) {
      setError("Emojis are not allowed in message content.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit(Number(effectiveRecipientId), subject, body);
      if (success) {
        setSubject("");
        setBody("");
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="card w-full max-w-xl p-6 shadow-2xl relative max-h-[90dvh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-modal-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 id="compose-modal-title" className="text-lg font-bold text-ink">
            New Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-sm p-1 leading-none rounded focus:outline-hidden"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-control bg-danger-soft/30 border border-danger/30 text-danger text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 overflow-y-auto">
          {/* Recipient Selection */}
          <div>
            <label className="field-label mb-1.5" htmlFor="message-recipient">
              To
            </label>
            {isStudent ? (
              <div className="flex items-center justify-between rounded-control border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-ink">
                <div>
                  <span className="font-semibold">
                    {supervisor?.name || "Assigned supervising teacher"}
                  </span>
                  {supervisor?.email && (
                    <span className="meta ml-2">({supervisor.email})</span>
                  )}
                </div>
                <span className="pill-info">Supervising teacher</span>
              </div>
            ) : (
              <select
                id="message-recipient"
                value={effectiveRecipientId}
                onChange={(e) => setRecipientId(Number(e.target.value))}
                className="input text-sm"
                required
              >
                <option value="" disabled>
                  Select student recipient...
                </option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email}) {r.company ? `— ${r.company}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject Input */}
          <div>
            <label className="field-label mb-1.5" htmlFor="message-subject">
              Subject
            </label>
            <input
              id="message-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question regarding internship agreement"
              className="input text-sm"
              required
              maxLength={200}
            />
          </div>

          {/* Body Textarea */}
          <div>
            <label className="field-label mb-1.5" htmlFor="message-body">
              Message
            </label>
            <textarea
              id="message-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="textarea text-sm"
              required
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !body.trim() || !effectiveRecipientId}
              className="btn-primary"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
