import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

if (fs.existsSync('/opt/pw-browsers')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
}

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://getmarketintelligence.in',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-360',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
        isMobile: true,
      },
    },
    {
      name: 'mobile-390',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: 'mobile-414',
      use: {
        browserName: 'chromium',
        viewport: { width: 414, height: 896 },
        isMobile: true,
      },
    },
  ],
});
