"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T, isBackground?: boolean, isUnmounting?: boolean) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export interface AutoSaveReturn {
  status: SaveStatus;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  notifyChange: () => void;
  flush: (isBackground?: boolean, isUnmounting?: boolean) => Promise<boolean>;
  saveNow: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  setStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  setLastSavedAt: React.Dispatch<React.SetStateAction<string | null>>;
}

export const RETRY_DELAYS_MS = [500, 1000, 2000];

export function formatCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): AutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const latestDataRef = useRef<T>(data);
  latestDataRef.current = data;

  const isDirtyRef = useRef<boolean>(false);
  const changeVersionRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const flush = useCallback(
    async (isBackground = false, isUnmounting = false): Promise<boolean> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!enabled) {
        return true;
      }

      // If an auto-save is already in-flight, wait for it
      if (isSavingRef.current && savePromiseRef.current) {
        const inFlightResult = await savePromiseRef.current;
        if (!isDirtyRef.current) {
          return inFlightResult;
        }
      }

      if (!isDirtyRef.current) {
        return true;
      }

      const versionAtStart = changeVersionRef.current;
      isSavingRef.current = true;
      setStatus("saving");

      const runSave = async (): Promise<boolean> => {
        let attempt = 0;
        while (true) {
          try {
            await onSaveRef.current(
              latestDataRef.current,
              isBackground,
              isUnmounting
            );

            if (changeVersionRef.current === versionAtStart) {
              isDirtyRef.current = false;
              setStatus("saved");
              setLastSavedAt(formatCurrentTime());
              return true;
            } else {
              // Newer changes were typed while onSave was in-flight
              isDirtyRef.current = true;
              setStatus("unsaved");
              if (!timerRef.current) {
                timerRef.current = setTimeout(() => {
                  flush();
                }, debounceMs);
              }
              return false;
            }
          } catch (err: any) {
            // If the plan is locked (409 Conflict) or forbidden (403 Forbidden), cancel retries immediately
            const statusCode = err?.status ?? err?.statusCode;
            if (statusCode === 409 || statusCode === 403) {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              isDirtyRef.current = false;
              setStatus("saved");
              return false;
            }

            // If newer changes arrived while failing, stop retrying this old version
            if (changeVersionRef.current !== versionAtStart) {
              isDirtyRef.current = true;
              setStatus("unsaved");
              if (!timerRef.current) {
                timerRef.current = setTimeout(() => {
                  flush();
                }, debounceMs);
              }
              return false;
            }

            if (attempt < RETRY_DELAYS_MS.length && !isUnmounting) {
              const delay = RETRY_DELAYS_MS[attempt];
              attempt++;
              await new Promise((resolve) => setTimeout(resolve, delay));
              if (changeVersionRef.current !== versionAtStart) {
                isDirtyRef.current = true;
                setStatus("unsaved");
                if (!timerRef.current) {
                  timerRef.current = setTimeout(() => {
                    flush();
                  }, debounceMs);
                }
                return false;
              }
              continue;
            }

            // Exhausted retries or unmounting
            setStatus("error");
            console.error("Auto-save draft failed after retries:", err);
            return false;
          }
        }
      };

      try {
        const p = runSave();
        savePromiseRef.current = p;
        return await p;
      } finally {
        isSavingRef.current = false;
        savePromiseRef.current = null;
      }
    },
    [enabled, debounceMs]
  );

  const notifyChange = useCallback(() => {
    if (!enabled) return;
    changeVersionRef.current += 1;
    isDirtyRef.current = true;
    setStatus("unsaved");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, debounceMs);
  }, [debounceMs, flush, enabled]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return await flush(false, false);
  }, [flush]);

  const retry = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("unsaved");
    return await flush(false, false);
  }, [flush]);

  // 1. Browser/Window close guard (beforeunload)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || isSavingRef.current || status === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  // 2. Tab switch or minimize (visibilitychange)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isDirtyRef.current) {
        flush(true, false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [flush]);

  // 3. Unmount flush (client-side route navigation)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (isDirtyRef.current) {
        flush(true, true);
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
    saveNow,
    retry,
    isDirty: isDirtyRef.current,
    isSaving: isSavingRef.current || status === "saving",
  };
}
