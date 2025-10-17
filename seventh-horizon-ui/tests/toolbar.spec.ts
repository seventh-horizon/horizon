import { test, expect } from '@playwright/test';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

test('all toolbar buttons have an accessible name (aria-label or text)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const toolbar = page.locator('.toolbar').first();
  await expect(toolbar).toBeVisible();

  // give React effects/observer a moment to apply fallback labels if any
  await sleep(100);

  const buttons = toolbar.getByRole('button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  let unlabeled: number[] = [];
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const aria = (await btn.getAttribute('aria-label'))?.trim();
    const text = (await btn.innerText()).trim();
    const ok = Boolean(aria) || Boolean(text);
    if (!ok) unlabeled.push(i + 1);
  }

  if (unlabeled.length) {
    // Dump minimal HTML of the first offending button to help locate it
    const idx = unlabeled[0] - 1;
    const html = await buttons.nth(idx).evaluate(el => (el as HTMLElement).outerHTML);
    console.warn(`Unlabeled toolbar buttons at indices: ${unlabeled.join(', ')}`);
    console.warn(`First offending button HTML: \n${html}`);
  }

  expect(unlabeled.length === 0, `Unlabeled toolbar buttons: ${unlabeled.join(', ')}`).toBeTruthy();
});