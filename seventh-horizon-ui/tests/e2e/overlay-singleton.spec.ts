import { test, expect } from '@playwright/test';

test.describe('Overlay singleton (StrictMode/HMR safe)', () => {
  test('mountOverlays is idempotent; only one veil overlay exists', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.veil-overlay')).toHaveCount(1);

    const hasHelper = await page.evaluate(() => !!(window as any).mountOverlays);
    if (hasHelper) {
      await page.evaluate(() => (window as any).mountOverlays());
      await page.evaluate(() => (window as any).mountOverlays());
    }

    await expect(page.locator('.veil-overlay')).toHaveCount(1);
  });
});
