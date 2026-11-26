/**
 * Steps for e2e/features/follow-contacts.feature (RAZ-1092): Follow → Contacts.
 * Synthetic rows in the local test database, removed by the `c3` fixture's cleanups.
 */
import { expect, type Page } from '@playwright/test'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { Given, When, Then, type C3World } from './fixtures'

const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try { return (await client.query(text, params)).rows as T[] }
  finally { await client.end() }
}

async function dancer(c3: C3World, who: 'owner' | 'fan') {
  const name = `${who === 'owner' ? 'Olga Owner' : 'Fiona Fan'} ${c3.run}`
  const [row] = await sql<{ id: string }>(
    `INSERT INTO dancers (name, email, username, city, onboarded_at) VALUES ($1, $2, $3, 'Munich', NOW()) RETURNING id`,
    [name, `follow-${who}-${c3.run}@test.wedance.vip`, `follow-${who}-${c3.run}`],
  )
  c3.ids[who] = row!.id
  c3.data[`name:${who}`] = name
  return row!.id
}

async function signInAs(page: Page, c3: C3World, who: 'owner' | 'fan') {
  const token = `follow-${c3.run}-${randomUUID()}`
  await sql(`INSERT INTO sessions (dancer_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 day')`, [c3.ids[who], token])
  await page.context().clearCookies()
  const hint = encodeURIComponent(JSON.stringify({ name: c3.data[`name:${who}`], username: `follow-${who}-${c3.run}` }))
  await page.context().addCookies([
    { name: 'wedance-session', value: token, url: baseUrl() },
    { name: 'wedance-auth-hint', value: hint, url: baseUrl() },
  ])
}

Given('an artist page run by its owner', async ({ c3 }) => {
  const owner = await dancer(c3, 'owner')
  const fan = await dancer(c3, 'fan')
  const handle = `follow-artist-${c3.run}`
  const [p] = await sql<{ id: string }>(
    `INSERT INTO profiles (username, type, name, city) VALUES ($1, 'artist', $2, 'Munich') RETURNING id`,
    [handle, `DJ Follow ${c3.run}`],
  )
  await sql(`INSERT INTO profile_members (profile_id, dancer_id, role) VALUES ($1, $2, 'owner')`, [p!.id, owner])
  Object.assign(c3.data, { handle, artistName: `DJ Follow ${c3.run}` })
  c3.cleanup.push(async () => {
    await sql(`DELETE FROM follows WHERE dancer_id = ANY($1::uuid[]) OR profile_id = $2`, [[owner, fan], p!.id])
    await sql(`DELETE FROM profile_members WHERE profile_id = $1`, [p!.id])
    await sql(`DELETE FROM profiles WHERE id = $1`, [p!.id])
    await sql(`DELETE FROM sessions WHERE dancer_id = ANY($1::uuid[])`, [[owner, fan]])
    await sql(`DELETE FROM dancers WHERE id = ANY($1::uuid[])`, [[owner, fan]])
  })
})

Given('I am signed in as the fan', async ({ page, c3 }) => { await signInAs(page, c3, 'fan') })

When('I open the artist page', async ({ page, c3 }) => {
  await page.goto(`${baseUrl()}/@${c3.data.handle}`)
})

Then('I am told that following lets the artist email me', async ({ page, c3 }) => {
  await expect(page.getByTestId('follow-email-note')).toHaveText(`Following lets ${c3.data.artistName} email you their news.`)
})

When('I tap Follow', async ({ page }) => {
  await page.getByRole('button', { name: 'Follow', exact: true }).click()
})

Then('the button says {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
})

When('the owner opens the artist\'s Contacts', async ({ page, c3 }) => {
  await signInAs(page, c3, 'owner')
  await page.goto(`${baseUrl()}/business/network/${c3.data.handle}/contacts`)
})

Then('the fan is listed with their email as {string}', async ({ page, c3 }, source: string) => {
  const row = page.getByRole('listitem').filter({ hasText: `follow-fan-${c3.run}@test.wedance.vip` }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText(source)
})

Then('the page can email {int} contact(s)', async ({ page }, n: number) => {
  // The page intro also says "can be emailed". The count is "N can be emailed".
  await expect(page.getByText(`${n} can be emailed`)).toBeVisible()
})
