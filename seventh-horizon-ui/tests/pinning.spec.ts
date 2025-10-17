import { test, expect } from '@playwright/test';

test('pin latest run updates the path', async ({ page }) => {
  await page.goto('/');

  const pinLatest = page.getByRole('button', { name: /pin latest/i });
  if (!(await pinLatest.isVisible())) test.skip(true, 'Pin Latest not present');

  await pinLatest.click();

  const pathInput = page.locator('#csvPath');
  const value = (await pathInput.count()) ? await pathInput.inputValue() : '';
  expect(value).toMatch(/\.seventh_horizon\/runs\/(latest|epoch_[^/]+)\/telemetry\.csv/);
});

test('toolbar Filters button opens the drawer', async ({ page }) => {
  await page.goto('/');

  // Find the drawer opener by stable data-test hook
  const opener = page.locator('[data-test="open-drawer"]');
  await expect(opener).toBeVisible();
  await opener.click();

  // The drawer should become visible after clicking
  const drawer = page.locator('[data-test="drawer"]');
  await expect(drawer).toBeVisible();
});
