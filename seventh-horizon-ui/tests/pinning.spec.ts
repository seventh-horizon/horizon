import { test, expect } from '@playwright/test';

// Verifies that clicking the toolbar "Filters" (open-drawer) button opens the drawer
// This matches the app's end-to-end environment used by your other Playwright tests.

test('toolbar Filters button opens the drawer', async ({ page }) => {
  // Visit the app root (uses baseURL from playwright.config.ts if set)
  await page.goto('/');

  // Find the drawer opener by stable data-test hook
  const opener = page.getByTitle('Open filters drawer');
  await expect(opener).toBeVisible();
  await opener.click();

  // The drawer should become visible after clicking
  const drawer = page.locator('[data-test="drawer"], [role="dialog"], aside[role="complementary"], .drawer, .sidepanel');
  await expect(drawer).toBeVisible();
});
