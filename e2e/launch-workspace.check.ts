/**
 * Screenshots of the launch workspace (Business → page → Launch) for review:
 * one step at a time, opened through ?step=<key>.
 *   BASE_URL=http://localhost:3017 SESSION=<a local session token> HANDLE=latimberia bun e2e/launch-workspace.check.ts
 * Needs a page seeded with scripts/seed-launch-la-timberia.ts on a LOCAL database. Writes nothing.
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const HANDLE = process.env.HANDLE ?? 'latimberia'
const OUT = 'docs/screenshots/launch'
const SHOTS = [
  ['brand', 'brand.where'],
  ['name', 'name.pick'],
  ['maps-name', 'maps.name'],
  ['instagram-profile', 'ig.profile'],
  ['listing', 'listing.gonedancing'],
] as const

const browser = await chromium.launch()
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  await ctx.addCookies([{ name: 'wedance-session', value: process.env.SESSION!, url: BASE }])
  const page = await ctx.newPage()
  for (const [name, step] of SHOTS) {
    if (label === 'mobile' && name !== 'brand' && name !== 'maps-name') continue
    await page.goto(`${BASE}/business/network/${HANDLE}/launch?step=${step}`, { waitUntil: 'networkidle' })
    await page.locator(`#step-${step.replace('.', '\\.')}`).waitFor()
    await page.addStyleTag({ content: '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important }' })
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (wide) console.log(`${label} ${step}: page is wider than the screen`)
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true })
  }
  await ctx.close()
}
await browser.close()
console.log(`Screenshots in ${OUT}/`)
