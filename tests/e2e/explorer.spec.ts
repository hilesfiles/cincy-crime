import { expect, test } from "@playwright/test";

test("dashboard map and routes work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /clearer view/i })).toBeVisible();
  await expect(page.locator("path[data-neighborhood-id]")).toHaveCount(50);
  const mountAiry = page.getByRole("button", { name: /Mt\. Airy statistical area/ });
  await mountAiry.dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "Mt. Airy" })).toBeVisible();
  await page.getByLabel("Map metric").selectOption("property");
  await expect(page).toHaveURL(/metric=property/);
  await page.goto("/neighborhood/mt-airy/");
  await expect(page.getByRole("heading", { name: "Mt. Airy" })).toBeVisible();
  await page.goto("/rankings/");
  await expect(page.getByRole("heading", { name: "Neighborhood rankings" })).toBeVisible();
});
