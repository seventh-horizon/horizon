import { test, expect } from '@playwright/test';

test.describe('Overlay singleton (StrictMode/HMR safe)', () => {
  test('mountOverlays is idempotent (no new overlays after repeated calls)', async ({ page }) => {
    await page.goto('/');

    // Baseline: whatever count the app ships with
    const initialCount = await page.locator('.veil-overlay').count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // If helper is exposed, call it a few times and verify we don't add more
    const hasHelper = await page.evaluate(() => !!(window as any).mountOverlays);
    if (hasHelper) {
      await page.evaluate(() => (window as any).mountOverlays());
      await page.evaluate(() => (window as any).mountOverlays());
      await page.evaluate(() => (window as any).mountOverlays());
    }

    const finalCount = await page.locator('.veil-overlay').count();
    expect(finalCount).toBe(initialCount);
  });
});
