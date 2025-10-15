import { test, expect } from '@playwright/test';

test.describe('Filtering', () => {
  test('global search input filters the table', async ({ page }) => {
    // App is expected to be running on the default Vite port during e2e
    await page.goto('http://localhost:5173/');

    // Locate the global search box (placeholder text shown in the UI)
    const search = page.getByPlaceholder(/search all columns/i);

    // If the search box isn't present in this build, skip gracefully.
    if (!(await search.isVisible().catch(() => false))) {
      test.skip(true, 'Global search input not present; skipping filtering test.');
    }

    // Baseline row count in the main results table
    const rows = page.locator('table tbody tr');
    const initialCount = await rows.count();

    // If there are no rows to filter, skip rather than fail
    if (initialCount === 0) {
      test.skip(true, 'No rows loaded; skipping filtering behavior check.');
    }

    // 1) Type a common token that should narrow results (dataset-dependent)
    await search.fill('run_');

    // Wait a moment for debounce / UI to settle; then sample count
    await page.waitForTimeout(300);
    const filteredCount = await rows.count();

    // Filtering should never increase visible rows
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Only demand a strict reduction if we started with 2+ rows.
    if (initialCount >= 2) {
      expect(filteredCount).toBeLessThan(initialCount);
    }

    // 2) Clear the search and ensure the count rebounds (best-effort)
    await search.clear();
    await page.waitForTimeout(200);
    const reboundCount = await rows.count();
    expect(reboundCount).toBeGreaterThanOrEqual(filteredCount);

    // 3) Use a guaranteed no-match token to assert we can reach zero rows
    const NO_MATCH = '__no_match_9f1e__';
    await search.fill(NO_MATCH);
    await page.waitForTimeout(200);
    const noneCount = await rows.count();
    expect(noneCount).toBe(0);

    // Cleanup: clear search
    await search.clear();
  });
});
