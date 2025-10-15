import { test, expect } from '@playwright/test';

test('landing looks correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});
