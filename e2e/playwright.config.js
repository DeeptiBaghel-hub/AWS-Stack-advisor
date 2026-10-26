const { defineConfig, devices } = require('@playwright/test');

const API_PORT = process.env.E2E_API_PORT || 5050;
const CLIENT_PORT = process.env.E2E_CLIENT_PORT || 5180;

// Requires a real MongoDB reachable at E2E_MONGO_URI — same as running the
// app normally (see the main README). In CI this points at a service
// container; locally it can point at the same Atlas/local Mongo you already
// use for development, or a separate throwaway database.
const MONGO_URI = process.env.E2E_MONGO_URI || 'mongodb://localhost:27017/aws-stack-advisor-e2e';
const JWT_SECRET = process.env.E2E_JWT_SECRET || 'e2e-test-secret-do-not-use-in-production';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // tests share one running database — safer sequential than racing shared state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Escape hatch for environments with a pre-provisioned Chromium build
    // (custom Docker images, some CI runners) where downloading Playwright's
    // own browser build isn't possible or desired — unset by default, in
    // which case Playwright uses its normal managed browser.
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/health`,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        // Auth/assistant rate limits are deliberately tight in production
        // (see server/src/middleware/rateLimit.js) — a real visitor never
        // registers or messages the assistant dozens of times in 15
        // minutes, but a full E2E run legitimately does, across 50+ tests
        // each spinning up their own user. NODE_ENV=test relaxes those
        // limits the same way the API integration test suite already
        // does, without touching real production behavior.
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MONGO_URI,
        JWT_SECRET,
        CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
      },
    },
    {
      command: 'npm run dev -- --port ' + CLIENT_PORT,
      cwd: '../client',
      url: `http://localhost:${CLIENT_PORT}`,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_URL: `http://localhost:${API_PORT}/api`,
      },
    },
  ],
});
