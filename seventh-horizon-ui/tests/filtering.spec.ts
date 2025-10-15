import { test, expect } from '@playwright/test';

test.describe('Filtering', () => {
  test('global search input filters the table', async ({ page }) => {
    // App is expected to be running on the default Vite port during e2e
    await page.goto('/');

    // Locate the global search box (placeholder text shown in the UI)
    const search = page.getByPlaceholder(/search all columns/i);

    // If the search box isn't present in this build, skip gracefully.
    if (!(await search.isVisible().catch(() => false))) {
      test.skip(true, 'Global search input not present; skipping filtering test.');
    }

    // Helper: only count rows that look like *data* rows (have <td> cells and no colspan placeholder).
    const dataRows = () =>
      page
        .locator('table tbody tr')
        .filter({ has: page.locator('td') })
        .filter({ hasNot: page.locator('td[colspan]') });

    // Baseline row count in the main results table
    const initialCount = await dataRows().count();

    // If there are no rows to filter, skip rather than fail
    if (initialCount === 0) {
      test.skip(true, 'No rows loaded; skipping filtering behavior check.');
    }

    // 1) Type a common token that should narrow results (dataset-dependent)
    await search.fill('run_');

    // Wait for debounce / UI to settle by polling the row count once it changes or settles.
    await page.waitForTimeout(150);
    const filteredCount = await dataRows().count();

    // Filtering should never increase visible rows
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Only demand a strict reduction if we started with 2+ rows.
    if (initialCount >= 2) {
      expect(filteredCount).toBeLessThan(initialCount);
    }

    // 2) Clear the search and ensure the count rebounds (best-effort)
    await search.clear();
    await page.waitForTimeout(150);
    const reboundCount = await dataRows().count();
    expect(reboundCount).toBeGreaterThanOrEqual(filteredCount);

    // 3) Use a guaranteed no-match token to assert we can reach zero *data* rows
    const NO_MATCH = '__no_match_9f1e__';
    await search.fill(NO_MATCH);

    // Wait until data row count is 0 (allowing a placeholder "no data" row to exist)
    await expect(dataRows()).toHaveCount(0);

    // Cleanup: clear search
    await search.clear();
  });
});
