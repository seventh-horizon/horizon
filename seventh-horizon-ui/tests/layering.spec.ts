import { test, expect } from '@playwright/test';

test('header stays above symbolic overlays', async ({ page }) => {
  await page.goto('/');
  const header = page.getByRole('banner');
  const veil = page.locator('.veil-overlay');

  // sanity: both exist
  await expect(header).toBeVisible();
  await expect(veil).toBeVisible();

  // verify header z-index higher (string compare ok because both are numeric tokens resolved to computed values)
  const headerZ = await header.evaluate(e => Number(getComputedStyle(e).zIndex) || 0);
  const veilZ = await veil.evaluate(e => Number(getComputedStyle(e).zIndex) || 0);
  expect(headerZ).toBeGreaterThan(veilZ);
});
