import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  registerDraftFlusher,
  flushAllDrafts,
  isOnline,
  _resetDraftRegistry,
} from "../draft-registry";
import { purgeHarkkalogiStorage } from "../storage-helpers";

describe("draft-registry: flusher lifecycle and execution", () => {
  beforeEach(() => {
    _resetDraftRegistry();
  });

  afterEach(() => {
    _resetDraftRegistry();
  });

  it("returns allSaved: true when no flushers are registered", async () => {
    const result = await flushAllDrafts();
    assert.deepEqual(result, { allSaved: true, failedCount: 0 });
  });

  it("successfully registers and unregisters a flusher", async () => {
    let callCount = 0;
    const unregister = registerDraftFlusher(async () => {
      callCount++;
      return true;
    });

    const result1 = await flushAllDrafts();
    assert.equal(result1.allSaved, true);
    assert.equal(callCount, 1);

    unregister();

    const result2 = await flushAllDrafts();
    assert.equal(result2.allSaved, true);
    assert.equal(callCount, 1); // Not called again
  });

  it("returns allSaved: true when multiple flushers succeed", async () => {
    registerDraftFlusher(async () => true);
    registerDraftFlusher(async () => true);

    const result = await flushAllDrafts();
    assert.deepEqual(result, { allSaved: true, failedCount: 0 });
  });

  it("returns allSaved: false when a flusher returns false", async () => {
    registerDraftFlusher(async () => true);
    registerDraftFlusher(async () => false);

    const result = await flushAllDrafts();
    assert.equal(result.allSaved, false);
    assert.equal(result.failedCount, 1);
  });

  it("handles flusher throwing an exception gracefully as failure", async () => {
    registerDraftFlusher(async () => {
      throw new Error("Network timeout or connection refused");
    });
    registerDraftFlusher(async () => true);

    const result = await flushAllDrafts();
    assert.equal(result.allSaved, false);
    assert.equal(result.failedCount, 1);
  });

  it("times out if a flusher hangs indefinitely", async () => {
    registerDraftFlusher(
      () =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 500);
        })
    );

    // Timeout set to 50ms should trigger timeout fallback
    const result = await flushAllDrafts(50);
    assert.equal(result.allSaved, false);
    assert.equal(result.failedCount, 1);
  });
});

describe("draft-registry: offline detection", () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    _resetDraftRegistry();
  });

  it("isOnline returns true when navigator is undefined or onLine is true", () => {
    assert.equal(isOnline(), true);
  });

  it("detects offline status when navigator.onLine is false", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });

    assert.equal(isOnline(), false);

    let called = false;
    registerDraftFlusher(async () => {
      called = true;
      return true;
    });

    const result = await flushAllDrafts();
    assert.equal(result.allSaved, false);
    assert.equal(called, false); // Flusher shouldn't even be called when offline
  });
});

describe("storage-helpers: purgeHarkkalogiStorage", () => {
  it("removes all harkkalogi_ keys while preserving unrelated localStorage and sessionStorage keys", () => {
    const mockLocalStore: Record<string, string> = {
      harkkalogi_user: '{"id": 1, "name": "Student"}',
      harkkalogi_token: "jwt-token-xyz",
      other_app_preference: "dark_mode",
      theme_setting: "contrast",
    };
    const mockSessionStore: Record<string, string> = {
      harkkalogi_plan_sara: '{"scope": "h1"}',
      harkkalogi_reports_sara: '{"reports": []}',
      harkkalogi_active_internship: "internship-1",
      session_preference: "tab_2",
    };

    const createMockStorage = (store: Record<string, string>) => ({
      get length() {
        return Object.keys(store).length;
      },
      key(idx: number) {
        return Object.keys(store)[idx] ?? null;
      },
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, val: string) {
        store[key] = val;
      },
      removeItem(key: string) {
        delete store[key];
      },
    });

    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: createMockStorage(mockLocalStore),
        sessionStorage: createMockStorage(mockSessionStore),
      },
      configurable: true,
      writable: true,
    });

    purgeHarkkalogiStorage();

    assert.equal(mockLocalStore.harkkalogi_user, undefined);
    assert.equal(mockLocalStore.harkkalogi_token, undefined);
    assert.equal(mockLocalStore.other_app_preference, "dark_mode");
    assert.equal(mockLocalStore.theme_setting, "contrast");

    assert.equal(mockSessionStore.harkkalogi_plan_sara, undefined);
    assert.equal(mockSessionStore.harkkalogi_reports_sara, undefined);
    assert.equal(mockSessionStore.harkkalogi_active_internship, undefined);
    assert.equal(mockSessionStore.session_preference, "tab_2");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it("handles missing window or localStorage gracefully without throwing", () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    assert.doesNotThrow(() => {
      purgeHarkkalogiStorage();
    });

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });
});
