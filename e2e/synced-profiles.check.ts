#!/usr/bin/env bun
/**
 * Display check for the venue / organiser / artist profiles linked by the v3 sync.
 *
 * Freezes the browser clock to a weekday (default Wed 2026-10-07 12:00 Berlin) so
 * "this week" covers a full week of synced events, then checks the city page's
 * "Who's on the floor" tabs list people, and that venue + organiser /@handle
 * pages render with their upcoming schedule. Screenshots → docs/screenshots/v3-profiles/.
 *
 * Usage (dev server running against a synced DB):
 *   BASE_URL=http://localhost:3000 bun e2e/synced-profiles.check.ts <venueHandle> <organiserHandle> [more handles…]
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const CITY = process.env.CITY ?? 'munich'
const NOW = process.env.NOW ?? '2026-10-07T10:00:00Z'
const OUT = join(import.meta.dir, '..', 'docs', 'screenshots', 'v3-profiles')
mkdirSync(OUT, { recursive: true })
const handles = process.argv.slice(2)

const failures: string[] = []
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg) }

const browser = await chromium.launch()
for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, timezoneId: 'Europe/Berlin' })
  await page.clock.setFixedTime(new Date(NOW))
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))

  await page.goto(`${BASE}/cities/${CITY}`, { waitUntil: 'networkidle' })
  await page.getByText('with events this week').first().waitFor({ timeout: 20_000 }).catch(() => {})
  for (const tab of ['Venues', 'Organisers', 'Artists']) {
    await page.getByRole('button', { name: tab, exact: true }).first().click()
    await page.waitForTimeout(300)
    const label = (await page.getByText(/with events this week/).first().innerText().catch(() => '')).trim()
    const n = Number(label.match(/^(\d+)/)?.[1] ?? 0)
    check(n > 0, `[${vp.name}] ${tab} tab lists people active this week (${label || 'none'})`)
    const section = page.locator('section', { has: page.getByRole('button', { name: tab, exact: true }) }).first()
    await section.screenshot({ path: join(OUT, `city-${CITY}-${tab.toLowerCase()}-${vp.name}.png`) })
  }
  check(errors.length === 0, `[${vp.name}] no page errors on city page${errors.length ? ': ' + errors.join(' | ') : ''}`)

  for (const h of handles) {
    errors.length = 0
    await page.goto(`${BASE}/@${h}`, { waitUntil: 'networkidle' })
    await page.locator('h1').first().waitFor({ timeout: 20_000 })
    const body = await page.locator('body').innerText()
    const h1 = (await page.locator('h1').first().innerText()).trim()
    check(!!h1 && !/not on WeDance/i.test(body), `[${vp.name}] /@${h} renders "${h1.slice(0, 50)}"`)
    check(!/Nothing scheduled yet/.test(body), `[${vp.name}] /@${h} shows upcoming events`)
    const brokenImgs = await page.$$eval('img', imgs => imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map(i => i.src))
    check(brokenImgs.length === 0, `[${vp.name}] /@${h} has no broken images${brokenImgs.length ? ': ' + brokenImgs.join(', ') : ''}`)
    check(errors.length === 0, `[${vp.name}] /@${h} no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
    await page.screenshot({ path: join(OUT, `profile-${h.slice(0, 24)}-${vp.name}.png`), fullPage: true })
  }
  await page.close()
}
await browser.close()
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed')
process.exit(failures.length ? 1 : 0)
