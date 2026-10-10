import type { Locator, Page } from '@playwright/test'

/** Dev-only chrome and anything that moves on its own. Hidden before every check. */
export const STABILIZE_CSS = `
  nuxt-devtools-frame, #nuxt-devtools-container, #nuxt-devtools-anchor,
  [id^="nuxt-devtools"], .nuxt-devtools-frame, vite-error-overlay,
  #__vue-inspector-container, [data-v-inspector-ignore] { display: none !important; }
  *, *::before, *::after {
    animation: none !important; transition: none !important;
    caret-color: transparent !important; scroll-behavior: auto !important;
  }
  video, iframe { visibility: hidden !important; }
`

/** Open a route and wait until it is hydrated, fonts are in and images have loaded. */
export async function gotoStable(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'load' })
  await page.addStyleTag({ content: STABILIZE_CSS })
  await page.waitForFunction(() => (window as any).useNuxtApp?.()?.isHydrating === false || !!(window as any).__NUXT__, null, { timeout: 30_000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  // Force lazy images to load, then wait for them.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => img.setAttribute('loading', 'eager'))
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000) })))
  })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  return res
}

/**
 * Regions whose content is data or time, not design. Masked in screenshots.
 * Pages can opt a region in explicitly with `data-visual-mask`.
 */
export function dynamicMasks(page: Page): Locator[] {
  return [
    page.locator('[data-visual-mask]'),
    page.locator('time'),
    page.locator('img[src*="cloudinary"], img[src*="googleusercontent"], img[src*="wikimedia"], img[src*="wikipedia"]'),
  ]
}
