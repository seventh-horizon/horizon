import { test, expect } from '@playwright/test';

test.describe('UI smoke', () => {
  test('landing page renders and is interactive', async ({ page }) => {
    await page.goto('/');

    // Title contains brand
    await expect(page).toHaveTitle(/Seventh Horizon/i);

    // There is a visible main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Overlays are present but non-interactive (pointer-events: none)
    const veil = page.locator('.veil-overlay');
    if (await veil.count()) {
      await expect(veil).toHaveCSS('pointer-events', 'none');
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'veil overlay not present on landing; skipping pointer-events check'
      });
    }

    // Basic interaction still works (click a button or link if present)
    // Fallback: click the body to ensure no overlay intercepts
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('reduced motion preference clamps animations', async ({ page, context }) => {
    await context.grantPermissions([]); // just to keep defaults stable
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const veil = page.locator('.veil-overlay');
    if (await veil.count()) {
      await expect(veil).toHaveCSS('animation-name', 'none');
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'veil overlay not present under reduced-motion; skipping animation-name check'
      });
    }
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  });
});
