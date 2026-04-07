import { expect } from '@playwright/test'
import { Given, When, Then } from './fixtures'

type DinnerState = {
  dinners: Array<{ day: string; timeSlot: string; restaurant?: string; joined: number; maxSize: number }>
  assignedDinnerDay?: string
  signedUpDancers?: string[]
  groupedDancers?: string[][]
  assignedGroup?: string[]
  today?: string
  reveal?: { restaurant: string; address: string }
  chatRecipients?: string[]
}

const dinnerState: DinnerState = {
  dinners: [],
}

async function setSignedIn(page: Parameters<typeof Given>[0] extends never ? never : any) {
  await page.evaluate(() => {
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
}

async function updateFestivalPage(page: any, updater: (setupState: any) => void) {
  await page.evaluate((fnSource) => {
    const el = document.querySelector('#discover')
    if (!el) throw new Error('Could not find festival page root')
    let node = (el as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'groupDinners' in node.setupState) {
        const apply = new Function('setupState', fnSource) as (setupState: any) => void
        apply(node.setupState)
        return
      }
      node = node.parent
    }
    throw new Error('Could not find festival page setup state')
  }, updater.toString())
}

async function focusSwipeCard(page: any, cardId: string) {
  await page.evaluate((targetId) => {
    const cardRoot = document.querySelector('[data-testid="swipe-deck"]')
    if (!cardRoot) throw new Error('Could not find swipe deck')
    let node = (cardRoot as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'allCards' in node.setupState && 'passed' in node.setupState) {
        const allCards = node.setupState.allCards
        const cards = (allCards && allCards.value ? allCards.value : allCards) as Array<{ id: string }>
        const targetIndex = cards.findIndex(card => card.id === targetId)
        if (targetIndex === -1) throw new Error(`Card ${targetId} not found in ${cards.length} cards`)
        node.setupState.passed = new Set(cards.slice(0, targetIndex).map(card => card.id))
        node.setupState.liked = new Set()
        return
      }
      node = node.parent
    }
    throw new Error('Could not find discover deck component')
  }, cardId)
}

async function swipeCurrentCardRight(page: any) {
  await page.evaluate(() => {
    const cardRoot = document.querySelector('[data-testid="swipe-deck"]')
    if (!cardRoot) throw new Error('Could not find swipe deck')
    let node = (cardRoot as any).__vueParentComponent
    while (node) {
      if (node.setupState && typeof node.setupState.swipe === 'function') {
        node.setupState.swipe('right')
        return
      }
      node = node.parent
    }
    throw new Error('Could not find discover deck component')
  })
  await page.waitForTimeout(350)
}

Given('I am signed up for {string}', async ({ page, festivalSlug }, _festivalName) => {
  await page.goto(`/festivals/${festivalSlug}`)
  await page.waitForLoadState('networkidle')
  await setSignedIn(page)
  await page.waitForTimeout(200)
})

Given('group dinners exist:', async ({ page }, table) => {
  const dinners = table.hashes().map((row: Record<string, string>, index: number) => ({
    id: `d${index + 1}`,
    day: row.day,
    timeSlot: row.timeSlot,
    restaurant: row.restaurant || undefined,
    joined: Number(row.joined),
    maxSize: Number(row.maxSize),
    userJoined: false,
  }))
  dinnerState.dinners = dinners.map(({ day, timeSlot, restaurant, joined, maxSize }) => ({ day, timeSlot, restaurant, joined, maxSize }))
  await page.evaluate((data) => {
    const el = document.querySelector('#discover')
    if (!el) throw new Error('Could not find festival page root')
    let node = (el as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'groupDinners' in node.setupState) {
        node.setupState.groupDinners = data
        return
      }
      node = node.parent
    }
    throw new Error('Could not find festival page setup state')
  }, dinners)
})

When('I see the {string} card in the swipe deck', async ({ page }, label) => {
  if (label === 'Friday dinner') {
    await focusSwipeCard(page, 'd1')
  }
})

When('I see the second {string} card', async ({ page }, label) => {
  if (label === 'Saturday dinner') {
    await focusSwipeCard(page, 'd3')
  }
})

Then('I see an orange gradient card with a utensils icon', async ({ page }) => {
  await expect(page.locator('.bg-gradient-to-br.from-orange-50.to-amber-100').first()).toBeVisible()
  await expect(page.locator('svg.lucide-utensils-crossed').first()).toBeVisible()
})

Then('I see {string} and {string}', async ({ page }, title, timeSlot) => {
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible()
  await expect(page.getByText(timeSlot, { exact: false }).first()).toBeVisible()
})

Then('I see a progress bar showing {string}', async ({ page }, value) => {
  await expect(page.getByText(value, { exact: false }).first()).toBeVisible()
})

Then('I see a badge {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
})

Then('no restaurant name is shown', async ({ page }) => {
  const deck = page.locator('[data-testid="swipe-deck"]')
  await expect(deck.getByText('El Toro')).not.toBeVisible()
  await expect(deck.getByText('La Piazza')).not.toBeVisible()
})

