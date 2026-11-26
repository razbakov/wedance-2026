/**
 * Artist search filters (RAZ-1086): service area includes artists who travel,
 * and event type is wedding, birthday or corporate.
 */
import { expect } from '@playwright/test'
import pg from 'pg'
import { Given, When, Then, type C3World } from './fixtures'

async function sql(text: string, params: unknown[] = []) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed artist search fixtures')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { await client.query(text, params) }
  finally { await client.end() }
}

function track(c3: C3World) {
  if (c3.data.artistSearchCleanup) return
  c3.data.artistSearchCleanup = true
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM profiles WHERE username LIKE $1`, [`raz1086-%-${c3.run}`])
  })
}

Given('an artist in Barcelona travels to Munich for weddings', async ({ c3 }) => {
  track(c3)
  const handle = `raz1086-travel-${c3.run}`
  const name = `Traveling Ada ${c3.run}`
  c3.data.traveler = name
  await sql(
    `INSERT INTO profiles (username, type, name, city, city_slug, status, styles, event_types, service_areas)
     VALUES ($1, 'artist', $2, 'Barcelona', 'barcelona', 'visible', '["Salsa"]'::json, '["wedding"]'::jsonb, '[{"city":"Munich","citySlug":"munich"}]'::jsonb)`,
    [handle, name],
  )
})

Given('an artist in Munich plays birthdays', async ({ c3 }) => {
  track(c3)
  const handle = `raz1086-local-${c3.run}`
  const name = `Local Bea ${c3.run}`
  c3.data.local = name
  await sql(
    `INSERT INTO profiles (username, type, name, city, city_slug, status, styles, event_types, service_areas)
     VALUES ($1, 'artist', $2, 'Munich', 'munich', 'visible', '["Salsa"]'::json, '["birthday"]'::jsonb, '[]'::jsonb)`,
    [handle, name],
  )
})

When('I open Artists from the home page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Artists' }).click()
  await expect(page.getByRole('heading', { name: /Who moves/ })).toBeVisible()
})

When('I filter artists to the area {string}', async ({ page }, area: string) => {
  await page.getByLabel('Filter by service area').selectOption({ label: area })
})

When('I filter artists to the event {string}', async ({ page }, event: string) => {
  await page.getByLabel('Filter by event type').selectOption({ label: event })
})

Then('I see the traveling artist marked as traveling', async ({ page, c3 }) => {
  const card = page.getByRole('link', { name: new RegExp(c3.data.traveler) })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Travels here')
})

Then('I see the Munich birthday artist', async ({ page, c3 }) => {
  await expect(page.getByRole('link', { name: new RegExp(c3.data.local) })).toBeVisible()
})

Then('I see only the traveling artist', async ({ page, c3 }) => {
  await expect(page.getByRole('link', { name: new RegExp(c3.data.traveler) })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(c3.data.local) })).toHaveCount(0)
})
