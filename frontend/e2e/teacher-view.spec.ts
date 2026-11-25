import { test, expect } from "@playwright/test";
import { loginViaUI } from "./test-users";

test.describe("Teacher View Live Data, Navigation, and Filtering", () => {
  test("hides Guidance evaluation from teacher sidebar and renders live Review queue", async ({
    page,
  }) => {
    await loginViaUI(page, "teacher");

    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Review queue" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "My students" })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Guidance evaluation" })
    ).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  });

  test("expands multi-filter bar on My students and opens Guidance evaluation in context", async ({
    page,
  }) => {
    await loginViaUI(page, "teacher");
    await page.getByRole("link", { name: "My students" }).click();
    await expect(page).toHaveURL(/\/teacher-view\/students/);
    await expect(page.getByRole("heading", { name: "My students" })).toBeVisible();

    const filterToggle = page.getByRole("button", { name: /Filters/i });
    await filterToggle.click();
    await expect(page.getByText("Study type:")).toBeVisible();
    await expect(page.getByText("Status:")).toBeVisible();

    await page.getByRole("button", { name: /Monimuoto/i }).click();
    await page.getByRole("button", { name: /Needs review/i }).click();
    await expect(page.getByText("Study type: Monimuoto")).toBeVisible();
    await expect(page.getByText("Status: Needs review")).toBeVisible();

    await page.getByRole("button", { name: "Clear all" }).click();

    const evalLink = page.getByRole("link", { name: "Evaluation" }).first();
    if ((await evalLink.count()) > 0) {
      await evalLink.click();
      await expect(page).toHaveURL(/\/guidance-evaluation\?internshipId=/);
    }
  });
});
