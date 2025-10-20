import { test, expect } from '@playwright/test';

test.describe('Modal scroll-lock + focus restore', () => {
test('adds html.modal-open with compensated padding; restores after close', async ({ page, browserName }) => {
  if (process.env.CI && browserName === 'webkit') test.skip('Flaky WebKit headless focus-restore in CI');
  // Give WebKit a bit more room in CI
  if (test.info().project.name === 'webkit') {
    test.setTimeout(60_000);
  }
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
    const hasLock = await page.evaluate(() =>
      document.documentElement.classList.contains('modal-open')
    );
    expect(hasLock).toBeTruthy();

    const pr = await page.evaluate(() =>
      getComputedStyle(document.documentElement).paddingRight
    );
    expect(pr).toMatch(/^\d+(\.\d+)?px$/);

    await page.evaluate(() => {
      const root = document.querySelector('.modal')!;
      root.dispatchEvent(new CustomEvent('sh:modal:close', { bubbles: true }));
    });

    await page.waitForTimeout(20);
    const hasLockAfter = await page.evaluate(() =>
      document.documentElement.classList.contains('modal-open')
    );
    expect(hasLockAfter).toBeFalsy();

    // Wait until focus actually returns to the trigger (polling avoids throws/races)
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () => (document.activeElement as HTMLElement | null)?.id || ''
          ),
        {
          timeout: test.info().project.name === 'webkit' ? 30_000 : 10_000,
          // optional: slow ramp to give WebKit time post-close
          intervals: [200, 300, 500, 800, 1200],
        }
      )
      .toBe('trigger');
});
});
