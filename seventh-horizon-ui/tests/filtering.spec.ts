import { test, expect } from '@playwright/test';

test('loads and shows a table; basic interaction works', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // App renders table
  await expect(page.locator('table')).toBeVisible();

  // Optional: try a quick search if there is a search input
  const search = page.locator('input[placeholder*="Search" i], input[type="search"]');
  if (await search.count()) {
    await search.first().fill('a');
  }

  // We should still have rows
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});
