/**
 * RAZ-1083: an artist based in one city is listed in each city they play in.
 * The row is written into the local test database and removed afterwards.
 * Write scenarios start with "the test environment is safe to write".
 */
import { expect } from '@playwright/test'
import pg from 'pg'
import { Given, When, Then, type C3World } from './fixtures'

const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed the service-area artist')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

Given('an artist based in Barcelona also plays in Munich', async ({ c3 }) => {
  const username = `svc-${c3.run}`
  const name = `Service Area ${c3.run}`
  await sql(
    `INSERT INTO profiles (username, type, name, city, city_slug, status, service_areas)
     VALUES ($1, 'artist', $2, 'Barcelona', 'barcelona', 'visible', $3::jsonb)`,
    [username, name, JSON.stringify([{ slug: 'munich', name: 'Munich' }])],
  )
  c3.data.serviceArtist = { username, name }
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM profiles WHERE username = $1`, [username])
  })
})

When("I open that artist's page", async ({ page, c3 }) => {
  const username = c3.data.serviceArtist.username as string
  await page.goto(`${baseUrl()}/@${username}`)
})

Then('that artist links to Munich', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Munich' })).toBeVisible()
})

When('I open the Munich artists directory', async ({ page }) => {
  await page.goto(`${baseUrl()}/cities/munich/artists`)
})

Then('I see that artist', async ({ page, c3 }) => {
  await expect(page.getByText(c3.data.serviceArtist.name as string).first()).toBeVisible()
})
