/**
 * Mutual yes → toast, bell, and a click through to the meetup (RAZ-1071).
 * The notice is derived from the two yeses, the same way an existing match
 * (Anna Test and Ben Test on the preview) shows up without a new row.
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
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed match notices')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

Given('{string} and {string} have matched over a shared night', async ({ c3 }, a: string, b: string) => {
  const city = `Noticeville ${c3.run}`
  const slug = citySlug(city)
  const photo = `${baseUrl()}/alosha-dj.jpg`
  const ids: string[] = []
  for (const who of [a, b]) {
    const role = who === b ? 'follow' : 'lead'
    const styles = who === b ? '["Salsa","Bachata"]' : '["Salsa"]'
    const [row] = await sql<{ id: string }>(
      `INSERT INTO dancers (name, email, username, city, profile_public, photo, onboarded_at, dance_styles, role)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), $6::json, $7) RETURNING id`,
      [`${who} ${c3.run}`, `${who.toLowerCase()}-notice-${c3.run}@test.wedance.vip`, `notice-${who.toLowerCase()}-${c3.run}`, city, photo, styles, role],
    )
    c3.ids[`dancer:${who}`] = row!.id
    ids.push(row!.id)
  }
  const start = zonedToUtc(eventLocalDate(new Date(Date.now() + 3 * DAY), TZ), '21:00', TZ)
  const [ev] = await sql<{ id: string }>(
    `INSERT INTO events (name, type, city, city_slug, timezone, styles, venue_name, start_date, end_date, published, archived, is_festival, cover)
     VALUES ($1, 'Party', $2, $3, $4, '["Salsa"]'::json, 'Stachus', $5, $6, true, false, false, $7) RETURNING id`,
    [`Notice Night ${c3.run}`, city, slug, TZ, start.toISOString(), new Date(start.getTime() + 4 * 3600_000).toISOString(), photo],
  )
  // $1 is both dancer_id (uuid) and the other row's target_id (text). An uncast
  // parameter is text, and Postgres will not assign text to uuid.
  await sql(
    `INSERT INTO discover_swipes (dancer_id, target_kind, target_id, decision) VALUES
       ($1::uuid, 'dancer', $2, 'yes'), ($2::uuid, 'dancer', $1, 'yes')`,
    ids,
  )
  c3.cleanup.push(async () => {
    // Booking the night writes a plan item and an attendance; those do not cascade.
    await sql(`DELETE FROM plan_items WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM attendances WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM discover_swipes WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM events WHERE id = $1`, [ev!.id])
    await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [ids])
  })
})

Given('{string} met {string} at a night that is over, and only Alex is going next week', async ({ c3 }, a: string, b: string) => {
  const city = `Metville ${c3.run}`
  const slug = citySlug(city)
  const photo = `${baseUrl()}/alosha-dj.jpg`
  const ids: string[] = []
  for (const who of [a, b]) {
    const [row] = await sql<{ id: string }>(
      `INSERT INTO dancers (name, email, username, city, profile_public, photo, onboarded_at, dance_styles, role)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), '["Salsa"]'::json, 'both') RETURNING id`,
      [`${who} ${c3.run}`, `${who.toLowerCase()}-met-${c3.run}@test.wedance.vip`, `met-${who.toLowerCase()}-${c3.run}`, city, photo],
    )
    c3.ids[`dancer:${who}`] = row!.id
    ids.push(row!.id)
  }
  const pastStart = zonedToUtc(eventLocalDate(new Date(Date.now() - 6 * DAY), TZ), '18:00', TZ)
  const nextStart = zonedToUtc(eventLocalDate(new Date(Date.now() + 7 * DAY), TZ), '18:00', TZ)
  const [past] = await sql<{ id: string }>(
    `INSERT INTO events (name, type, city, city_slug, timezone, styles, venue_name, start_date, end_date, published, archived, is_festival)
     VALUES ($1, 'Party', $2, $3, $4, '["Salsa"]'::json, 'La Timberia', $5, $6, true, false, false) RETURNING id`,
    [`Past Timberia ${c3.run}`, city, slug, TZ, pastStart.toISOString(), new Date(pastStart.getTime() + 4 * 3600_000).toISOString()],
  )
  const [next] = await sql<{ id: string }>(
    `INSERT INTO events (name, type, city, city_slug, timezone, styles, venue_name, start_date, end_date, published, archived, is_festival)
     VALUES ($1, 'Party', $2, $3, $4, '["Salsa"]'::json, 'La Timberia', $5, $6, true, false, false) RETURNING id`,
    [`Next Timberia ${c3.run}`, city, slug, TZ, nextStart.toISOString(), new Date(nextStart.getTime() + 4 * 3600_000).toISOString()],
  )
  await sql(
    `INSERT INTO discover_swipes (dancer_id, target_kind, target_id, decision) VALUES
       ($1::uuid, 'dancer', $2, 'yes'), ($2::uuid, 'dancer', $1, 'yes')`,
    ids,
  )
  await sql(
    `INSERT INTO meet_rituals (dancer_id, other_id, event_id, booked_at) VALUES
       ($1, $2, $3, NOW() - interval '7 days'), ($2, $1, $3, NOW() - interval '7 days')`,
    [ids[0], ids[1], past!.id],
  )
  await sql(
    `INSERT INTO plan_items (dancer_id, item_type, item_id, share_going) VALUES ($1, 'event', $2, false)`,
    [ids[0], next!.id],
  )
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM meet_rituals WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM plan_items WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM discover_swipes WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [ids])
    await sql(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [[past!.id, next!.id]])
    await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [ids])
  })
})

When('I open My plan', async ({ page }) => {
  await page.goto('/my-plan')
  await expect(page.getByTestId('meet-matches')).toBeVisible()
})

Then('{string} shows as someone I already met, and next week is an invite', async ({ page }, who: string) => {
  const card = page.getByTestId('meet-match').filter({ hasText: who })
  await expect(card.getByTestId('meet-match-met')).toContainText(/You met at/)
  await expect(card.getByTestId('meet-match-met')).toContainText(/Past Timberia/)
  await expect(card.getByTestId('meet-match-ritual')).toHaveCount(0)
  await expect(card.getByTestId('meet-match-invite')).toHaveText(new RegExp(`Invite ${who}`))
  await expect(card).toContainText(/\w{3} \d{1,2} \w{3} · \d{2}:\d{2}/)
})

Then('the bell no longer offers the booked night with {string}', async ({ page }, who: string) => {
  const row = page.getByTestId('notice-history-item').filter({ hasText: who })
  await expect(row).toBeVisible()
  await expect(row).not.toContainText('See when and where')
  await expect(row).not.toContainText('Past Timberia')
})

When('I open the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('notice-bell')).toBeVisible()
})

Then('Meet shows the match with {string}', async ({ page }, who: string) => {
  const card = page.getByTestId('meet-match-card')
  await expect(card.getByTestId('meet-match-photo')).toBeVisible()
  await expect(card.getByTestId('meet-match-name')).toContainText(who)
  await expect(card.getByTestId('meet-match-role')).toHaveText(who === 'Ben' ? 'Follower' : 'Leader')
  await expect(card.getByTestId('meet-match-styles')).toContainText(who === 'Ben' ? 'Bachata' : 'Salsa')
  await expect(card.getByTestId('meet-match-event')).toBeVisible()
  await expect(card.getByTestId('meet-match-going')).toContainText('going')
  await expect(page.getByRole('link', { name: 'My plan' }).first()).not.toHaveText(/\d/)
})

Then('I see a match toast for {string}', async ({ page }, who: string) => {
  await expect(page.getByTestId('notice-toasts')).toHaveAttribute('data-position', 'bottom-right')
  await expect(page.getByTestId('notice-toast').filter({ hasText: who })).toBeVisible()
})

Then('the notification bell shows {int}', async ({ page }, n: number) => {
  await expect(page.getByTestId('notice-bell-count')).toHaveText(String(n))
})

When('I dismiss the match toast', async ({ page }) => {
  await page.getByTestId('notice-toast-dismiss').first().click()
  await expect(page.getByTestId('notice-toast')).toHaveCount(0)
})

When('I open the notification bell', async ({ page }) => {
  await page.getByTestId('notice-bell').click()
  await expect(page.getByTestId('notice-history')).toBeVisible()
})

Then('the notification history lists {string}', async ({ page }, who: string) => {
  await expect(page.getByTestId('notice-history-item').filter({ hasText: who })).toBeVisible()
})

When('I tap the notification for {string}', async ({ page }, who: string) => {
  await page.getByTestId('notice-history-item').filter({ hasText: who }).click()
})

Then('the meetup page offers to book the night', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /it.s a match/i })).toBeVisible()
  await expect(page.getByTestId('ritual-book')).toBeVisible()
})

Then('the match toast stays dismissed', async ({ page }) => {
  await expect(page.getByTestId('meet-match-card')).toBeVisible()
  await expect(page.getByTestId('notice-toast')).toHaveCount(0)
})

When('I open the match with {string}', async ({ page }, who: string) => {
  await page.getByTestId('meet-match-card').filter({ hasText: who }).getByTestId('meet-match-action').click()
})

When('I book the night', async ({ page }) => {
  await page.getByTestId('ritual-book').click()
  await expect(page.getByTestId('ritual-instructions')).toBeVisible()
})

Then('the meeting explains the time and shows the night', async ({ page }) => {
  await expect(page.getByTestId('ritual-time-why')).toContainText(/starts at/)
  await expect(page.getByTestId('ritual-event')).toBeVisible()
  await expect(page.getByTestId('ritual-event-image')).toBeVisible()
  await expect(page.getByTestId('ritual-going')).toContainText('going')
  await expect(page.getByTestId('ritual-instructions').getByTestId('ritual-help-link')).toHaveCount(0)
})

Then('the reassurances are in the first person', async ({ page }) => {
  const adult = page.getByRole('checkbox', { name: /I.m 18\+/ })
  await expect(adult).toBeVisible()
  await adult.check()
  await expect(adult).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /I can leave any time/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /I.m meeting in a public spot/ })).toBeVisible()
})

Then('opening the screen is guidance, not a call to action', async ({ page }) => {
  const open = page.getByTestId('ritual-show')
  await expect(open).toContainText(/Open the screen/)
  await expect(open).not.toHaveClass(/rounded-full/)
  await expect(page.getByTestId('ritual-next')).toContainText(/color, shape and number/)
})

When('I open the meeting screen', async ({ page }) => {
  await page.getByTestId('ritual-show').click()
  await expect(page.getByTestId('ritual-reveal')).toBeVisible()
})

Then('the reveal asks me to match the symbol and does not name me', async ({ page }) => {
  await expect(page.getByTestId('ritual-find')).toContainText(/same color, shape and number/)
  await expect(page.getByTestId('ritual-reveal')).not.toContainText(/Hi, I/)
  await expect(page.getByText(/^F \d$/)).toHaveCount(0)
})

Then('I can say I couldn\'t meet', async ({ page }) => {
  await page.getByTestId('ritual-help-link').click()
  await expect(page.getByRole('button', { name: 'Report someone' })).toBeVisible()
})

Then('Meet still shows the booked match with {string}', async ({ page }, who: string) => {
  const card = page.getByTestId('meet-match-card').filter({ hasText: who })
  await expect(card.getByTestId('meet-match-action')).toContainText(/See when and where/)
})
