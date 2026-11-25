/**
 * Organiser shortlist (RAZ-1085). Seeds one artist into the local test
 * database and walks the click path: Artists → the page → Shortlist → the board.
 */
import { expect } from '@playwright/test'
import pg from 'pg'
import { Given, When, Then } from './fixtures'

async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — cannot seed the shortlist artist')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

Given('a bookable artist is listed for shortlisting', async ({ c3 }) => {
  const handle = `sl-${c3.run}`
  const name = `Shortlist Artist ${c3.run}`
  c3.data.shortlist = { handle, name }
  await sql(
    `INSERT INTO profiles (username, type, name, city, city_slug, status, styles)
     VALUES ($1, 'artist', $2, 'Munich', 'munich', 'visible', '["Salsa"]')`,
    [handle, name],
  )
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM artist_shortlist WHERE profile_id IN (SELECT id FROM profiles WHERE username = $1)`, [handle])
    await sql(`DELETE FROM profiles WHERE username = $1`, [handle])
  })
})

When('I open Artists', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Artists' }).click()
  await expect(page).toHaveURL(/\/artists$/)
})

When('I open the bookable artist', async ({ page, c3 }) => {
  await page.getByRole('link', { name: c3.data.shortlist.name }).click()
  await expect(page).toHaveURL(new RegExp(`/@${c3.data.shortlist.handle}$`))
})

Then('the artist can be followed and shortlisted', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Shortlist', exact: true })).toBeVisible()
})

When('I shortlist the artist', async ({ page }) => {
  await page.getByRole('button', { name: 'Shortlist', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Shortlisted', exact: true })).toBeVisible()
})

Then('I am still not following the artist', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible()
})

When('I open my shortlist', async ({ page }) => {
  await page.getByRole('link', { name: 'Your shortlist' }).click()
  await expect(page).toHaveURL(/\/shortlist$/)
})

Then('I see the artist on the shortlist board', async ({ page, c3 }) => {
  await expect(page.getByRole('heading', { name: c3.data.shortlist.name })).toBeVisible()
})

When('I tag the shortlist as a wedding and note {string}', async ({ page }, note: string) => {
  await page.getByLabel('For').selectOption('wedding')
  await page.getByLabel('Note').fill(note)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved')).toBeVisible()
})

Then('the shortlist shows the wedding tag', async ({ page }) => {
  await page.getByRole('button', { name: 'Weddings' }).click()
  await expect(page.getByLabel('For')).toHaveValue('wedding')
})

When('I remove the artist from the shortlist', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove' }).click()
})

Then('the shortlist is empty', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Your shortlist is empty' })).toBeVisible()
})
