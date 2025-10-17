import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  use: {
    baseURL: 'http://localhost:5173/', // lets tests use page.goto('/')
  },
  webServer: {
    command: 'npm run dev:root',       // serves your app at /
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});