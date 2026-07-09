/**
 * insurance-flow.spec.ts — E2E smoke + bug coverage for the Insurance app ("SecureQuote")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test'

test.describe('Insurance App — SecureQuote', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insurance')
  })

  test('app loads with the SecureQuote heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SecureQuote', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Policy Details' })).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    await expect(page.getByText('INS-05')).toBeVisible()
  })

  /**
   * KNOWN BUG — INS-05: the /api/quote handler applies the discount with no
   * Math.max(0, ...) clamp, so a discount above the premium goes negative. We
   * assert the negative premium EXISTS through the live API tester.
   */
  test('[BUG-INS-05] quote endpoint returns a negative premium', async ({ page }) => {
    await page.getByRole('tab', { name: 'API' }).click()
    await page.getByText('/api/quote').click()

    const body = page.getByRole('textbox').first()
    await body.fill('{"coverage":"basic","region":"rural","age":40,"highRisk":false,"smoker":false,"discount":2000}')
    await page.getByRole('button', { name: 'Send POST request to /api/quote' }).click()

    // A large discount with no Math.max(0, ...) clamp yields a negative premium.
    await expect(page.getByText(/-1640/)).toBeVisible()
  })

  /**
   * KNOWN BUG — INS-01: the young-driver surcharge boundary uses age <= 25, so a
   * driver who is exactly 25 is wrongly charged the +$150 surcharge.
   */
  test('[BUG-INS-01] young-driver surcharge charges a 25-year-old', async ({ page }) => {
    await page.getByLabel('Driver Age').fill('25')
    await page.getByLabel('Region').selectOption('rural')
    await page.getByLabel('Coverage Level').selectOption('basic')
    await page.getByRole('button', { name: 'Calculate Premium' }).click()

    // Requirement: under-25 only. Bug: a 25-year-old still gets the +$150 line.
    await expect(page.getByText('Young-driver surcharge: +$150')).toBeVisible()
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
