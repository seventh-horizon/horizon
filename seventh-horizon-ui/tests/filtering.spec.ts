import { test, expect } from '@playwright/test';

test('loads the app and shows the table, basic filter interaction', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // App renders
  await expect(page.locator('table')).toBeVisible();

  // Try a very gentle interaction if a search box exists
  const searchBoxes = page.locator('input[placeholder*="Search" i], input[type="search"]');
  if (await searchBoxes.count()) {
    await searchBoxes.first().fill('a');
  }

  // We should still have at least one row rendered
  const rowCount = await page.locator('table tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
});
