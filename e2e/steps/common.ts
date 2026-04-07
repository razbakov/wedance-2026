import { expect } from '@playwright/test'
import { Given, When, Then } from './fixtures'

/**
 * Find the [slug] page Vue component via a section element inside it.
 * We use #discover as anchor since it's always rendered on the festival page.
 */
function getPageComponent(): any {
  const el = document.querySelector('#discover')
  if (!el) return null
  let node = (el as any).__vueParentComponent
  while (node) {
    const type = node.type?.name || node.type?.__name || ''
    // The page component is named [slug] or similar
    if (node.setupState && 'isSignedIn' in node.setupState) {
      return node
    }
    node = node.parent
  }
  return null
}

// Background: festival exists — navigates to the festival page
Given(
  'a festival {string} exists with dates {string} to {string} at venue {string} in {string}',
  async ({ page, festivalSlug }, _name, _startDate, _endDate, _venue, _city) => {
    await page.goto(`/festivals/${festivalSlug}`)
    await page.waitForLoadState('networkidle')
  },
)

Given(
  'a festival {string} exists with available styles {string}, {string}, {string}',
  async ({ page, festivalSlug }, _name, _s1, _s2, _s3) => {
    await page.goto(`/festivals/${festivalSlug}`)
    await page.waitForLoadState('networkidle')
  },
)

// Auth state
Given('I am signed in', async ({ page }) => {
  const success = await page.evaluate(() => {
    const el = document.querySelector('#discover')
    if (!el) return false
    let node = (el as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'isSignedIn' in node.setupState) {
        node.setupState.isSignedIn = true
        return true
      }
      node = node.parent
    }
    return false
  })
  if (!success) {
    throw new Error('Could not find isSignedIn in page component')
  }
  await page.waitForTimeout(300)
})

Given('I am not signed in', async () => {
  // Default state — app starts signed out
})

// Navigation
When('I open the festival page', async ({ page, festivalSlug }) => {
  await page.goto(`/festivals/${festivalSlug}`)
  await page.waitForLoadState('networkidle')
})

// Generic text visibility
Then('I see {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
})
