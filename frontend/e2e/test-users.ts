import { type Page, expect } from "@playwright/test";

export const TEST_USERS = {
  student: {
    email: "aino.korhonen@metropolia.fi",
    password: "password123",
    landingPath: "/",
    name: "Aino Korhonen",
    heading: "My internship",
  },
  freshStudent: {
    email: "sara.niemi@metropolia.fi",
    password: "password123",
    landingPath: "/",
    name: "Sara Niemi",
    heading: "My internship",
  },
  teacher: {
    email: "mikko.laine@metropolia.fi",
    password: "password123",
    landingPath: "/teacher-view",
    name: "Mikko Laine",
    heading: "Review queue",
  },
  admin: {
    email: "admin@metropolia.fi",
    password: "password123",
    landingPath: "/admin",
    name: "Admin User",
    heading: "Overview",
  },
} as const;

export type TestRole = keyof typeof TEST_USERS;

/**
 * Asserts that the loading spinner / "Checking authentication..." state has completed
 * and that the target role's dashboard heading is rendered and visible.
 */
export async function expectRoleLandingPage(page: Page, role: TestRole) {
  const user = TEST_USERS[role];

  // Verify URL
  await page.waitForURL((url) => url.pathname === user.landingPath);
  expect(new URL(page.url()).pathname).toBe(user.landingPath);

  // Ensure auth loading spinner is gone
  await expect(page.getByText("Checking authentication...")).not.toBeVisible();

  // Ensure real page heading is fully mounted and visible
  await expect(
    page.getByRole("heading", { name: user.heading }),
  ).toBeVisible();
}

/**
 * Automates logging in through the real /login page UI, waiting until
 * authentication completes and the landing page UI has fully settled.
 */
export async function loginViaUI(page: Page, role: TestRole) {
  const user = TEST_USERS[role];

  await page.goto("/login");

  // Ensure login form is fully rendered
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();

  // Fill credentials
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect and ensure destination page UI has fully loaded
  await expectRoleLandingPage(page, role);
}
