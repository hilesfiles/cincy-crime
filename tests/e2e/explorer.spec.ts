import { expect, test } from "@playwright/test";

test("dashboard map and routes work", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /clearer view/i })).toBeVisible();
  await expect(page.locator("path[data-neighborhood-id]")).toHaveCount(50);
  const mountAiry = page.getByRole("button", { name: /Mt\. Airy statistical area/ });
  await mountAiry.dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "Mt. Airy" })).toBeVisible();
  await page.getByLabel("Map metric").selectOption("property");
  await expect(page).toHaveURL(/metric=property/);
  await page.getByRole("button", { name: "Calendar year" }).click();
  await page.getByLabel("Calendar year").selectOption("2011");
  await expect(page).toHaveURL(/period=annual/);
  await expect(page).toHaveURL(/year=2011/);
  await mountAiry.dispatchEvent("click");
  await expect(page.getByText("Selected area · 2011")).toBeVisible();
  await page.goto("/neighborhood/mt-airy/?period=annual&year=2019");
  await expect(page.getByRole("heading", { name: "Mt. Airy" })).toBeVisible();
  await expect(page.getByLabel("Calendar year")).toHaveValue("2019");
  await page.goto("/rankings/");
  await expect(page.getByRole("heading", { name: "Neighborhood rankings" })).toBeVisible();
  await page.goto("/trends/");
  await expect(page.getByRole("heading", { name: "Long-term trends" })).toBeVisible();
  await expect(page.locator(".recharts-line-curve")).toBeVisible();
  await page.getByLabel("Series").selectOption("sameDateYtd");
  await expect(page.getByRole("cell", { name: "2026" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
