/**
 * Site sign-up city (RAZ-1093): the owner sees the City field on the sign-up
 * section, a fan's city is stored on the contact, and Contacts can filter by it.
 * Synthetic rows, removed after the scenario. Write steps refuse a non-local URL.
 */
import { expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { Given, When, Then, type C3World } from './fixtures'

const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed the sign-up city fixture')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

Given('a page whose sign-up form asks for a city', async ({ c3 }) => {
  const run = c3.run
  const username = `city-signup-${run}`
  const email = `owner-${run}@test.wedance.vip`
  const [dancer] = await sql<{ id: string }>(
    `INSERT INTO dancers (name, email, username, city, profile_public, onboarded_at)
     VALUES ($1, $2, $3, 'Munich', true, NOW()) RETURNING id`,
    [`Owner ${run}`, email, `owner-${run}`],
  )
  const [profile] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, type, name, city, status)
     VALUES ($1, 'organizer', $2, 'Munich', 'visible') RETURNING id`,
    [username, `City School ${run}`],
  )
  await sql(`INSERT INTO profile_members (profile_id, dancer_id, role) VALUES ($1, $2, 'owner')`, [profile!.id, dancer!.id])
  const site = {
    locales: ['en'],
    published: true,
    sections: [{
      id: 'join',
      kind: 'signup',
      anchor: 'interest',
      title: { en: 'Want us in your city?' },
      city: { label: { en: 'Your city' } },
      hidePromo: true,
    }],
  }
  await sql(`INSERT INTO profile_sites (profile_id, content) VALUES ($1, $2::jsonb)`, [profile!.id, JSON.stringify(site)])
  const token = `city-${run}-${randomUUID()}`
  await sql(`INSERT INTO sessions (dancer_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`, [dancer!.id, token])
  c3.ids.profile = profile!.id
  c3.ids.dancer = dancer!.id
  c3.data.username = username
  c3.data.token = token
  c3.data.owner = `Owner ${run}`
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM sessions WHERE dancer_id = $1`, [dancer!.id])
    await sql(`DELETE FROM profiles WHERE id = $1`, [profile!.id])
    await sql(`DELETE FROM dancers WHERE id = $1`, [dancer!.id])
  })
})

async function signIn(page: import('@playwright/test').Page, c3: C3World) {
  const hint = encodeURIComponent(JSON.stringify({ name: c3.data.owner, username: `owner-${c3.run}`, photo: null }))
  await page.context().addCookies([
    { name: 'wedance-session', value: c3.data.token, url: baseUrl() },
    { name: 'wedance-auth-hint', value: hint, url: baseUrl() },
  ])
}

Then('the sign-up section asks for a city and not a promo code', async ({ page, c3 }) => {
  await signIn(page, c3)
  await page.goto(`/business/network/${c3.data.username}/website?section=join`)
  const city = page.locator('[data-signup-city-toggle]')
  await expect(city).toBeChecked()
  await expect(page.getByText('Ask for their city')).toBeVisible()
  await expect(page.locator('[data-signup-promo-toggle]')).not.toBeChecked()
})

When('fans sign up from {string} and {string}', async ({ c3 }, a: string, b: string) => {
  for (const city of [a, b]) {
    const res = await fetch(`${baseUrl()}/api/profiles/${c3.data.username}/contacts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: `Fan ${city}`,
        email: `${city.toLowerCase()}-${c3.run}@test.wedance.vip`,
        phone: '+49 171 000',
        city,
        locale: 'en',
        source: { form: 'sites.wedance.vip', page: `/${c3.data.username}` },
      }),
    })
    if (!res.ok) throw new Error(`Sign-up from ${city} failed: ${res.status} ${await res.text()}`)
  }
})

When("I open that page's contacts", async ({ page, c3 }) => {
  await signIn(page, c3)
  await page.goto(`/business/network/${c3.data.username}/contacts`)
})

Then('I see a contact from {string}', async ({ page }, city: string) => {
  await expect(page.locator(`[data-contact-city="${city}"]`)).toBeVisible()
})

Then('I do not see a contact from {string}', async ({ page }, city: string) => {
  await expect(page.locator(`[data-contact-city="${city}"]`)).toHaveCount(0)
})

When('I filter contacts to the city {string}', async ({ page }, city: string) => {
  await page.locator('[data-contacts-city]', { hasText: city }).click()
})
