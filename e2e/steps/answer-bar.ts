/**
 * RAZ-924 — the answer bar on /ask/<token> and /confirm/<token> sits above the
 * phone tab bar. `artistInvites.get` is answered from a fixture here (the
 * page loads it on the client), so nothing touches the database; a signed-out
 * "Yes" stops at the email check, so nothing is sent either.
 */
import { expect, type Page } from '@playwright/test'
import { Given, When, Then } from './fixtures'

const PHONE = { width: 390, height: 664 } // iPhone 13 with the browser bars, as reported
const TOKEN = 'e2e-answer-bar-token-0001'

const event = {
  name: 'QA Bachata Night', type: 'Party', description: 'A night of bachata.',
  startDate: '2030-03-02T19:00:00.000Z', endDate: '2030-03-02T23:00:00.000Z', timezone: 'Europe/Berlin',
  startDay: '2030-03-02', endDay: '2030-03-03', startTime: '20:00',
  venue: 'QA Hall', address: 'Teststraße 1, Munich', city: 'Munich', otherVenues: [], styles: ['Bachata'],
  host: { name: 'QA Organiser', username: 'qa-organiser', instagram: null }, hostEvents: 3, hostCity: 'Munich',
  lineup: [], stats: { workshops: 1, parties: 1, planning: 0 },
  path: '/events/qa-bachata-night', published: true,
  programme: [
    { date: '2030-03-02', time: '20:00', duration: 60, title: 'Bachata workshop', room: '', style: 'Bachata', level: 'Open', venue: '', type: 'workshop', with: [] },
    { date: '2030-03-02', time: '21:00', duration: 180, title: 'Party', room: '', style: 'Bachata', level: '', venue: '', type: 'party', with: [] },
  ],
  flyer: null, lineupName: 'QA Artist', flyerPhoto: undefined,
}

function invite(kind: 'artist' | 'venue') {
  return {
    profile: {
      username: kind === 'venue' ? 'qa-hall' : 'qa-artist', name: kind === 'venue' ? 'QA Hall' : 'QA Artist',
      type: kind, photo: null, photos: [], videos: [], bio: '', styles: ['Bachata'],
      instagram: '', website: '', facebook: '', city: 'Munich', address: '', floorType: '',
    },
    pending: [], event, managed: false, member: false, canAnswer: true, signedIn: false, kind,
    ask: kind === 'venue'
      ? {
          request: { guests: 80 },
          facts: {
            venueName: 'QA Hall', host: 'QA Organiser', hostEvents: 3, hostCity: 'Munich', eventName: 'QA Bachata Night',
            kind: 'party', when: 'Saturday 2 March · 20:00–00:00', plan: [], elsewhere: 0, access: [], multiDay: false,
            dayLabels: {}, guests: 80, needs: [], offer: '', price: '', note: '',
          },
          terms: null, alternative: null, outcome: null,
        }
      : null,
    deal: kind === 'artist' ? { offer: '', terms: null } : null,
    answer: { status: 'invited', email: null, emailConfirmed: false, programmeOk: null, programmeNote: null, postsOk: false, message: null },
  }
}

/** Answer `artistInvites.get` from the fixture, even when tRPC batches it with other calls. */
async function mockInvite(page: Page, kind: 'artist' | 'venue') {
  await page.route('**/api/trpc/**', async (route) => {
    const url = new URL(route.request().url())
    const procs = decodeURIComponent(url.pathname.split('/api/trpc/')[1] ?? '').split(',')
    const at = procs.indexOf('artistInvites.get')
    if (at === -1) return route.continue()
    const mocked = { result: { data: invite(kind) } }
    if (procs.length === 1) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.searchParams.has('batch') ? [mocked] : mocked) })
    }
    const res = await route.fetch()
    const body = await res.json()
    body[at] = mocked
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

Given('I am on a phone, signed out', async ({ page, context }) => {
  await context.clearCookies()
  await page.setViewportSize(PHONE)
})

Given('a venue ask link is waiting for an answer', async ({ page }) => {
  await mockInvite(page, 'venue')
})

Given('an artist invite link is waiting for an answer', async ({ page }) => {
  await mockInvite(page, 'artist')
})

When('I open the venue ask link', async ({ page }) => {
  await page.goto(`/ask/${TOKEN}`)
  await expect(page.getByRole('button', { name: /yes, we can/i })).toBeVisible()
})

When('I open the artist invite link', async ({ page }) => {
  await page.goto(`/confirm/${TOKEN}`)
  await expect(page.getByRole('button', { name: /yes, i’m in/i })).toBeVisible()
})

Then('every answer button is fully visible above the tab bar', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const tabBar = page.getByRole('navigation', { name: 'Tabs' })
  await expect(tabBar).toBeVisible()
  const bar = await tabBar.boundingBox()
  // The answer bar's buttons: the fixed region holding "Yes, …".
  const buttons = page.locator('div.fixed.z-30').last().getByRole('button')
  const n = await buttons.count()
  expect(n).toBeGreaterThan(1)
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i)
    const box = await b.boundingBox()
    const name = (await b.textContent())?.trim()
    expect(box, `button "${name}" has a box`).not.toBeNull()
    expect(box!.y, `button "${name}" starts on screen`).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height, `button "${name}" ends above the tab bar (top ${bar!.y})`).toBeLessThanOrEqual(bar!.y)
  }
})

Then('tapping {string} does not open the sign-in dialog', async ({ page }, label: string) => {
  // A real tap at the button's centre: if the tab bar covered it, "Sign in" would get it.
  const button = page.getByRole('button', { name: label })
  const box = (await button.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  // Signed out, "Yes" asks for an email first: proof the button got the tap.
  await expect(page.getByText(/add your email/i)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
