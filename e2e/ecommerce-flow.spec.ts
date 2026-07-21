/**
 * ecommerce-flow.spec.ts — E2E smoke + bug coverage for the E-commerce app ("Bean & Brew")
 */

import { test, expect } from '@playwright/test'

test.describe('Ecommerce App — Bean & Brew', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ecommerce')
  })

  test('app loads with the Bean & Brew Store heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bean & Brew Store' })).toBeVisible()
    await expect(page.getByText('Premium Coffee Beans')).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bean & Brew Store' })).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    await expect(page.getByText('ECO-01')).toBeVisible()
    await expect(page.getByText('Cart quantity can go negative')).toBeVisible()
  })

  /**
   * KNOWN BUG — ECO-01: updateQuantity() lacks Math.max(0, ...) so decrementing
   * from 0 drives the quantity negative.
   */
  test('[BUG-ECO-01] decrement can drive quantity negative', async ({ page }) => {
    // The first product (Premium Coffee Beans) starts at quantity 0.
    const firstRow = page.locator('.glass-panel').filter({ hasText: 'Premium Coffee Beans' })
    await firstRow.getByRole('button', { name: '-', exact: true }).click()

    const qtyInput = firstRow.locator('input.input-field')
    // Requirement: quantity must never go below 0. Bug: it becomes -1.
    await expect(qtyInput).toHaveValue('-1')
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
