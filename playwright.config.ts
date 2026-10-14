import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright',
  fullyParallel: true,
  // WebGL contexts share one GPU; run viewport projects serially to avoid
  // benchmarking contention from unrelated test workers.
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure',
    // Windows headless defaults to SwiftShader. Exercise the actual local GPU;
    // keep other platforms' native defaults (including CI software fallback).
    launchOptions: process.platform === 'win32' ? { args: ['--enable-gpu', '--use-angle=d3d11'] } : {},
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
