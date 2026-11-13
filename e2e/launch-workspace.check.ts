/**
 * Screenshots of the launch workspace (Business → page → Launch) for review.
 *   BASE_URL=http://localhost:3017 SESSION=<a local session token> HANDLE=latimberia bun e2e/launch-workspace.check.ts
 * Needs a page seeded with scripts/seed-launch-la-timberia.ts on a LOCAL database.
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const HANDLE = process.env.HANDLE ?? 'latimberia'
const OUT = 'docs/screenshots/launch'
const browser = await chromium.launch()
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  await ctx.addCookies([{ name: 'wedance-session', value: process.env.SESSION!, url: BASE }])
  const page = await ctx.newPage()
  await page.goto(`${BASE}/business/network/${HANDLE}/launch`, { waitUntil: 'networkidle' })
  await page.getByText('The path').waitFor()
  await page.addStyleTag({ content: '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important }' })
  await page.screenshot({ path: `${OUT}/${label}-top.png` })
  if (label === 'mobile') { await ctx.close(); continue }
  // Stage 2: the name step (done → collapsed) opened.
  await page.getByRole('button', { name: /Pick a name nobody here uses/ }).click()
  await page.locator('#step-name\\.pick').screenshot({ path: `${OUT}/name.png` })
  await page.locator('#step-maps\\.name').screenshot({ path: `${OUT}/maps-name.png` })
  await page.locator('#step-maps\\.description').screenshot({ path: `${OUT}/maps-description.png` })
  await page.locator('#step-ig\\.profile').screenshot({ path: `${OUT}/instagram-profile.png` })
  await page.locator('#step-listing\\.gonedancing').screenshot({ path: `${OUT}/listing.png` })
  await page.locator('section').last().screenshot({ path: `${OUT}/next-stages.png` })
  // The evidence rule in the UI: "Mark done" stays off without a link.
  const blocker = await page.locator('#step-maps\\.basics').innerText()
  console.log('maps.basics status area ok:', /Mark done/i.test(blocker))
  await ctx.close()
}
await browser.close()
console.log(`Screenshots in ${OUT}/`)
