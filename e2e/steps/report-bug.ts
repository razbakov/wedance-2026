import { expect } from '@playwright/test'
import { Then, When } from './fixtures'

Then('the footer offers hello@wedance.vip', async ({ page }) => {
  const link = page.locator('footer').getByRole('link', { name: 'hello@wedance.vip' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', 'mailto:hello@wedance.vip')
})

When('I click "Report a problem" in the footer', async ({ page }) => {
  await page.locator('footer').getByRole('button', { name: 'Report a problem' }).click()
})

Then('I see the talk-to-us choices', async ({ page }) => {
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Talk to us' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Report a problem/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Share an idea/ })).toBeVisible()
})
