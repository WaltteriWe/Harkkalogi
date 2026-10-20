import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLandingPath,
  isRouteAllowedForRole,
  ROLE_LANDING_PATHS,
} from "../auth-routes.js";

describe("auth-routes: ROLE_LANDING_PATHS and getLandingPath", () => {
  it("defines expected landing paths for each role", () => {
    assert.equal(ROLE_LANDING_PATHS.student, "/");
    assert.equal(ROLE_LANDING_PATHS.teacher, "/teacher-view");
    assert.equal(ROLE_LANDING_PATHS.admin, "/admin");
  });

  it("resolves correct landing path for valid roles", () => {
    assert.equal(getLandingPath("student"), "/");
    assert.equal(getLandingPath("teacher"), "/teacher-view");
    assert.equal(getLandingPath("admin"), "/admin");
  });

  it("falls back to '/' for unknown or nullish roles", () => {
    assert.equal(getLandingPath(null), "/");
    assert.equal(getLandingPath(undefined), "/");
    assert.equal(getLandingPath("unknown-role"), "/");
  });
});

describe("auth-routes: isRouteAllowedForRole", () => {
  describe("student role", () => {
    it("allows student to access student overview, reports, documents, and messages", () => {
      assert.equal(isRouteAllowedForRole("student", "/"), true);
      assert.equal(isRouteAllowedForRole("student", "/reports"), true);
      assert.equal(isRouteAllowedForRole("student", "/report"), true);
      assert.equal(isRouteAllowedForRole("student", "/report/123"), true);
      assert.equal(isRouteAllowedForRole("student", "/documents"), true);
      assert.equal(isRouteAllowedForRole("student", "/documents/template-1"), true);
      assert.equal(isRouteAllowedForRole("student", "/messages"), true);
    });

    it("prevents student from accessing teacher and admin views", () => {
      assert.equal(isRouteAllowedForRole("student", "/teacher-view"), false);
      assert.equal(isRouteAllowedForRole("student", "/teacher-view/students"), false);
      assert.equal(isRouteAllowedForRole("student", "/admin"), false);
      assert.equal(isRouteAllowedForRole("student", "/admin/users"), false);
      assert.equal(isRouteAllowedForRole("student", "/admin/settings"), false);
    });
  });

  describe("teacher role", () => {
    it("allows teacher to access teacher views and shared messages", () => {
      assert.equal(isRouteAllowedForRole("teacher", "/teacher-view"), true);
      assert.equal(isRouteAllowedForRole("teacher", "/teacher-view/students"), true);
      assert.equal(isRouteAllowedForRole("teacher", "/messages"), true);
    });

    it("prevents teacher from accessing student dashboard and admin views", () => {
      assert.equal(isRouteAllowedForRole("teacher", "/"), false);
      assert.equal(isRouteAllowedForRole("teacher", "/reports"), false);
      assert.equal(isRouteAllowedForRole("teacher", "/report/123"), false);
      assert.equal(isRouteAllowedForRole("teacher", "/documents"), false);
      assert.equal(isRouteAllowedForRole("teacher", "/admin"), false);
      assert.equal(isRouteAllowedForRole("teacher", "/admin/users"), false);
    });
  });

  describe("admin role", () => {
    it("allows admin to access admin routes", () => {
      assert.equal(isRouteAllowedForRole("admin", "/admin"), true);
      assert.equal(isRouteAllowedForRole("admin", "/admin/users"), true);
      assert.equal(isRouteAllowedForRole("admin", "/admin/programmes"), true);
      assert.equal(isRouteAllowedForRole("admin", "/admin/settings"), true);
    });

    it("prevents admin from accessing student overview and teacher view", () => {
      assert.equal(isRouteAllowedForRole("admin", "/"), false);
      assert.equal(isRouteAllowedForRole("admin", "/reports"), false);
      assert.equal(isRouteAllowedForRole("admin", "/documents"), false);
      assert.equal(isRouteAllowedForRole("admin", "/teacher-view"), false);
    });
  });

  describe("invalid or empty role", () => {
    it("rejects access for unknown roles", () => {
      assert.equal(isRouteAllowedForRole("guest", "/"), false);
      assert.equal(isRouteAllowedForRole("anonymous", "/admin"), false);
      assert.equal(isRouteAllowedForRole("", "/messages"), false);
    });
  });
});

