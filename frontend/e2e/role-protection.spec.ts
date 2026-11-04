import { test, expect } from "@playwright/test";
import { loginViaUI, expectRoleLandingPage } from "./test-users";

test.describe("Role Protection and Access Control", () => {
  test.describe("Unauthenticated User", () => {
    test("redirects from student home (/) to /login", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL((url) => url.pathname === "/login");
      expect(new URL(page.url()).pathname).toBe("/login");

      // Verify login form is fully rendered
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("redirects from /teacher-view to /login?from=/teacher-view", async ({ page }) => {
      await page.goto("/teacher-view");
      await page.waitForURL((url) => url.pathname === "/login");
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("from")).toBe("/teacher-view");

      // Verify login form is fully rendered
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("redirects from /admin to /login?from=/admin", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForURL((url) => url.pathname === "/login");
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("from")).toBe("/admin");

      // Verify login form is fully rendered
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("redirects from /planning to /login?from=/planning", async ({ page }) => {
      await page.goto("/planning");
      await page.waitForURL((url) => url.pathname === "/login");
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("from")).toBe("/planning");

      // Verify login form is fully rendered
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("redirects from /messages to /login?from=/messages", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForURL((url) => url.pathname === "/login");
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("from")).toBe("/messages");

      // Verify login form is fully rendered
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });
  });

  test.describe("Student Role Isolation", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, "student");
    });

    test("is allowed on student pages (/, /planning, /messages)", async ({ page }) => {
      await page.goto("/planning");
      await page.waitForURL((url) => url.pathname === "/planning");
      await expect(page.getByText("Checking authentication...")).not.toBeVisible();
      await expect(page.locator(".app-shell")).toBeVisible();

      await page.goto("/messages");
      await page.waitForURL((url) => url.pathname === "/messages");
      await expect(page.getByText("Checking authentication...")).not.toBeVisible();
      await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    });

    test("is blocked from /admin and redirected to student home (/)", async ({ page }) => {
      await page.goto("/admin");
      // Must wait for redirect to finish and real student dashboard to be visible
      await expectRoleLandingPage(page, "student");
    });

    test("is blocked from /teacher-view and redirected to student home (/)", async ({ page }) => {
      await page.goto("/teacher-view");
      // Must wait for redirect to finish and real student dashboard to be visible
      await expectRoleLandingPage(page, "student");
    });

    test("is redirected away from /login to student home (/)", async ({ page }) => {
      await page.goto("/login");
      // Must wait for redirect to finish and real student dashboard to be visible
      await expectRoleLandingPage(page, "student");
    });
  });

  test.describe("Teacher Role Isolation", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, "teacher");
    });

    test("is allowed on teacher pages (/teacher-view, /messages)", async ({ page }) => {
      await page.goto("/messages");
      await page.waitForURL((url) => url.pathname === "/messages");
      await expect(page.getByText("Checking authentication...")).not.toBeVisible();
      await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    });

    test("is blocked from student home (/) and redirected to /teacher-view", async ({ page }) => {
      await page.goto("/");
      // Must wait for redirect to finish and teacher review queue to be visible
      await expectRoleLandingPage(page, "teacher");
    });

    test("is blocked from /admin and redirected to /teacher-view", async ({ page }) => {
      await page.goto("/admin");
      // Must wait for redirect to finish and teacher review queue to be visible
      await expectRoleLandingPage(page, "teacher");
    });

    test("is redirected away from /login to /teacher-view", async ({ page }) => {
      await page.goto("/login");
      // Must wait for redirect to finish and teacher review queue to be visible
      await expectRoleLandingPage(page, "teacher");
    });
  });

  test.describe("Admin Role Isolation", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page, "admin");
    });

    test("is allowed on admin pages (/admin)", async ({ page }) => {
      await page.goto("/admin");
      await expectRoleLandingPage(page, "admin");
    });

    test("is blocked from student home (/) and redirected to /admin", async ({ page }) => {
      await page.goto("/");
      // Must wait for redirect to finish and admin overview to be visible
      await expectRoleLandingPage(page, "admin");
    });

    test("is blocked from /teacher-view and redirected to /admin", async ({ page }) => {
      await page.goto("/teacher-view");
      // Must wait for redirect to finish and admin overview to be visible
      await expectRoleLandingPage(page, "admin");
    });

    test("is redirected away from /login to /admin", async ({ page }) => {
      await page.goto("/login");
      // Must wait for redirect to finish and admin overview to be visible
      await expectRoleLandingPage(page, "admin");
    });
  });
});
