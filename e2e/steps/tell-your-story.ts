import { expect } from '@playwright/test'
import { Given, Then, When } from './fixtures'

Given('I am on the tell-your-story sketch', async ({ page }) => {
  await page.goto('/sketches/tell-your-story')
  await page.locator('[data-ready="1"]').waitFor()
  await page.getByRole('button', { name: 'Before booking', exact: true }).click()
})

Then('Going together does not offer to share a plan', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Going together' })).toBeVisible()
  await expect(page.getByText(/Coming with friends|Share your plan/i)).toHaveCount(0)
})

When('I choose {string}', async ({ page }, label: string) => {
  await page.locator('[data-ready="1"]').waitFor()
  await page.getByRole('button', { name: label, exact: true }).click()
})

async function opens(page: import('@playwright/test').Page, hash: string) {
  const link = page.locator('[data-tell-story] a')
  await expect(link).toHaveAttribute('href', `/my-plan#${hash}`)
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/my-plan#${hash}$`))
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Going together' })).toBeVisible()
}

Then('Tell your story opens the week on My plan', async ({ page }) => {
  await opens(page, 'share-week')
})

Then('Tell your story opens the year on My plan', async ({ page }) => {
  await opens(page, 'share-year')
})

Then('there is no story button', async ({ page }) => {
  await expect(page.locator('[data-tell-story]')).toHaveCount(0)
  await expect(page.getByText('a class is not a night out')).toBeVisible()
})
