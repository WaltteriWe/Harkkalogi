"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T, isBackground?: boolean) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function formatCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 1500,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const latestDataRef = useRef<T>(data);
  latestDataRef.current = data;

  const isDirtyRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const flush = useCallback(
    async (isBackground = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!isDirtyRef.current || isSavingRef.current || !enabled) {
        return;
      }

      isSavingRef.current = true;
      setStatus("saving");

      try {
        await onSaveRef.current(latestDataRef.current, isBackground);
        isDirtyRef.current = false;
        setStatus("saved");
        setLastSavedAt(formatCurrentTime());
      } catch (err) {
        setStatus("error");
        console.error("Auto-save draft failed:", err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [enabled]
  );

  const notifyChange = useCallback(() => {
    if (!enabled) return;
    isDirtyRef.current = true;
    setStatus("unsaved");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, debounceMs);
  }, [debounceMs, flush, enabled]);

  // 1. Browser/Window close guard (beforeunload)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || isSavingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 2. Click-away (focusout on input/textarea/select)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        if (isDirtyRef.current) {
          flush();
        }
      }
    };

    window.addEventListener("focusout", handleFocusOut);
    return () => window.removeEventListener("focusout", handleFocusOut);
  }, [flush]);

  // 3. Tab switch or minimize (visibilitychange)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isDirtyRef.current) {
        flush(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [flush]);

  // 4. Unmount flush (client-side route navigation)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (isDirtyRef.current) {
        flush(true);
      }
    };
  }, [flush]);

  return {
    status,
    setStatus,
    lastSavedAt,
    setLastSavedAt,
    notifyChange,
    flush,
    isDirty: isDirtyRef.current,
  };
}

