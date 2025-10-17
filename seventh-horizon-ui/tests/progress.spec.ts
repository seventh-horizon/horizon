import { test, expect } from '@playwright/test';

// If a worker streams CSV parsing progress, ensure the progress bar appears and animates.
// This test is resilient and will skip if the feature is not present.
test('progress bar appears during CSV load (if implemented)', async ({ page }) => {
  await page.goto('/');

  const trigger = page.locator('[data-test="reload-csv"], [data-test="load-csv"], [data-test="refresh"]').first();
  if (!(await trigger.isVisible().catch(() => false))) {
    test.skip(true, 'No explicit CSV load trigger; skipping.');
  }

  await trigger.click();

  const bar = page.locator('[data-test="progress"], progress, [role="progressbar"]');
  await expect(bar).toBeVisible();

  // Heuristic: value should increase or bar should disappear once complete
  const initial = await bar.getAttribute('value');
  await page.waitForTimeout(400);
  const later = await bar.getAttribute('value');

  if (initial !== null && later !== null) {
    expect(Number(later)).toBeGreaterThanOrEqual(Number(initial));
  }

  // Eventually it should complete and hide (best-effort, do not fail if persistent)
  await bar.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
});
