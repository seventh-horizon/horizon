import { test, expect } from '@playwright/test';
test.describe('Modal scroll-lock + focus restore', () => {
  test('adds html.modal-open with compensated padding; restores after close', async ({ page }) => {
    await page.goto('/');
    const supported = await page.evaluate(() => !!(window as any).SH?.bindModal);
    test.skip(!supported, 'bindModal is not exposed on window.SH in this test build');
    await page.evaluate(() => {
      const root = document.createElement('div');
      root.className = 'modal';
      root.setAttribute('data-modal', '');
      root.hidden = true;
      root.innerHTML = `
        <div class="modal__backdrop"></div>
        <div class="modal__dialog" aria-labelledby="t">
          <h2 id="t">Title</h2>
          <button id="closeBtn" type="button">Close</button>
        </div>`;
      document.body.appendChild(root);
      (window as any).SH.bindModal(root);
    });
    await page.evaluate(() => {
      const trigger = document.createElement('button');
      trigger.id = 'trigger';
      trigger.textContent = 'open';
      document.body.appendChild(trigger);
      document.getElementById('trigger')?.focus();
    });
    await page.evaluate(() => {
      const root = document.querySelector('.modal')!;
      root.dispatchEvent(new CustomEvent('sh:modal:open', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    expect(await page.evaluate(() =>
      document.documentElement.classList.contains('modal-open')
    )).toBeTruthy();
    expect(await page.evaluate(() =>
      getComputedStyle(document.documentElement).paddingRight
    )).toMatch(/^\d+(\.\d+)?px$/);
    await page.evaluate(() => {
      const root = document.querySelector('.modal')!;
      root.dispatchEvent(new CustomEvent('sh:modal:close', { bubbles: true }));
    });
    await page.waitForTimeout(20);
    expect(await page.evaluate(() =>
      document.documentElement.classList.contains('modal-open')
    )).toBeFalsy();
    expect(await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.id || ''
    )).toBe('trigger');
  });
});
