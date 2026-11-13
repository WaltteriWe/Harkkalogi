import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { demoGuard } from "../demo.middleware.ts";
import { env } from "../../config/env.ts";
import { authRoutes } from "../../modules/auth/index.ts";

describe("Demo Middleware (demoGuard)", () => {
  it("allows requests to continue when not in production environment", () => {
    let nextCalled = false;
    let statusCode: number | null = null;
    let responseData: any = null;

    const req = {} as any;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    } as any;
    const next = () => {
      nextCalled = true;
    };

    demoGuard(req, res, next);

    assert.equal(nextCalled, true, "next() should be called in non-production");
    assert.equal(statusCode, null);
    assert.equal(responseData, null);
  });

  it("blocks requests with 403 Forbidden when in production environment", () => {
    const originalEnv = env.NODE_ENV;
    (env as any).NODE_ENV = "production";

    try {
      let nextCalled = false;
      let statusCode: number | null = null;
      let responseData: any = null;

      const req = {} as any;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseData = data;
          return this;
        },
      } as any;
      const next = () => {
        nextCalled = true;
      };

      demoGuard(req, res, next);

      assert.equal(nextCalled, false, "next() must not be called in production");
      assert.equal(statusCode, 403);
      assert.ok(
        responseData?.error?.includes("Demo features are disabled in production"),
        "Should return production forbidden error message"
      );
    } finally {
      (env as any).NODE_ENV = originalEnv;
    }
  });

  it("ensures /reset-demo is no longer mounted on core authRoutes", () => {
    const registeredAuthRoutes = authRoutes.stack
      .map((layer: any) => layer.route?.path)
      .filter(Boolean);

    assert.ok(
      registeredAuthRoutes.includes("/login"),
      "authRoutes should include /login"
    );
    assert.ok(
      registeredAuthRoutes.includes("/me"),
      "authRoutes should include /me"
    );
    assert.ok(
      registeredAuthRoutes.includes("/logout"),
      "authRoutes should include /logout"
    );
    assert.equal(
      registeredAuthRoutes.includes("/reset-demo"),
      false,
      "/reset-demo must not be mounted on core authRoutes"
    );
  });
});
