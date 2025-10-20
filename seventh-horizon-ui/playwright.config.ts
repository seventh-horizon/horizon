import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173/', // lets tests use page.goto('/')
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    geolocation: { longitude: 0, latitude: 0 },
    permissions: ['geolocation'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 50 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 50 } },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 50 } },
    },
  ],
  webServer: {
    command: 'npm run dev',       // serves your app at /
    url: 'http://localhost:5173/',
    // Node global typing supplied via tsconfig "types": ["node"]; boolean coercion via "!" is intentional
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});