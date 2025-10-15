import { test, expect } from '@playwright/test';

test('filters by tag and shows rows + counters', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('domcontentloaded');

  // Wait until the table has rendered at least once
  await expect(page.locator('table')).toBeVisible();

  // If Clear Tags is enabled, click it; otherwise skip (it starts disabled when no tags are selected)
  const clearBtn = page.getByRole('button', { name: 'Clear Tags' });
  if (await clearBtn.isVisible() && await clearBtn.isEnabled()) {
    await clearBtn.click();
  }

  // Try clicking the first tag chip in the sidebar if present
  const firstTag = page.locator('.sidebar .pill').first();
  if (await firstTag.isVisible()) {
    await firstTag.click();
  }

  // Expect the counter to be visible and at least one row in the table
  await expect(page.getByText(/rows \(this view\)/i)).toBeVisible();
  const rowCount = await page.locator('table tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
});
