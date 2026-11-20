/**
 * Display check for the Admin phone nav (RAZ-943): tRPC is mocked (an admin
 * session, 2 claims, 3 videos and 1 group waiting), so no real sign-in is needed.
 * Also checks that the waiting work shows on the dancing side (Me tab / avatar dot, Admin row).
 *   BASE_URL=http://localhost:3000 bun e2e/admin-nav.check.ts [outDir]
 */
import { chromium, type Page } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = process.argv[2] ?? 'docs/screenshots/admin-nav'
const ME = { id: 'admin-check', name: 'Admin Check', isAdmin: true, username: null }
const MOCKS: Record<string, unknown> = {
  'auth.me': ME,
  'admin.attention': { claims: 2, videos: 3, groups: 1 },
}

async function mock(page: Page) {
  await page.route('**/api/trpc/**', async (route) => {
    const url = new URL(route.request().url())
    const procs = decodeURIComponent(url.pathname.split('/api/trpc/')[1] ?? '').split(',')
    if (!procs.some(p => p in MOCKS)) return route.continue()
    const real = procs.every(p => p in MOCKS) ? null
      : await (await fetch(url, { headers: { cookie: (await route.request().headerValue('cookie')) ?? '' } })).json()
    const body = procs.map((p, i) => (p in MOCKS ? { result: { data: MOCKS[p] } } : real[i]))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.searchParams.has('batch') ? body : body[0]) })
  })
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await ctx.addCookies([
  { name: 'wedance-session', value: 'check', url: BASE },
  { name: 'wedance-auth-hint', value: encodeURIComponent(JSON.stringify({ name: ME.name })), url: BASE },
])
const page = await ctx.newPage()
await mock(page)
let failed = false
const expect = (ok: boolean, msg: string) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed = true }

await page.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 120_000 })
const tabs = page.getByRole('navigation', { name: 'Tabs' })
await tabs.waitFor({ timeout: 60_000 })
await page.waitForTimeout(1500)
expect(await page.getByRole('navigation', { name: 'Admin' }).isHidden(), 'sidebar nav hidden on a phone')
expect((await tabs.innerText()).replace(/\s+/g, ' ').trim() === 'Home Claims 2 Users Me', `tabs read "${(await tabs.innerText()).replace(/\s+/g, ' ').trim()}"`)
await page.screenshot({ path: `${OUT}/phone-dashboard.png` })

await tabs.getByRole('button', { name: 'Me' }).click()
const sheet = page.getByRole('link', { name: /Videos/ })
await sheet.waitFor()
expect((await sheet.innerText()).includes('3'), 'Videos in the Me sheet with its count')
for (const l of ['Cities', 'Community', 'Festivals', 'Giveaways', 'AI usage', 'Dancing', 'Business'])
  expect(await page.getByRole('link', { name: new RegExp(l) }).first().isVisible(), `${l} in the Me sheet`)
await page.screenshot({ path: `${OUT}/phone-me-sheet.png` })

await page.getByRole('link', { name: /Cities/ }).click()
await page.waitForURL('**/admin/cities')
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/phone-cities.png` })

await page.setViewportSize({ width: 1280, height: 800 })
await page.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 120_000 })
expect(await page.getByRole('navigation', { name: 'Admin' }).isVisible(), 'sidebar nav on desktop')
expect(await tabs.isHidden(), 'no tab bar on desktop')
await page.screenshot({ path: `${OUT}/desktop.png` })

// Browsing the dancing side: the Me tab has a dot, the sheet's Admin row says what waits.
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${BASE}/cities`, { waitUntil: 'load', timeout: 120_000 })
await tabs.waitFor({ timeout: 60_000 })
await page.waitForTimeout(1500)
await tabs.getByRole('button', { name: 'Me' }).click()
const adminRow = page.getByRole('link', { name: /^Admin/ })
await adminRow.waitFor()
const rowText = (await adminRow.innerText()).replace(/\s+/g, ' ').trim()
expect(rowText.includes('2 claims · 3 videos · 1 group waiting') && rowText.endsWith('6'), `dancing-side Admin row reads "${rowText}"`)
await page.screenshot({ path: `${OUT}/phone-dancing-me-sheet.png` })

await page.setViewportSize({ width: 1280, height: 800 })
await page.goto(`${BASE}/cities`, { waitUntil: 'load', timeout: 120_000 })
const account = page.getByRole('button', { name: /Account menu/ })
await account.waitFor({ timeout: 60_000 })
await page.waitForTimeout(1500)
expect((await account.getAttribute('aria-label'))?.includes('Admin') ?? false, 'desktop avatar flags waiting admin work')
await account.click()
await page.screenshot({ path: `${OUT}/desktop-dancing-menu.png` })

await browser.close()
process.exit(failed ? 1 : 0)
