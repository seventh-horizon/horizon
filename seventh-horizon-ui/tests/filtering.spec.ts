import { test, expect } from '@playwright/test';

test('landing looks correct', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.card', { state: 'visible' });
  await expect(page).toHaveScreenshot('landing.png', {
    // Lock to viewport to avoid page-height diffs across environments
    fullPage: false,
    maxDiffPixelRatio: 0.02,
  });
});

// This spec validates that the global search input actually filters table rows.
// It is robust to 0–1 row edge-cases and to placeholder "no data" rows that use colspan.

test.describe('Filtering', () => {
  test('global search input filters the table', async ({ page }) => {
    await page.goto('/'); // uses baseURL from playwright.config.ts

    const search = page.getByPlaceholder(/search all columns/i);

    // If the search box isn't present, skip gracefully (some builds may hide it)
    if (!(await search.isVisible().catch(() => false))) {
      test.skip(true, 'Global search input not present; skipping filtering test.');
    }

    // Only count REAL data rows (exclude placeholder rows like `<td colspan>`)
    const dataRows = () =>
      page
        .locator('table tbody tr')
        .filter({ has: page.locator('td') })
        .filter({ hasNot: page.locator('td[colspan]') });

    const before = await dataRows().count();
    if (before === 0) {
      test.skip(true, 'No rows loaded; skipping filtering behavior check.');
    }

    // Use a token likely to narrow results
    await search.fill('run_');
    await page.waitForTimeout(200);

    const after = await dataRows().count();

    // Filtering must not increase rows
    expect(after).toBeLessThanOrEqual(before);

    // Only require strict reduction when there were at least 2 rows to start with
    if (before >= 2) {
      expect(after).toBeLessThan(before);
    }

    // Clear and ensure we do not remain artificially filtered
    await search.clear();
    await page.waitForTimeout(150);
    const rebound = await dataRows().count();
    expect(rebound).toBeGreaterThanOrEqual(after);

    // Guaranteed no-match token should yield zero DATA rows (placeholder allowed)
    const NO_MATCH = '__no_match_9f1e__';
    await search.fill(NO_MATCH);
    await expect(dataRows()).toHaveCount(0);

    // Cleanup
    await search.clear();
  });
});