import { test, expect } from '@playwright/test';

test.describe('Filtering', () => {
  test('typing in "Search all columns" reduces visible rows', async ({ page }) => {
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

    // Type a common token that should narrow results (adjust if your dataset differs)
    await search.fill('run_');
    await page.waitForTimeout(300); // allow UI debounce / filtering to settle

    const filteredCount = await rows.count();

    // The filter should not increase the number of visible rows
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    // And should ideally reduce them for typical datasets
    expect(filteredCount).toBeLessThan(initialCount);
  });
});
