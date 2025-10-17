import { test, expect } from '@playwright/test';

test('hello world', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
});