import { test as base, createBdd } from 'playwright-bdd'

export const test = base.extend<{
  festivalSlug: string
}>({
  festivalSlug: ['salsa-open-berlin-2026', { option: true }],
})

export const { Given, When, Then } = createBdd(test)
