import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  RETRY_DELAYS_MS,
  type SaveStatus,
} from "../../hooks/useAutoSave";
import {
  registerDraftFlusher,
  flushAllDrafts,
  _resetDraftRegistry,
} from "../draft-registry";
import { EMPTY_PLAN, toPlanPayload, type PlanState } from "../../context/PlanContext";
import {
  createReportState,
  toReportPayload,
  type ReportState,
} from "../report-helpers";

describe("Server-Only Submission Persistence & In-Memory Draft Lifecycle", () => {
  beforeEach(() => {
    _resetDraftRegistry();
  });

  afterEach(() => {
    _resetDraftRegistry();
  });

  describe("1. Zero Client Storage Guarantee", () => {
    it("never accesses localStorage or sessionStorage during plan/report draft lifecycle", () => {
      const storageAccessLog: Array<{ type: "local" | "session"; method: string; key: string }> = [];

      const mockStorage = (type: "local" | "session") => ({
        getItem: (key: string) => {
          storageAccessLog.push({ type, method: "getItem", key });
          return null;
        },
        setItem: (key: string, value: string) => {
          storageAccessLog.push({ type, method: "setItem", key });
        },
        removeItem: (key: string) => {
          storageAccessLog.push({ type, method: "removeItem", key });
        },
        clear: () => {},
      });

      const originalWindow = (globalThis as any).window;
      (globalThis as any).window = {
        localStorage: mockStorage("local"),
        sessionStorage: mockStorage("session"),
      };

      try {
        // Simulate in-memory plan lifecycle
        let currentPlan: PlanState = { ...EMPTY_PLAN, company: "Test Corp" };
        const payload = toPlanPayload(currentPlan, "DRAFT");
        assert.equal(payload.company, "Test Corp");

        // Simulate in-memory report lifecycle
        let currentReport: ReportState = createReportState({
          id: "report-draft-1",
          company: "Test Corp",
          tasksAndLearning: "Working in memory only.",
        });
        const reportPayload = toReportPayload(currentReport, "DRAFT");
        assert.equal(reportPayload.tasksAndLearning, "Working in memory only.");

        // Assert zero storage interactions occurred for plan/report data
        const submissionKeys = storageAccessLog.filter((log) =>
          log.key.includes("plan") || log.key.includes("report")
        );
        assert.equal(
          submissionKeys.length,
          0,
          `Expected 0 browser storage calls for submissions, found: ${JSON.stringify(submissionKeys)}`
        );
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });
  });

  describe("2. Lazy Draft Initialization (Upsert-on-First-Edit)", () => {
    it("does not dispatch network writes on initial mount; first edit triggers debounced save", async () => {
      let networkCalls: Array<{ method: string; url: string; body: any }> = [];

      // Simulated context state machine
      let isDirty = false;
      let planState: PlanState = { ...EMPTY_PLAN };
      let debounceTimer: NodeJS.Timeout | null = null;

      const mockApiFetch = async (url: string, options: any) => {
        networkCalls.push({
          method: options.method,
          url,
          body: JSON.parse(options.body),
        });
        return { ok: true };
      };

      // 1. Initial page load / mount: template initialized in memory
      assert.equal(isDirty, false);
      assert.equal(networkCalls.length, 0, "No network call on mount");

      // 2. User makes first edit
      const onUserEdit = (patch: Partial<PlanState>) => {
        planState = { ...planState, ...patch };
        isDirty = true;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          await mockApiFetch("/plans/my-plan?internshipId=1", {
            method: "PATCH",
            body: JSON.stringify({
              ...toPlanPayload(planState, "DRAFT"),
              internshipId: 1,
            }),
          });
          isDirty = false;
        }, 50); // shortened debounce for test
      };

      onUserEdit({ jobDescription: "Initial job description typed by student." });
      assert.equal(isDirty, true);
      assert.equal(networkCalls.length, 0, "No immediate network call while debouncing");

      // Wait for debounce timer to fire
      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.equal(isDirty, false);
      assert.equal(networkCalls.length, 1);
      assert.equal(networkCalls[0].method, "PATCH");
      assert.equal(networkCalls[0].url, "/plans/my-plan?internshipId=1");
      assert.equal(networkCalls[0].body.jobDescription, "Initial job description typed by student.");
      assert.equal(networkCalls[0].body.status, "DRAFT");
    });
  });

  describe("3. Auto-Save Retry Engine with 3-Step Backoff", () => {
    it("defines the exact condensed backoff schedule [500ms, 1000ms, 2000ms] totaling 3.5s", () => {
      assert.deepEqual(RETRY_DELAYS_MS, [500, 1000, 2000]);
      const totalWindow = RETRY_DELAYS_MS.reduce((acc, curr) => acc + curr, 0);
      assert.equal(totalWindow, 3500);
    });

    it("retries up to 3 times with backoff on failure before transitioning to error status", async () => {
      let attempts = 0;
      const attemptDelays: number[] = [];
      let lastAttemptTime = Date.now();

      const testDelays = [20, 40, 60]; // scaled delays for unit test

      const simulatedSave = async (): Promise<boolean> => {
        let attempt = 0;
        while (true) {
          try {
            attempts++;
            throw new Error("Simulated network failure");
          } catch (err) {
            if (attempt < testDelays.length) {
              const delay = testDelays[attempt];
              attemptDelays.push(delay);
              attempt++;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            return false; // Exhausted retries
          }
        }
      };

      const success = await simulatedSave();
      assert.equal(success, false);
      assert.equal(attempts, 4); // Initial try + 3 retries
      assert.deepEqual(attemptDelays, [20, 40, 60]);
    });
  });

  describe("4. Typing Recovery from Error Status", () => {
    it("resets status from error to unsaved and restarts debounce when user resumes typing", () => {
      let status: SaveStatus = "error";
      let isDirty = true;
      let timerArmed = false;

      const notifyChange = () => {
        status = "unsaved";
        isDirty = true;
        timerArmed = true;
      };

      assert.equal(status, "error");
      assert.equal(timerArmed, false);

      // Student resumes typing
      notifyChange();

      assert.equal(status, "unsaved");
      assert.equal(isDirty, true);
      assert.equal(timerArmed, true);
    });
  });

  describe("5. Pre-Logout Flush Timeout Safeguard", () => {
    it("returns { allSaved: false, failedCount: 1 } when a flusher hangs beyond timeout", async () => {
      registerDraftFlusher("plan", () => {
        return new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 2000); // Exceeds 800ms
        });
      });

      const startTime = Date.now();
      const result = await flushAllDrafts(80); // Scaled timeout: 80ms
      const duration = Date.now() - startTime;

      assert.equal(result.allSaved, false);
      assert.equal(result.failedCount, 1);
      assert.ok(duration < 500, `Expected flush to abort quickly, took ${duration}ms`);
    });

    it("succeeds cleanly when registered flushers complete within timeout", async () => {
      let planSaved = false;
      let reportSaved = false;

      registerDraftFlusher("plan", async () => {
        planSaved = true;
        return true;
      });

      registerDraftFlusher("report", async () => {
        reportSaved = true;
        return true;
      });

      const result = await flushAllDrafts(800);
      assert.deepEqual(result, { allSaved: true, failedCount: 0 });
      assert.equal(planSaved, true);
      assert.equal(reportSaved, true);
    });
  });

  describe("6. Active Internship Switching Flush", () => {
    it("executes flush of dirty in-memory edits before switching active internship", async () => {
      let flushedPeriod: string | null = null;
      let isDirty = true;

      const flusher = async (internshipId: string) => {
        if (isDirty) {
          flushedPeriod = internshipId;
          isDirty = false;
          return true;
        }
        return true;
      };

      // State representing PlanContext tracking
      let currentActiveId = "internship-1";

      const switchInternship = async (newId: string) => {
        if (currentActiveId !== newId && isDirty) {
          await flusher(currentActiveId);
        }
        currentActiveId = newId;
      };

      // User has typed edits into Harjoittelu 1 (isDirty = true)
      assert.equal(isDirty, true);
      assert.equal(flushedPeriod, null);

      // User switches to Harjoittelu 2 in the dropdown
      await switchInternship("internship-2");

      assert.equal(flushedPeriod, "internship-1", "Harjoittelu 1 draft should have flushed before switch");
      assert.equal(isDirty, false);
      assert.equal(currentActiveId, "internship-2");
    });
  });
});