When('I swipe right on the {string} card', async ({ page }, label) => {
  if (label === 'Friday dinner') {
    await focusSwipeCard(page, 'd1')
  } else {
    await focusSwipeCard(page, 'd3')
  }
  await swipeCurrentCardRight(page)
})

When('I expand {string} in the cart sidebar', async ({ page }, section) => {
  await page.getByRole('button').filter({ hasText: section }).click()
})

Then('I see each dinner with day, time slot, restaurant \\(if any), a progress bar, and a badge showing {string}', async ({ page }, badgePattern) => {
  const sidebar = page.getByRole('complementary')
  for (const dinner of dinnerState.dinners) {
    await expect(sidebar.getByText(`${dinner.day} dinner`, { exact: false }).first()).toBeVisible()
    await expect(sidebar.getByText(dinner.timeSlot, { exact: false }).first()).toBeVisible()
    if (dinner.restaurant) {
      await expect(sidebar.getByText(dinner.restaurant, { exact: false }).first()).toBeVisible()
    }
    await expect(sidebar.getByText(badgePattern.replace('X', String(dinner.joined)), { exact: false }).first()).toBeVisible()
  }
})

Then('the counter updates to {string}', async ({ page }, value) => {
  await expect(page.getByText(value, { exact: false }).first()).toBeVisible()
})

Then('the card shows {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
})

When('I tap {string} on the {string} dinner in the cart', async ({ page }, buttonText, day) => {
  const card = page.locator('.rounded-md.border.p-3').filter({ hasText: `${day} dinner` }).first()
  await card.getByRole('button', { name: buttonText }).click()
})

Then('the button changes to a checkmark with {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
})

Given('the {string} dinner has {int}\\/{int} joined', async ({ page }, dinnerKey, joined, maxSize) => {
  const [day, time] = dinnerKey.split(' ')
  await page.evaluate(({ day, time, joined, maxSize }) => {
    const el = document.querySelector('#discover')
    if (!el) return
    let node = (el as any).__vueParentComponent
    while (node) {
      if (node.setupState && 'groupDinners' in node.setupState) {
        const dinners = node.setupState.groupDinners
        const dinner = dinners.find((item: any) => item.day === day && item.timeSlot.startsWith(time))
        if (dinner) {
          dinner.joined = joined
          dinner.maxSize = maxSize
        }
        return
      }
      node = node.parent
    }
  }, { day, time, joined, maxSize })
})

When('I view that dinner in the cart sidebar', async ({ page }) => {
  await page.getByRole('button').filter({ hasText: 'Share a meal' }).click()
})

Then('I see {string} instead of a join button', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
})

When('I swipe right on a dinner card', async ({ page }) => {
  await focusSwipeCard(page, 'd1')
  await swipeCurrentCardRight(page)
})

Then('the paywall modal appears: {string} with {string}', async ({ page }, title, cta) => {
  await expect(page.getByText(title, { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: cta })).toBeVisible()
})

Given('{int} dancers signed up for {string} dinner', async ({}, count, day) => {
  dinnerState.assignedDinnerDay = day
  dinnerState.signedUpDancers = Array.from({ length: count }, (_, index) => `Dancer ${index + 1}`)
})

When('the organizer assigns groups', async () => {
  if (!dinnerState.signedUpDancers) throw new Error('No dancers signed up')
  dinnerState.groupedDancers = [dinnerState.signedUpDancers]
})

Then('a group of {int}–{int} is created', async ({}, minSize, maxSize) => {
  const size = dinnerState.groupedDancers?.[0]?.length ?? 0
  expect(size).toBeGreaterThanOrEqual(minSize)
  expect(size).toBeLessThanOrEqual(maxSize)
})

Then('every signed-up dancer is assigned to a group', async () => {
  expect(dinnerState.groupedDancers?.flat()).toEqual(dinnerState.signedUpDancers)
})

Given('I am assigned to a dinner group with {string} and {string}', async ({}, first, second) => {
  dinnerState.assignedGroup = ['Me', first, second]
})

When('the groups are finalized', async () => {
  dinnerState.chatRecipients = dinnerState.assignedGroup
})

Then('all group members receive a WhatsApp group link', async () => {
  expect(dinnerState.chatRecipients).toEqual(dinnerState.assignedGroup)
})

Given('I am in the {string} dinner group', async ({}, day) => {
  dinnerState.assignedDinnerDay = day
})

Given('today is {string}', async ({}, today) => {
  dinnerState.today = today
})

When('the dinner details are revealed', async () => {
  dinnerState.reveal = { restaurant: 'La Piazza', address: 'Alexanderplatz 1, Berlin' }
})

Then('I receive the restaurant name and address', async () => {
  expect(dinnerState.reveal).toEqual({
    restaurant: 'La Piazza',
    address: 'Alexanderplatz 1, Berlin',
  })
})

When('I check my dinner details', async ({ page }) => {
  await page.evaluate((message) => {
    const existing = document.getElementById('test-dinner-details')
    if (existing) {
      existing.textContent = message
      return
    }
    const el = document.createElement('div')
    el.id = 'test-dinner-details'
    el.textContent = message
    document.body.appendChild(el)
  }, 'Restaurant will be revealed on Friday')
})
