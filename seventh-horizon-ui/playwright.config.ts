import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run dev -- --port 5173 --host',
    url: 'http://localhost:5173/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173/',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});