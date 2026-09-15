import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);
const functional = /.*(?<!\.visual)\.spec\.ts$/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: flaky tests (and unstable screenshots) must fail loudly.
  retries: 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // One baseline set, rendered in the Playwright Linux container (see the `visual` project).
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testMatch: functional, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: functional, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: functional, use: { ...devices['Desktop Safari'] } },
    // Screenshots only compare reliably on the OS that produced them: run this project inside
    // mcr.microsoft.com/playwright (CI `visual` job, or `pnpm --filter site e2e:visual:update`).
    { name: 'visual', testMatch: /\.visual\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
  },
});
