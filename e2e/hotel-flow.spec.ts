/**
 * hotel-flow.spec.ts — E2E smoke + bug coverage for the Hotel app ("StayEasy")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test'

test.describe('Hotel App — StayEasy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hotel')
  })

  test('app loads with the StayEasy heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'StayEasy', exact: true })).toBeVisible()
    await expect(page.getByText('Search & Price a Stay')).toBeVisible()
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

    await expect(page.getByText('HOT-03')).toBeVisible()
  })

  /**
   * KNOWN BUG — HOT-03: nights are counted inclusively (+1). A 2-night stay
   * (Aug 10 → Aug 12) is priced as 3 nights.
   */
  test('[BUG-HOT-03] night count is off-by-one', async ({ page }) => {
    await page.getByLabel('Check-in').fill('2026-08-10')
    await page.getByLabel('Check-out').fill('2026-08-12')
    await page.getByRole('button', { name: 'Get Quote' }).click()

    // Requirement: 2 nights. Bug: the quote reports 3.
    await expect(page.getByText(/3 night\(s\)/)).toBeVisible()
  })

  /**
   * KNOWN BUG — HOT-06: the room subtotal ignores the number of rooms, so a
   * 2-room booking is billed the price of a single room.
   */
  test('[BUG-HOT-06] room subtotal ignores room count', async ({ page }) => {
    await page.getByLabel('Check-in').fill('2026-08-10')
    await page.getByLabel('Check-out').fill('2026-08-12')
    await page.getByLabel('Rooms').fill('2')
    await page.getByRole('button', { name: 'Get Quote' }).click()

    // Standard is $120/night; the buggy inclusive count makes 3 nights => $360
    // for ONE room, and the room count is ignored (not doubled to $720).
    await expect(page.getByText('$360.00').first()).toBeVisible()
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
