import { test, expect } from '@playwright/test';

test('drawer toggles open/close from toolbar', async ({ page }) => {
  await page.goto('/');

  // Find and click the open-drawer button
  const openButton = page.locator('[data-test="open-drawer"]');
  await expect(openButton).toBeVisible();
  await openButton.click();

  // Wait for the drawer to open
  await page.waitForTimeout(300);

  // Check that the drawer is visible
  const drawer = page.locator('[data-test="drawer"]');
  // Ensure only one drawer is visible to prevent multiple drawers from overlapping and causing UI issues
  await expect(drawer.filter({ has: page.locator(':visible') })).toHaveCount(1);
  await expect(drawer).toBeVisible();
  // Ensure only one visible drawer
  await expect(drawer.filter({ has: page.locator(':visible') })).toHaveCount(1);

  // Close the drawer by clicking the button again
  await openButton.click();
  await page.waitForTimeout(300);
  await expect(drawer).not.toBeVisible();
});
