/**
 * trading-flow.spec.ts — E2E smoke + bug coverage for the Trading app ("QuantumTrader Pro")
 */

import { test, expect } from '@playwright/test'

test.describe('Trading App — QuantumTrader Pro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trading')
  })

  test('app loads with the QuantumTrader Pro heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'QuantumTrader Pro', exact: true })).toBeVisible()
    await expect(page.getByText('Place Order')).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
    await expect(page.getByText('Trading Dashboard').first()).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    await expect(page.getByText('TRD-07')).toBeVisible()
    await expect(page.getByText('Order quantity accepts fractional shares')).toBeVisible()
  })

  /**
   * BEHAVIOUR + KNOWN BUG — TRD-07: a market buy updates holdings/cash, and the
   * quantity field accepts a fractional value (parseFloat) instead of whole shares.
   * Starting TECH holding is 20 shares; buying 2.5 raises it to 22.5.
   */
  test('[BUG-TRD-07] fractional buy quantity is accepted and updates holdings', async ({ page }) => {
    await page.getByPlaceholder('Number of shares').fill('2.5')
    await page.getByRole('button', { name: 'Buy', exact: true }).click()

    // Order has a simulated ~450ms execution delay; web-first assertion waits for it.
    await expect(page.getByText(/Bought 2\.5 TECH/)).toBeVisible()

    // Holdings table shares for TECH should now reflect the fractional addition (22.5).
    const techRow = page.locator('tr', { hasText: 'TECH' }).first()
    await expect(techRow).toContainText('22.5')
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
