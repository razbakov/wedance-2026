#!/usr/bin/env bun
/**
 * Display check for events mirrored from wedance.vip (scripts/sync-v3-events.ts).
 *
 * Loads the city page + a few event detail pages on a running dev server and
 * asserts the classic v3-import failure modes are absent:
 *   - style tags that are just digits ("0","1",…) from string-encoded styles
 *   - raw epoch numbers instead of dates
 *   - wall-clock times shifted out of the event's own timezone
 *   - empty titles / venues
 * Saves full-page screenshots to docs/screenshots/v3-sync/.
 *
 * Usage (dev server must be running, pointed at a DB that has been synced):
 *   BASE_URL=http://localhost:3871 bun e2e/synced-events.check.ts [eventId:HH:MM ...]
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const CITY = process.env.CITY ?? 'munich'
const OUT = join(import.meta.dir, '..', 'docs', 'screenshots', 'v3-sync')
mkdirSync(OUT, { recursive: true })

// eventId:expectedLocalStartTime — e.g. b112…:14:00
const detail = process.argv.slice(2).map(a => { const [id, ...t] = a.split(':'); return { id: id!, time: t.join(':') } })

const failures: string[] = []
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg) }

const browser = await chromium.launch()
for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))

  await page.goto(`${BASE}/cities/${CITY}`, { waitUntil: 'networkidle' })
  await page.getByText('Coming up.').first().waitFor({ timeout: 20_000 }).catch(() => {})
  const text = await page.locator('body').innerText()
  check(/Coming\s+up\./.test(text), `[${vp.name}] city page shows the "Coming up" list`)
  check(!/\b1[6-9]\d{11}\b/.test(text), `[${vp.name}] no raw epoch-ms numbers on the city page`)
  const pills = await page.locator('span.rounded-full, span.rounded').allInnerTexts()
  check(!pills.some(p => /^\s*\d+\s*$/.test(p)), `[${vp.name}] no digit-only style tags`)
  check(errors.length === 0, `[${vp.name}] no page errors on city page${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await page.screenshot({ path: join(OUT, `city-${CITY}-${vp.name}.png`), fullPage: true })

  for (const d of detail) {
    errors.length = 0
    await page.goto(`${BASE}/events/${d.id}`, { waitUntil: 'networkidle' })
    await page.locator('h1').first().waitFor({ timeout: 20_000 })
    const h1 = (await page.locator('h1').first().innerText()).trim()
    const body = await page.locator('body').innerText()
    check(!!h1 && h1 !== 'Event not found', `[${vp.name}] event ${d.id.slice(0, 8)} renders a title ("${h1.slice(0, 50)}")`)
    if (d.time) check(body.includes(d.time), `[${vp.name}] event ${d.id.slice(0, 8)} shows local start ${d.time}`)
    check(!/\b1[6-9]\d{11}\b/.test(body), `[${vp.name}] event ${d.id.slice(0, 8)} has no raw epoch numbers`)
    check(/Venue/.test(body), `[${vp.name}] event ${d.id.slice(0, 8)} has a venue section`)
    check(errors.length === 0, `[${vp.name}] event ${d.id.slice(0, 8)} no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
    await page.screenshot({ path: join(OUT, `event-${d.id.slice(0, 8)}-${vp.name}.png`), fullPage: true })
  }
  await page.close()
}
await browser.close()
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed')
process.exit(failures.length ? 1 : 0)
