import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Retry once locally and twice in CI: the apps are lazy-loaded and hit a mock
  // API, so a cold chunk can occasionally lose a race. A retry absorbs that
  // without masking a genuine regression (which fails on every attempt).
  retries: process.env.CI ? 2 : 1,
  // Per-test budget. Lazy chunk + MockAPI latency can push a full flow past the
  // old 15 s ceiling; 30 s leaves comfortable headroom.
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Explicit action/navigation ceilings so a slow first paint fails with a
    // clear message instead of hanging until the test timeout.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  // Web-first assertion timeout (expect(...).toBeVisible() etc.).
  expect: { timeout: 10_000 },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Start the dev server automatically before running E2E tests. The production
  // (Vercel) build serves under /Lab101/, but the specs navigate to bare paths
  // like /hotel, so we run the dev server with VITE_BASE=/ to serve at the root.
  webServer: {
    command: 'VITE_BASE=/ npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
