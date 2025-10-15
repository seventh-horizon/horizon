import { test, expect } from '@playwright/test';

test.describe('Filtering', () => {
  test('global search input filters the table', async ({ page }) => {
    // App is expected to be running via Playwright webServer (see playwright.config.ts)
    await page.goto('/');

    const search = page.getByPlaceholder(/search all columns/i);
    const rows = page.locator('[data-test="row"]');

    // Count rows before filtering
    const before = await rows.count();

    // Use a string that should match nothing
    await search.fill('unmatchable-string-xyz-123');
    await page.waitForTimeout(250);

    const after = await rows.count();

    // Should reduce row count
    expect(after).toBeLessThan(before);

    // Allow for 0 or 1 row depending on an optional placeholder/spinner row
    expect(after === 0 || after === 1).toBeTruthy();

    // Cleanup
    await search.clear();
  });

  test('clearing search restores rows', async ({ page }) => {
    await page.goto('/');

    const search = page.getByPlaceholder(/search all columns/i);
    const rows = page.locator('[data-test="row"]');

    const base = await rows.count();
    await search.fill('unmatchable-string-xyz-123');
    await page.waitForTimeout(250);

    // Now clear and expect to bounce back to at least the original count
    await search.clear();
    await page.waitForTimeout(250);

    const restored = await rows.count();
    expect(restored).toBeGreaterThanOrEqual(base);
  });
});
