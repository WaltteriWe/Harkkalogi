import { test, expect } from "@playwright/test";
import { loginViaUI, TEST_USERS } from "./test-users";

test.describe("Planning Form Compliance and Dynamic Calculations", () => {
  test("renders student details, employer fields, and live calculation summary card", async ({
    page,
  }) => {
    await loginViaUI(page, "freshStudent");
    await page.goto("/planning");

    const main = page.getByRole("main");

    // 1. Verify Student Details section
    await expect(main.getByText("1. Opiskelijan tiedot")).toBeVisible();
    await expect(main.getByText("Sara Niemi")).toBeVisible();
    await expect(main.getByText("sara.niemi@metropolia.fi")).toBeVisible();

    // 2. Verify Employer Details section
    await expect(main.getByText("2. Työnantajan tiedot")).toBeVisible();
    await expect(main.locator("#plan-company-input")).toBeVisible();
    await expect(main.locator("#plan-address-input")).toBeVisible();
    await expect(main.locator("#plan-website-input")).toBeVisible();

    // 3. Verify Terms, Workload & Live Calculations
    await expect(main.getByText("3. Harjoittelun ehdot ja laajuus")).toBeVisible();
    const startInput = main.locator("#plan-start-input");
    const endInput = main.locator("#plan-end-input");
    await expect(startInput).toBeVisible();
    await expect(endInput).toBeVisible();

    // Enter reference scenario dates (Sept 1 to Nov 15, 2026)
    await startInput.fill("2026-09-01");
    await endInput.fill("2026-11-15");

    // Check calculation card
    await expect(main.getByText("10.9 vko", { exact: true })).toBeVisible();
    await expect(main.getByText("~409 h")).toBeVisible();
    await expect(main.getByText("15.0 / 15 op", { exact: true })).toBeVisible();
    await expect(main.getByText("✓ Tavoite saavutettu")).toBeVisible();

    // Switch to Part-time and verify live recalculation
    await main.getByRole("button", { name: "Osa-aikainen" }).click();
    const hoursInput = main.locator("#plan-weekly-input");
    await expect(hoursInput).toBeVisible();
    await hoursInput.fill("20");

    await expect(main.getByText("~218 h")).toBeVisible();
    await expect(main.getByText("8.1 / 15 op", { exact: true })).toBeVisible();
    await expect(main.getByText("Huomio: Alle 15 op")).toBeVisible();

    // 4. Verify Workplace Supervisor & Unpaid Placement alert
    await expect(main.getByText("4. Työpaikkaohjaajan tiedot")).toBeVisible();
    await page.getByRole("button", { name: "Palkaton" }).click();
    await expect(
      main.getByText(
        "oppilaitos edellyttää työpaikalta nimetyn ohjaajan yhteystiedot"
      )
    ).toBeVisible();
    await expect(main.locator("#plan-supervisor-name-input")).toBeVisible();
    await expect(main.locator("#plan-supervisor-title-input")).toBeVisible();
    await expect(main.locator("#plan-supervisor-phone-input")).toBeVisible();
    await expect(main.locator("#plan-supervisor-email-input")).toBeVisible();

    // 5. Verify Tasks & Learning Goals threshold counter
    await expect(
      main.getByText("5. Työtehtävät ja omat oppimistavoitteet")
    ).toBeVisible();
    await expect(main.locator("#plan-description-input")).toBeVisible();
  });

  test("validates mandatory fields and blocks submission until requirements are met", async ({
    page,
  }) => {
    await loginViaUI(page, "freshStudent");
    await page.goto("/planning");

    const main = page.getByRole("main");
    const submitBtn = main.getByRole("button", { name: /lähetä hyväksyttäväksi/i });
    await expect(submitBtn).toBeVisible();

    // Submit button is disabled initially when checklist items are incomplete
    await expect(submitBtn).toBeDisabled();
  });

  test("allows collapsing and expanding individual sections and toggling all", async ({
    page,
  }) => {
    await loginViaUI(page, "freshStudent");
    await page.goto("/planning");

    const main = page.getByRole("main");

    // Initially, inputs are visible in Section 2
    await expect(main.locator("#plan-company-input")).toBeVisible();

    // 1. Collapse Section 2 via its "Tiivistä" button
    const collapseSection2Btn = main.getByRole("button", {
      name: "Tiivistä osio: 2. Työnantajan tiedot",
    });
    await collapseSection2Btn.click();

    // After collapsing, the inputs in Section 2 should no longer be visible
    await expect(main.locator("#plan-company-input")).not.toBeVisible();
    // And "Muokkaa" button should be available for Section 2
    const expandSection2Btn = main.getByRole("button", {
      name: "Avaa lisätiedot: 2. Työnantajan tiedot",
    });
    await expect(expandSection2Btn).toBeVisible();

    // 2. Expand Section 2 back by clicking the "Muokkaa" button
    await expandSection2Btn.click();
    await expect(main.locator("#plan-company-input")).toBeVisible();

    // 3. Test "Tiivistä kaikki osiot" toggle
    const toggleAllBtn = main.getByRole("button", { name: "Tiivistä kaikki osiot" });
    await toggleAllBtn.click();

    // All sections should be collapsed
    await expect(main.locator("#plan-company-input")).not.toBeVisible();
    await expect(main.locator("#plan-description-input")).not.toBeVisible();
    await expect(main.getByRole("button", { name: "Avaa kaikki osiot" })).toBeVisible();

    // 4. Click "Avaa kaikki osiot" to restore all
    await main.getByRole("button", { name: "Avaa kaikki osiot" }).click();
    await expect(main.locator("#plan-company-input")).toBeVisible();
    await expect(main.locator("#plan-description-input")).toBeVisible();
  });
});
