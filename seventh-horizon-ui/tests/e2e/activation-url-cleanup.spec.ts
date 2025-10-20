import { test, expect } from '@playwright/test';

test.describe('Activation URL cleanup', () => {
  test('removes ?shActivate=1 after load and sets data-activated', async ({ page }) => {
    await page.goto('/?shActivate=1', { waitUntil: 'load' });
    await page.waitForTimeout(50);
    expect(page.url()).not.toContain('shActivate=');

    const activated = await page.evaluate(() =>
      document.documentElement.hasAttribute('data-activated')
    );
    expect(activated).toBeTruthy();
  });
});
