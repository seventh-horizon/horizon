import { test, expect } from '@playwright/test';

test('landing looks correct', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const threshold = test.info().project.name === 'chromium' ? 0.02 : 0.06;
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: false,
    maxDiffPixelRatio: threshold,
  });
});
