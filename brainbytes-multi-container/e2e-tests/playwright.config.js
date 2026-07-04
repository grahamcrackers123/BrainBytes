// @ts-check
const { defineConfig, devices } = require('@playwright/test');
 
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
 
  use: {
    // Matches the frontend port published in docker-compose.yml
    // ("7000:3000"). Override with E2E_BASE_URL if needed.
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:7000',
    trace: 'on-first-retry',
  },
 
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});