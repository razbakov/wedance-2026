import { expect } from '@playwright/test'
import { Then, When } from './fixtures'

Then('the landing headline is {string}', async ({ page }, headline: string) => {
  await expect(page.getByRole('heading', { level: 1, name: headline, exact: true })).toBeVisible()
})

When('I choose the {string} audience', async ({ page }, label: string) => {
  await page.getByRole('tab', { name: label, exact: true }).click()
})

Then('the landing address is {string}', async ({ page }, path: string) => {
  await expect.poll(() => {
    const url = new URL(page.url())
    return url.pathname + url.search
  }).toBe(path)
})

When('I open the landing address {string}', async ({ page }, path: string) => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
})
