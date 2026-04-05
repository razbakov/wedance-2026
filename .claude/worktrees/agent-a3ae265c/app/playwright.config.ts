import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const testDir = defineBddConfig({
  featuresRoot: '../../',
  paths: [
    '../../product/meetup-planner/scenarios/festival-landing.feature',
    '../../product/meetup-planner/scenarios/group-dinner.feature',
  ],
  require: ['./e2e/steps/**/*.ts'],
  tags: 'not @wip',
})

export default defineConfig({
  testDir,
  outputDir: './e2e/test-results',
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
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
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
