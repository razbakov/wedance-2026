/**
 * Artist song list, services and pricing (RAZ-1084). Seeds a page straight into
 * the local test database and reads it on /@handle, then edits it in Business.
 */
import { expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { ARTIST_SERVICES } from '../../shared/types/artistOffer'
import { Given, When, Then, type C3World } from './fixtures'

const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed an artist page')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

function serviceId(label: string) {
  const s = ARTIST_SERVICES.find(x => x.label === label)
  if (!s) throw new Error(`Unknown service “${label}”.`)
  return s.id
}

function track(c3: C3World) {
  if (c3.data.offerCleanup) return
  c3.data.offerCleanup = true
  c3.cleanup.push(async () => {
    const ids = Object.entries(c3.ids).filter(([k]) => k.startsWith('profile:')).map(([, id]) => id)
    const dancers = Object.entries(c3.ids).filter(([k]) => k.startsWith('dancer:')).map(([, id]) => id)
    if (ids.length) {
      await sql(`DELETE FROM profile_members WHERE profile_id = ANY($1::uuid[])`, [ids])
      await sql(`DELETE FROM profiles WHERE id = ANY($1::uuid[])`, [ids])
    }
    if (dancers.length) {
      await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [dancers])
      await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [dancers])
    }
  })
}

async function ensureOwner(c3: C3World) {
  if (c3.ids['dancer:owner']) return c3.ids['dancer:owner']
  const [d] = await sql<{ id: string }>(
    `INSERT INTO dancers (email, name) VALUES ($1, $2) RETURNING id`,
    [`offer-${c3.run}@test.wedance.vip`, `Offer ${c3.run}`],
  )
  c3.ids['dancer:owner'] = d!.id
  track(c3)
  return d!.id
}

Given('an artist {string} offers {string} and {string}, the song {string}, and the price {string}', async ({ c3 }, who: string, a: string, b: string, song: string, price: string) => {
  const owner = await ensureOwner(c3)
  const handle = `offer-${who}-${c3.run}`
  const name = `Offer ${who} ${c3.run}`
  const offer = {
    songs: [{ title: song }],
    services: [serviceId(a), serviceId(b)],
    pricing: price,
  }
  const [p] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, type, name, city, city_slug, bio, status, claimed, artist_offer)
     VALUES ($1, 'artist', $2, 'Munich', 'munich', $3, 'visible', true, $4::jsonb) RETURNING id`,
    [handle, name, 'Cuban son and timba.', JSON.stringify(offer)],
  )
  await sql(`INSERT INTO profile_members (profile_id, dancer_id, role) VALUES ($1, $2, 'owner')`, [p!.id, owner])
  c3.ids[`profile:${who}`] = p!.id
  c3.data[`handle:${who}`] = handle
  c3.data[`name:${who}`] = name
})

Given('an artist {string} has not stated a song list, services or a price', async ({ c3 }, who: string) => {
  const owner = await ensureOwner(c3)
  const handle = `offer-${who}-${c3.run}`
  const name = `Offer ${who} ${c3.run}`
  const [p] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, type, name, city, city_slug, bio, status, claimed)
     VALUES ($1, 'artist', $2, 'Munich', 'munich', 'No offer yet.', 'visible', true) RETURNING id`,
    [handle, name],
  )
  await sql(`INSERT INTO profile_members (profile_id, dancer_id, role) VALUES ($1, $2, 'owner')`, [p!.id, owner])
  c3.ids[`profile:${who}`] = p!.id
  c3.data[`handle:${who}`] = handle
  c3.data[`name:${who}`] = name
})

Given('I am signed in as the artist {string}', async ({ page, c3 }, who: string) => {
  const owner = await ensureOwner(c3)
  if (!c3.data[`handle:${who}`]) throw new Error(`No artist “${who}” was seeded.`)
  const token = `offer-${c3.run}-${randomUUID()}`
  await sql(`INSERT INTO sessions (dancer_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`, [owner, token])
  await page.context().addCookies([{ name: 'wedance-session', value: token, url: baseUrl() }])
})

When('I open the artist page {string}', async ({ page, c3 }, who: string) => {
  await page.goto(`/@${c3.data[`handle:${who}`]}`)
  await expect(page.getByRole('heading', { level: 1, name: c3.data[`name:${who}`] })).toBeVisible()
})

When('I open the editor for the artist {string}', async ({ page, c3 }, who: string) => {
  await page.goto(`/business/network/${c3.data[`handle:${who}`]}`)
  await expect(page.getByRole('heading', { name: 'Song list, services and pricing' })).toBeVisible()
})

When('I add the song {string}', async ({ page }, title: string) => {
  await page.getByRole('button', { name: 'Add a song' }).click()
  await page.getByLabel('Title').last().fill(title)
})

When('I set the pricing note to {string}', async ({ page }, note: string) => {
  await page.getByLabel('Pricing').fill(note)
})

When('I save the artist page', async ({ page }) => {
  await page.getByRole('button', { name: 'Save changes' }).click()
})

Then('the artist page does not list {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('heading', { name: 'What they offer' })).toBeVisible()
  await expect(page.getByText(text, { exact: true })).toHaveCount(0)
})

Then('the artist page states no offer', async ({ page }) => {
  await expect(page.getByText('No offer yet.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What they offer' })).toHaveCount(0)
})
