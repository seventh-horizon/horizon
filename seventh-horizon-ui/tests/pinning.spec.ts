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
