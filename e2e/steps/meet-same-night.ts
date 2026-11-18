/**
 * Two fresh dancers, same night on both plans, then /meet (RAZ-1071 walkthrough).
 * Seeds the local test database the same way the C3 steps do.
 */
import { expect } from '@playwright/test'
import pg from 'pg'
import { Given, When, Then } from './fixtures'
import { citySlug } from '../../shared/utils/citySearch'
import { eventLocalDate, zonedToUtc } from '../../shared/utils/eventTime'

const DAY = 86400_000
const TZ = 'Europe/Berlin'
const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed Meet fixtures')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

function soon(): Date {
  return zonedToUtc(eventLocalDate(new Date(Date.now() + 3 * DAY), TZ), '21:00', TZ)
}

Given('{string} and {string} both have a photo, a city and the same social on their plan', async ({ c3 }, a: string, b: string) => {
  const city = `Meetville ${c3.run}`
  const slug = citySlug(city)
  const photo = `${baseUrl()}/alosha-dj.jpg`
  c3.data.meetCity = city
  c3.data.meetNight = `Meet Night ${c3.run}`
  const ids: string[] = []
  for (const who of [a, b]) {
    const [row] = await sql<{ id: string }>(
      `INSERT INTO dancers (name, email, username, city, profile_public, photo, onboarded_at, dance_styles)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), '["Salsa"]'::json) RETURNING id`,
      [`${who} ${c3.run}`, `${who.toLowerCase()}-${c3.run}@test.wedance.vip`, `meet-${who.toLowerCase()}-${c3.run}`, city, photo],
    )
    c3.ids[`dancer:${who}`] = row!.id
    ids.push(row!.id)
  }
  const start = soon()
  const [ev] = await sql<{ id: string }>(
    `INSERT INTO events (name, type, city, city_slug, timezone, styles, start_date, end_date, published, archived)
     VALUES ($1, 'Party', $2, $3, $4, '["Salsa"]'::json, $5, $6, true, false) RETURNING id`,
    [c3.data.meetNight, city, slug, TZ, start.toISOString(), new Date(start.getTime() + 4 * 3600_000).toISOString()],
  )
  c3.ids.meetNight = ev!.id
  await sql(
    `INSERT INTO plan_items (dancer_id, item_type, item_id) VALUES ($1, 'event', $3), ($2, 'event', $3)`,
    [ids[0], ids[1], ev!.id],
  )
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM plan_items WHERE item_id = $1`, [ev!.id])
    await sql(`DELETE FROM events WHERE id = $1`, [ev!.id])
    await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [ids])
  })
})

When('I open Meet', async ({ page }) => {
  await page.goto('/meet')
  await expect(page.getByRole('heading', { name: 'Meet new friends' })).toBeVisible()
})

Then('the Meet deck shows {string}', async ({ page, c3 }, who: string) => {
  await expect(page.getByTestId('meet-card-name').filter({ hasText: `${who} ${c3.run}` })).toBeVisible()
  await expect(page.getByTestId('meet-empty-no-city')).toHaveCount(0)
})

When('I open the shared social', async ({ page, c3 }) => {
  await page.goto(`/events/${c3.ids.meetNight}`)
  await expect(page.getByRole('heading', { level: 1, name: c3.data.meetNight })).toBeVisible()
})

Then('the event page shows {int} going', async ({ page }, n: number) => {
  await expect(page.getByText(new RegExp(`\\b${n} going\\b`)).first()).toBeVisible()
})
