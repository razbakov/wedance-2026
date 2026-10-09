import { test as base, createBdd } from 'playwright-bdd'

/**
 * Shared test fixtures for smoke E2E tests.
 *
 * - `testEmail`: a unique @test.wedance.vip email generated per test run
 * - `resetUserEmail` / `resetUserPassword`: credentials for the pre-seeded
 *    password-reset test user (set up via the "a test user exists" step)
 */
export const test = base.extend<{
  testEmail: string
  resetUserEmail: string
  resetUserPassword: string
}>({
  testEmail: [
    async ({}, use) => {
      const ts = Date.now()
      const rand = Math.random().toString(36).slice(2, 6)
      await use(`smoke-${ts}-${rand}@test.wedance.vip`)
    },
    { scope: 'test' },
  ],
  resetUserEmail: ['', { option: true }],
  resetUserPassword: ['', { option: true }],
})

export const { Given, When, Then } = createBdd(test)
