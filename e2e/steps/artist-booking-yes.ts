/**
 * Yes, book it (RAZ-1089): a seeded request becomes a draft on the asker's
 * page, with the artist confirmed. Local Postgres only.
 */
import { expect } from '@playwright/test'
import pg from 'pg'
import { FirebaseScrypt } from 'firebase-scrypt'
import { Given, When, Then } from './fixtures'

const PASSWORD = 'DemoBand706!'

function scrypt() {
  return new FirebaseScrypt({
    memCost: 14,
    rounds: 8,
    saltSeparator: String(process.env.FIREBASE_SALT_SEPARATOR),
    signerKey: String(process.env.FIREBASE_SIGNER_KEY),
  })
}

async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed a booking')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

Given('an organizer has sent a booking request to an artist page', async ({ c3 }) => {
  const run = c3.run
  const salt = Buffer.from(String(Math.random()).slice(7)).toString('base64')
  const hash = await scrypt().hash(PASSWORD, salt)
  const email = `band-${run}@test.wedance.vip`
  const [artistUser] = await sql<{ id: string }>(
    `INSERT INTO dancers (name, email, username, salt, hash, onboarded_at)
     VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
    [`Band ${run}`, email, `u-band-${run}`, salt, hash],
  )
  const [hostUser] = await sql<{ id: string }>(
    `INSERT INTO dancers (name, email, username, salt, hash, onboarded_at)
     VALUES ($1, $2, $3, '', '', now()) RETURNING id`,
    [`Host ${run}`, `host-${run}@test.wedance.vip`, `u-host-${run}`],
  )
  const [artist] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, name, type, city, claimed) VALUES ($1, $2, 'artist', 'Munich', true) RETURNING id`,
    [`band-${run}`, `Band ${run}`],
  )
  const [host] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, name, type, city, claimed) VALUES ($1, $2, 'organizer', 'Munich', true) RETURNING id`,
    [`host-${run}`, `Host ${run}`],
  )
  await sql(`INSERT INTO profile_members (profile_id, dancer_id, role) VALUES ($1, $2, 'owner'), ($3, $4, 'owner')`, [artist!.id, artistUser!.id, host!.id, hostUser!.id])
  const [ask] = await sql<{ id: string }>(
    `INSERT INTO booking_inquiries (profile_id, requester_id, asker_profile_id, name, email, organization, what, event_date, city, guests, budget, message)
     VALUES ($1, $2, $3, 'Ada', $4, $5, 'Show', '2026-12-20', 'Munich', 40, '€400', 'Please play our Munich party next month.') RETURNING id`,
    [artist!.id, hostUser!.id, host!.id, `ada-${run}@test.wedance.vip`, `Host ${run}`],
  )
  c3.data.email = email
  c3.data.handle = `band-${run}`
  c3.data.hostId = host!.id
  c3.data.artistId = artist!.id
  c3.data.inquiryId = ask!.id
  c3.ids.artistUser = artistUser!.id
  c3.ids.hostUser = hostUser!.id
  c3.cleanup.push(async () => {
    const events = await sql<{ id: string }>(`SELECT id FROM events WHERE host_profile_id = $1`, [host!.id])
    const eventIds = events.map(e => e.id)
    if (eventIds.length) {
      await sql(`DELETE FROM profile_invites WHERE event_id = ANY($1::uuid[])`, [eventIds])
      await sql(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [eventIds])
    }
    await sql(`DELETE FROM booking_inquiries WHERE id = $1`, [ask!.id])
    await sql(`DELETE FROM profile_members WHERE profile_id = ANY($1::uuid[])`, [[artist!.id, host!.id]])
    await sql(`DELETE FROM profiles WHERE id = ANY($1::uuid[])`, [[artist!.id, host!.id]])
    await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [[artistUser!.id, hostUser!.id]])
    await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [[artistUser!.id, hostUser!.id]])
  })
})

Given('I am signed in as the booked artist', async ({ page, c3 }) => {
  await page.goto('/')
  // The header button is in the first HTML. Wait until the click handler is
  // attached, or the click lands on the shell and the dialog never opens.
  await page.waitForLoadState('networkidle')
  await page.locator('header').getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await page.getByLabel('Email').fill(c3.data.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.locator('[role="dialog"] form').getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15_000 })
})

When("I open the artist's bookings", async ({ page, c3 }) => {
  await page.goto(`/business/network/${c3.data.handle}/bookings`)
  await expect(page.getByRole('button', { name: 'Yes, book it' })).toBeVisible({ timeout: 15_000 })
})

When('I click "Yes, book it"', async ({ page }) => {
  await page.getByRole('button', { name: 'Yes, book it' }).click()
})

Then('the artist is on a draft of the organizer\'s event', async ({ c3 }) => {
  const events = await sql<{ id: string; published: boolean; archived: boolean; price: string; artists: string[] }>(
    `SELECT id, published, archived, price, artists FROM events WHERE host_profile_id = $1`,
    [c3.data.hostId],
  )
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({ published: false, archived: false, price: '€400', artists: [c3.data.handle] })
  const invites = await sql<{ status: string; offer: string }>(
    `SELECT status, request->>'offer' AS offer FROM profile_invites WHERE event_id = $1 AND profile_id = $2`,
    [events[0]!.id, c3.data.artistId],
  )
  expect(invites).toEqual([{ status: 'confirmed', offer: '€400' }])
  const [row] = await sql<{ status: string }>(`SELECT status FROM booking_inquiries WHERE id = $1`, [c3.data.inquiryId])
  expect(row?.status).toBe('booked')
})
