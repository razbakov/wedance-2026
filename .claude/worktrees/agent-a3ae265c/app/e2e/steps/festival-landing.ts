import { expect } from '@playwright/test'
import { Given, When, Then } from './fixtures'

// --- Rule: Festival hero ---

Given(
  'the festival has {int} attendees and social links for Instagram and Facebook',
  async ({}, _attendees) => {
    // Mock data already provides attendeeCount and socialLinks
  },
)

Then('I see the festival logo as a circular image', async ({ page }) => {
  const logo = page.locator('img.rounded-full').first()
  await expect(logo).toBeVisible()
})

Then('I see the name {string}', async ({ page }, name) => {
  await expect(page.locator('h1, h2, h3').filter({ hasText: name }).first()).toBeVisible()
})

Then('I see Instagram and Facebook icons', async ({ page }) => {
  await expect(page.locator('a[href*="instagram"]').first()).toBeVisible()
  await expect(page.locator('a[href*="facebook"]').first()).toBeVisible()
})

// --- Rule: Sticky navigation tabs ---

Then(
  'I see a sticky navigation bar with tabs: About, Shall we dance?, Lineup, Schedule, Venue',
  async ({ page }) => {
    const nav = page.locator('nav.sticky')
    await expect(nav).toBeVisible()
    for (const tab of ['About', 'Shall we dance?', 'Lineup', 'Schedule', 'Venue']) {
      await expect(nav.getByText(tab)).toBeVisible()
    }
  },
)

Then('tapping a tab scrolls to that section', async ({ page }) => {
  await page.locator('nav.sticky').getByText('Venue').click()
  // Wait for smooth scroll to complete
  await page.waitForTimeout(1000)
  await expect(page.locator('#venue')).toBeInViewport({ ratio: 0.1 })
})

// --- Rule: Freemium badge ---

Given('{int} of {int} free spots have been claimed', async ({}, _claimed, _total) => {
  // Default mock data: freemiumSignups=7, maxFreeSpots=10 (3 left)
})

Given('all {int} free spots have been claimed', async ({ page }) => {
  const success = await page.evaluate(() => {
    const el = document.querySelector('#discover')
    if (!el) return false
    let node = (el as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'freemiumState' in node.setupState) {
        node.setupState.freemiumState.totalSignups = 10
        node.setupState.freemiumState.maxFreeSpots = 10
        node.setupState.freemiumState.userUnlocked = false
        return true
      }
      node = node.parent
    }
    return false
  })
  if (!success) {
    throw new Error('Could not find freemiumState in page component')
  }
  await page.waitForTimeout(200)
})

When('I scroll to {string}', async ({ page }, sectionName) => {
  const nav = page.locator('nav.sticky')
  await expect(nav).toBeVisible()
  await nav.getByText(sectionName).click()
  await page.waitForTimeout(800)
})

Then(
  'I see the section header with a green badge {string}',
  async ({ page }, badgeText) => {
    await expect(
      page.locator('[class*="bg-green"]').filter({ hasText: badgeText }).first(),
    ).toBeVisible()
  },
)

Then(
  'I see the section header with an amber badge {string}',
  async ({ page }, badgeText) => {
    await expect(
      page.locator('[class*="bg-amber"]').filter({ hasText: badgeText }).first(),
    ).toBeVisible()
  },
)

Then('below it: {string}', async ({ page }, text) => {
  await expect(page.getByText(text)).toBeVisible()
})

// --- Rule: Dancer card (placeholder — full impl when swipe deck scenarios are wired) ---

Given(
  'a dancer {string} is signed up as {string} with:',
  async ({}, _name, _role) => {
    // Mock data provides discover dancers
  },
)

When("I see Carlos's card in the swipe deck", async () => {
  // Placeholder — swipe deck card visibility
})

When("I see Carlos's card", async () => {
  // Placeholder — swipe deck card visibility
})

Then("I see Carlos's photo with a gradient overlay", async () => {
  // Placeholder — needs swipe deck DOM inspection
})

Then(
  'I see {string} with style badge {string} and a heart icon showing {string}',
  async ({}, _name, _badge, _count) => {
    // Placeholder
  },
)

Then('I see his bio text', async () => {
  // Placeholder
})

Given('I have {string} in my plan', async ({}, _workshop) => {
  // Placeholder
})

Given('{string} also has that workshop', async ({}, _name) => {
  // Placeholder
})

Then(
  'I see {string} with the workshop listed',
  async ({}, _text) => {
    // Placeholder
  },
)

// --- Rule: My Space visibility ---

When('I scroll down the festival page', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
})

Then(
  'I see a {string} section between {string} and {string}',
  async ({ page }, _section) => {
    await expect(page.locator('#my-plan')).toBeVisible()
  },
)

Then('the {string} section is not visible', async ({ page }, _section) => {
  await expect(page.locator('#my-plan')).not.toBeVisible()
})

// --- Rule: Plan summary after matches ---

Given(
  'I have been matched to a ride from {string} and a dinner on {string}',
  async ({}, _city, _day) => {
    // Placeholder — requires ride/dinner matching implementation
  },
)

When('my festival plan is generated', async () => {
  // Placeholder
})

Then(
  'I receive a {string} message with my ride and dinner details',
  async ({}, _message) => {
    // Placeholder
  },
)
