/**
 * Visual regression for the design system. @visual
 *
 *   bun run test:visual                      compare against baselines
 *   bun run test:visual -- --update-snapshots  accept intended changes
 *
 * Baselines live in e2e/design/__screenshots__/<platform>/. They are generated on
 * macOS; a Linux CI run would need its own set, so this suite is local-only.
 * Product routes read the database: only the first viewport is compared and
 * data regions are masked — still, regenerate baselines when content shifts.
 */
import { expect, test } from '@playwright/test'
import { dynamicMasks, gotoStable } from './helpers'
import { DESIGN_ROUTES, PRODUCT_ROUTES } from './pages'

test.describe('@visual design docs', () => {
  for (const route of DESIGN_ROUTES) {
    test(`${route.path}`, async ({ page }, info) => {
      await gotoStable(page, route.path)
      await expect(page).toHaveScreenshot(`${route.name}-${info.project.name}.png`, {
        fullPage: route.fullPage,
        mask: dynamicMasks(page),
      })
    })
  }
})

test.describe('@visual product routes', () => {
  for (const route of PRODUCT_ROUTES) {
    test(`${route.path}`, async ({ page }, info) => {
      await gotoStable(page, route.path)
      await expect(page).toHaveScreenshot(`${route.name}-${info.project.name}.png`, {
        fullPage: route.fullPage,
        mask: dynamicMasks(page),
        // DB-driven pages: tolerate small content wobble (counts, names) above the fold.
        maxDiffPixelRatio: 0.03,
      })
    })
  }
})
