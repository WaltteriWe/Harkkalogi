/**
 * Central registry for unflushed draft sync before logout or route navigation.
 * Allows components/contexts (ReportContext, PlanContext, etc.) to register
 * an asynchronous flush routine that persists local unsaved changes to the backend.
 */

export interface FlushResult {
  allSaved: boolean;
  failedCount: number;
}

export type DraftFlusher = () => Promise<boolean>;

let autoIdCounter = 0;
const flushers = new Map<string, DraftFlusher>();

/**
 * Register an async flusher function under an idempotent string identifier.
 * Also supports the legacy single-argument signature for backward compatibility.
 * Returns an unregister function to call on component/hook unmount.
 */
export function registerDraftFlusher(id: string, flusher: DraftFlusher): () => void;
export function registerDraftFlusher(flusher: DraftFlusher): () => void;
export function registerDraftFlusher(
  idOrFlusher: string | DraftFlusher,
  maybeFlusher?: DraftFlusher
): () => void {
  const id = typeof idOrFlusher === "string" ? idOrFlusher : `flusher-${++autoIdCounter}`;
  const flusher = typeof idOrFlusher === "function" ? idOrFlusher : maybeFlusher!;

  flushers.set(id, flusher);
  return () => {
    if (flushers.get(id) === flusher) {
      flushers.delete(id);
    }
  };
}

/**
 * Helper to determine whether the browser has active internet connectivity.
 * Returns false if navigator.onLine is explicitly false.
 */
export function isOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Invokes all registered flushers concurrently with a timeout safeguard.
 * Default timeout is 800 ms to prioritize fast logout on shared kiosks.
 * If the user is offline or any flusher fails/times out, returns allSaved: false.
 */
export async function flushAllDrafts(timeoutMs = 800): Promise<FlushResult> {
  if (!isOnline()) {
    return {
      allSaved: false,
      failedCount: Math.max(flushers.size, 1),
    };
  }

  if (flushers.size === 0) {
    return { allSaved: true, failedCount: 0 };
  }

  const flusherPromises = Array.from(flushers.values()).map(async (fn) => {
    try {
      return await fn();
    } catch {
      return false;
    }
  });

  const timeoutPromise = new Promise<boolean[]>((resolve) => {
    setTimeout(() => {
      resolve(new Array(flushers.size).fill(false));
    }, timeoutMs);
  });

  const results = await Promise.race([
    Promise.all(flusherPromises),
    timeoutPromise,
  ]);

  const failedCount = results.filter((success) => !success).length;

  return {
    allSaved: failedCount === 0,
    failedCount,
  };
}

/**
 * Helper strictly for unit test isolation to clear registered flushers.
 */
export function _resetDraftRegistry(): void {
  flushers.clear();
  autoIdCounter = 0;
}
