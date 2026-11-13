import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDemoEnabled,
  DEMO_ACCOUNTS,
  DEMO_DEFAULT_PASSWORD,
  DEMO_STORAGE_KEY_SARA,
} from "../../app/login/DemoAccountsCard";

describe("DemoAccountsCard Configuration & Guards", () => {
  it("defines expected demo accounts with valid email addresses", () => {
    assert.equal(DEMO_ACCOUNTS.length, 3);

    const sara = DEMO_ACCOUNTS.find((a) => a.email === "sara.niemi@metropolia.fi");
    assert.ok(sara, "Sara Niemi account should exist");
    assert.equal(sara.name, "Sara Niemi");

    const aino = DEMO_ACCOUNTS.find((a) => a.email === "aino.korhonen@metropolia.fi");
    assert.ok(aino, "Aino Korhonen account should exist");

    const mikko = DEMO_ACCOUNTS.find((a) => a.email === "mikko.laine@metropolia.fi");
    assert.ok(mikko, "Mikko Laine account should exist");
  });

  it("defines default demo credentials and storage key", () => {
    assert.equal(DEMO_DEFAULT_PASSWORD, "password123");
    assert.equal(DEMO_STORAGE_KEY_SARA, "harkkalogi_plan_sara");
  });

  it("enables demo by default in development and test environments", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = "development";
      assert.equal(isDemoEnabled(), true);

      (process.env as any).NODE_ENV = "test";
      assert.equal(isDemoEnabled(), true);
    } finally {
      (process.env as any).NODE_ENV = originalNodeEnv;
    }
  });

  it("disables demo in production environment when not explicitly enabled", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDemoEnable = process.env.NEXT_PUBLIC_ENABLE_DEMO;
    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO;

      assert.equal(isDemoEnabled(), false, "Should be disabled in production by default");
    } finally {
      (process.env as any).NODE_ENV = originalNodeEnv;
      if (originalDemoEnable !== undefined) {
        process.env.NEXT_PUBLIC_ENABLE_DEMO = originalDemoEnable;
      }
    }
  });

  it("enables demo when NEXT_PUBLIC_ENABLE_DEMO=true even in production environment", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDemoEnable = process.env.NEXT_PUBLIC_ENABLE_DEMO;
    try {
      (process.env as any).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";

      assert.equal(isDemoEnabled(), true, "Should be enabled when explicitly set to true");
    } finally {
      (process.env as any).NODE_ENV = originalNodeEnv;
      if (originalDemoEnable !== undefined) {
        process.env.NEXT_PUBLIC_ENABLE_DEMO = originalDemoEnable;
      } else {
        delete process.env.NEXT_PUBLIC_ENABLE_DEMO;
      }
    }
  });
});
