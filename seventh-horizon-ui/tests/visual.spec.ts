import { test, expect } from '@playwright/test';

// Skip visual snapshot on CI until a Linux baseline is committed
import process from 'process';
test.skip(!!process.env.CI, 'Skipping visual snapshot on CI until Linux baseline is added.');

test('landing looks correct', async ({ page }) => {
  await page.goto('/'); // uses baseURL from playwright.config.ts
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});
