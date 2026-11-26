/**
 * Artist weekly availability (RAZ-1087). Seeds one artist and opens the public
 * page and the booking page. Write-path: localhost only.
 */
import { expect } from '@playwright/test'
import { Given, When, Then } from './fixtures'
import pg from 'pg'

function getDbUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot run E2E tests')
  return url
}

Given(
  'a test artist {string} is free on Monday from {string} to {string}',
  async ({}, username: string, start: string, end: string) => {
    const client = new pg.Client({ connectionString: getDbUrl() })
    try {
      await client.connect()
      const profile = await client.query(
        `INSERT INTO profiles (username, type, name, status, city, city_slug)
         VALUES ($1, 'artist', $2, 'visible', 'Munich', 'munich')
         ON CONFLICT (username) DO UPDATE SET type = 'artist', name = $2, status = 'visible'
         RETURNING id`,
        [username, 'QA Artist 1087'],
      )
      const id = profile.rows[0].id
      await client.query('DELETE FROM artist_availability WHERE profile_id = $1', [id])
      await client.query(
        `INSERT INTO artist_availability (profile_id, day_of_week, start_time, end_time)
         VALUES ($1, 1, $2, $3)`,
        [id, start, end],
      )
    } finally {
      await client.end()
    }
  },
)

When('I open the artist page {string}', async ({ page }, username: string) => {
  await page.goto(`/@${username}`)
  await page.waitForLoadState('networkidle')
})

When('I open the booking page for {string}', async ({ page }, username: string) => {
  await page.goto(`/@${username}/book`)
  await page.waitForLoadState('networkidle')
})

Then(
  'I see the artist is free on {string} from {string}',
  async ({ page }, day: string, hours: string) => {
    const block = page.getByTestId('artist-availability')
    await expect(block).toBeVisible()
    await expect(block).toContainText(day)
    await expect(block).toContainText(hours)
  },
)
