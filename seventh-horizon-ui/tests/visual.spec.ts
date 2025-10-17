import { test, expect } from '@playwright/test';

test('landing looks correct', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: false,
    maxDiffPixelRatio: 0.02,
  });
});
