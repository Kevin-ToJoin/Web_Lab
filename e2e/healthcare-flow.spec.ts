/**
 * healthcare-flow.spec.ts — E2E smoke + bug coverage for the Healthcare app ("MediPortal Connect")
 */

import { test, expect } from '@playwright/test'

test.describe('Healthcare App — MediPortal Connect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/healthcare')
  })

  test('app loads with the MediPortal Connect heading', async ({ page }) => {
    // /healthcare lands on the Records page (Route path="/" -> <Records />).
    await expect(page.getByRole('heading', { name: 'MediPortal Connect', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Patient Records', exact: true })).toBeVisible()
  })

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'DB' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'MediPortal Connect', exact: true })).toBeVisible()
  })

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    // HLT-02's solution card lives on the Appointments page, so navigate there first.
    await page.goto('/healthcare/appointments')
    await page.getByRole('tab', { name: 'Solutions' }).click()
    await expect(page.getByText('Solutions Locked')).toBeVisible()

    await page.getByLabel('Solutions unlock code').fill('REVEAL')
    await page.getByLabel('Solutions unlock code').press('Enter')

    await expect(page.getByText('HLT-02')).toBeVisible()
    await expect(page.getByText('Booking accepts past dates')).toBeVisible()
  })

  /**
   * KNOWN BUG — HLT-02: handleBooking() never checks that the date is today or
   * later, so a past date is accepted and the appointment is booked.
   * (A non-Feb-29 date is used to avoid the unrelated HLT-03 leap-day throw.)
   */
  test('[BUG-HLT-02] booking a past date is accepted', async ({ page }) => {
    // Booking moved to the Appointments subpage; navigate there first.
    await page.goto('/healthcare/appointments')
    // Date input is type="date"; fill the ISO value directly.
    await page.locator('input[type="date"]').fill('2020-01-15')
    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    // Requirement: past dates must be rejected. Bug: the booking succeeds.
    await expect(page.getByText('Booked slots:')).toBeVisible()
    await expect(page.getByText('2020-01-15 @ 09:00')).toBeVisible()
    await expect(page.getByText(/Appointment booked/)).toBeVisible()
  })

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
  })
})
