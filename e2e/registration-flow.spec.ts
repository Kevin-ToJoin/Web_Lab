/**
 * registration-flow.spec.ts — E2E smoke + bug coverage for the Registration app ("DevPortal")
 *
 * Mirrors catalog-flow.spec.ts conventions: web-first assertions, real strings.
 */

import { test, expect } from '@playwright/test'

test.describe('Registration App — DevPortal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registration')
  })

  test('app loads with the Create Account heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    await expect(page.getByText('DevPortal Registration')).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
    // Reqs content (default tab)
    await expect(page.getByText('Registration Portal').first()).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    // A solution card (bug id) becomes visible
    await expect(page.getByText('REG-01')).toBeVisible()
    await expect(page.getByText('First name accepts a single character')).toBeVisible()
  })

  /**
   * KNOWN BUG — REG-01: First name minimum is 2 chars but the check uses < 1,
   * so a single character is wrongly accepted and Step 1 advances to Step 2.
   */
  test('[BUG-REG-01] single-character first name is wrongly accepted', async ({ page }) => {
    await page.getByPlaceholder('Min. 2 characters').fill('A')
    await page.getByPlaceholder('Max. 50 characters').fill('Smith')
    await page.getByPlaceholder('18+').fill('30')
    await page.getByPlaceholder('4–20 characters').fill('user1234')

    await page.getByRole('button', { name: 'Next' }).click()

    // Requirement: a 1-char first name should be rejected with a min-length error.
    // Bug: no error shown and the form advances to Step 2 (Account Credentials).
    await expect(page.getByText('Account Credentials')).toBeVisible()
    await expect(page.getByText('First name must be at least 2 characters.')).not.toBeVisible()
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
