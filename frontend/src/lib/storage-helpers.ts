/**
 * Utility to purge all application-specific localStorage and sessionStorage keys
 * starting with harkkalogi_
 * Ensures that on shared or public computers, no cached draft data, user tokens,
 * or supervisor contact info remains in the browser.
 */
export function purgeHarkkalogiStorage(): void {
  if (typeof window === "undefined") return;

  const purge = (storage: Storage | undefined) => {
    if (!storage) return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith("harkkalogi_")) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        storage.removeItem(key);
      }
    } catch {
      // Ignore storage access errors
    }
  };

  purge(window.localStorage);
  purge(window.sessionStorage);
}
