/**
 * mobile-flow.spec.ts — E2E smoke + bug coverage for the Mobile app ("MobiTap")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test'

test.describe('Mobile App — MobiTap', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mobile')
  })

  test('app loads with the MobiTap heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'MobiTap', exact: true })).toBeVisible()
    await expect(page.getByTestId('phone-frame')).toBeVisible()
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

    await expect(page.getByText('MOB-01')).toBeVisible()
  })

  /**
   * KNOWN BUG — MOB-01: the primary Send button is 28px tall, below the 44px
   * accessible touch-target minimum.
   */
  test('[BUG-MOB-01] Send button is below the 44px touch target', async ({ page }) => {
    const box = await page.getByTestId('send-btn').boundingBox()
    expect(box!.height).toBeLessThan(44)
  })

  /**
   * KNOWN BUG — MOB-03: the amount input is type="text" with no inputMode,
   * so mobile shows the wrong keyboard.
   */
  test('[BUG-MOB-03] amount input uses the wrong input type', async ({ page }) => {
    await expect(page.locator('#amount')).toHaveAttribute('type', 'text')
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
