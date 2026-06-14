/**
 * bank-flow.spec.ts — E2E smoke + bug coverage for the Bank app ("Vault Online")
 */

import { test, expect } from '@playwright/test'

test.describe('Bank App — Vault Online', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bank')
  })

  test('app loads with the Vault Online Banking heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Vault Online Banking' })).toBeVisible()
    await expect(page.getByText('Logged in as Alice Morgan')).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
    await expect(page.getByText('Bank Core System').first()).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    await expect(page.getByText('BNK-03')).toBeVisible()
    await expect(page.getByText(/other users.*balances/i)).toBeVisible()
  })

  /**
   * KNOWN BUG — BNK-03: the "From Account" dropdown lists every account, including
   * other owners' accounts and balances, instead of only the logged-in user's.
   */
  test('[BUG-BNK-03] account dropdown exposes other users accounts', async ({ page }) => {
    const fromSelect = page.locator('select.input-field').first()
    // Requirement: only Alice Morgan's accounts should appear.
    // Bug: Bob Carter and Carol Diaz accounts (and balances) are also listed.
    await expect(fromSelect.locator('option', { hasText: 'Bob Carter' })).toHaveCount(1)
    await expect(fromSelect.locator('option', { hasText: 'Carol Diaz' })).toHaveCount(1)
  })

  /**
   * KNOWN BUG — BNK-08: an empty amount is parsed as 0 and submitted instead of rejected.
   */
  test('[BUG-BNK-08] transfer with empty amount is accepted', async ({ page }) => {
    await page.getByPlaceholder('e.g. 1001-2002-9999').fill('1001-2002-9999')
    await page.getByRole('button', { name: 'Send Transfer' }).click()

    // Requirement: a blank amount is invalid. Bug: a $0 transfer is "submitted".
    await expect(page.getByText(/Transfer of \$0 submitted/)).toBeVisible()
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
