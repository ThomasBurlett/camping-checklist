import { expect, test } from "@playwright/test";

test("opens an activity from the checklist hub and tracks progress", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  await expect(page.getByRole("heading", { name: "Pick a plan and pack it right." }))
    .toBeVisible();

  await page.getByRole("button", { name: /Travel/ }).click();
  await page.getByRole("link", { name: /1 day trip/ }).click();

  await expect(page.getByLabel("Switch activity checklist")).toHaveValue("travel-1-day");
  await expect(page.getByText("0/35 packed")).toBeVisible();

  await page.getByText("Wallet with card and cash").click();

  await expect(page.getByText("1/35 packed")).toBeVisible();
});
