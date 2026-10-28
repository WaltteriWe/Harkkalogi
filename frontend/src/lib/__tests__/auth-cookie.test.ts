import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectPath, TOKEN_COOKIE_NAME } from "../auth-cookie.js";

describe("auth-cookie: TOKEN_COOKIE_NAME", () => {
  it("defines the expected cookie name", () => {
    assert.equal(TOKEN_COOKIE_NAME, "harkkalogi_token");
  });
});

describe("auth-cookie: sanitizeRedirectPath", () => {
  it("returns null for nullish or empty input", () => {
    assert.equal(sanitizeRedirectPath(null), null);
    assert.equal(sanitizeRedirectPath(""), null);
  });

  it("permits valid internal paths", () => {
    assert.equal(sanitizeRedirectPath("/"), "/");
    assert.equal(sanitizeRedirectPath("/reports"), "/reports");
    assert.equal(sanitizeRedirectPath("/report/123"), "/report/123");
    assert.equal(sanitizeRedirectPath("/teacher-view/students"), "/teacher-view/students");
  });

  it("rejects open redirects and external URLs", () => {
    assert.equal(sanitizeRedirectPath("https://malicious.com"), null);
    assert.equal(sanitizeRedirectPath("http://malicious.com"), null);
    assert.equal(sanitizeRedirectPath("//malicious.com"), null);
    assert.equal(sanitizeRedirectPath("///malicious.com"), null);
    assert.equal(sanitizeRedirectPath("javascript:alert(1)"), null);
  });
});

