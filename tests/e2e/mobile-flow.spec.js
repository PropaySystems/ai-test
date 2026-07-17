import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("guest completes tutorial and opens a mobile game board", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /capture every piece/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Try the tutorial" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Play guest match" }).click();

  await expect(
    page.getByRole("grid", { name: "Edge Kings board" }),
  ).toBeVisible();
  const gridcells = page.getByRole("gridcell");
  await expect(gridcells).toHaveCount(64);

  const cellBounds = await gridcells.evaluateAll((cells) =>
    cells.map((cell) => {
      const { width, height } = cell.getBoundingClientRect();
      return { width, height };
    }),
  );
  const widths = cellBounds.map(({ width }) => width);
  const heights = cellBounds.map(({ height }) => height);
  const tolerance = 1;

  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(
    tolerance,
  );
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(
    tolerance,
  );
  for (const { width, height } of cellBounds) {
    expect(Math.abs(width - height)).toBeLessThanOrEqual(tolerance);
  }

  await expect(page.getByText("Easy computer")).toBeVisible();
  await expect(page.getByText("Untimed")).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("player can register and reach the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create profile" }).click();

  const unique = Date.now();
  await page.getByLabel("Display name").fill(`Player${unique}`);
  await page.getByLabel("Email").fill(`player-${unique}@example.com`);
  await page.getByLabel("Password").fill("SecurePass123");
  await page.getByRole("button", { name: "Create profile" }).click();

  await expect(page.getByText(/ready, player/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();
});
