import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const testDir = defineBddConfig({
  featuresRoot: './e2e/features',
  paths: ['./e2e/features/**/*.feature'],
  require: ['./e2e/steps/**/*.ts'],
  tags: 'not @wip',
})

export default defineConfig({
  testDir,
  outputDir: './e2e/test-results',
  reporter: 'html',
  /* Give CI builds extra time — nuxt preview cold-starts can be slow. */
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npx nuxt preview' : 'bun run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
