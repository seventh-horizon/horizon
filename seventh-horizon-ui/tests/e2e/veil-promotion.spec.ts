import { test, expect } from '@playwright/test';

test.describe('Veil promotion & reduced motion', () => {
  test('reduced motion ON → .animating is never set', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => (window as any).shActivate?.(true));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.veil-overlay.animating')).toHaveCount(0);
    await context.close();
  });

  test('activation toggle controls .animating when reduced motion is OFF', async ({ page }) => {
    await page.goto('/');
    const exists = await page.locator('.veil-overlay').count();
    test.skip(exists === 0, 'veil overlay not present in DOM');

    await page.evaluate(() => (window as any).shActivate?.(false));
    await page.waitForTimeout(20);
    await expect(page.locator('.veil-overlay.animating')).toHaveCount(0);

    await page.evaluate(() => (window as any).shActivate?.(true));
    await page.waitForTimeout(50);
    const count = await page.locator('.veil-overlay.animating').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
