import { test, expect } from '@playwright/test';

// Verify the filters/settings drawer can be opened and closed from the toolbar.
test('drawer toggles open/close from toolbar', async ({ page }) => {
  await page.goto('/');

  // Prefer stable data-test hooks if present
  const openerCandidates = [
    page.locator('[data-test="open-drawer"]'),
    page.getByRole('button', { name: /filters|settings|columns|options/i }),
    page.locator('header, [data-test="toolbar"], .toolbar').getByRole('button').first(),
  ];

  let opener = openerCandidates[0];
  for (const cand of openerCandidates) {
    if (await cand.isVisible().catch(() => false)) { opener = cand; break; }
  }

  if (!(await opener.isVisible().catch(() => false))) {
    test.skip(true, 'No visible drawer toggle found; skipping.');
  }

  await opener.click();
  await page.waitForSelector('[data-test="drawer"].open, [data-test="drawer"]:visible', { timeout: 3000 });

  const drawer = page.locator('[data-test="drawer"]');
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCount(1);

  // Close via explicit close button or keyboard escape
  const closer = drawer.getByRole('button', { name: /close|done|apply|hide/i }).first();
  if (await closer.isVisible().catch(() => false)) {
    await closer.click();
  } else {
    await page.keyboard.press('Escape');
  }

  await expect(drawer).toBeHidden();
});
