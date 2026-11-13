/**
 * Utility to purge all application-specific localStorage keys starting with harkkalogi_
 * Ensures that on shared or public computers, no cached draft data, user tokens,
 * or supervisor contact info remains in the browser.
 */
export function purgeHarkkalogiStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("harkkalogi_")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors
  }
}
