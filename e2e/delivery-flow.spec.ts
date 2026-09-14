/**
 * delivery-flow.spec.ts — E2E smoke + bug coverage for the Delivery app ("QuickBite")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test';
import { mockSolutionsApi } from './support/solutions';

test.describe('Delivery App — QuickBite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/delivery');
  });

  test('app loads with the QuickBite heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'QuickBite', exact: true })).toBeVisible();
    await expect(page.getByText('Menu', { exact: true })).toBeVisible();
  });

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible();
    // These modules dropped the simulated DB/API tabs when they got a real
    // Dockerised backend: the API Lab tab replaced both.
    await expect(page.getByRole('tab', { name: 'API Lab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'DB', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible();
  });

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    // The answers come from a serverless function that `vite dev` does not run,
    // so the spec serves them and asserts the client contract instead.
    const requests = await mockSolutionsApi(page, {
      'DEL-02': { title: 'Delivery fee is applied twice' },
    });

    await page.getByRole('tab', { name: 'Solutions' }).click();
    await expect(page.getByRole('heading', { name: 'Solutions are locked' })).toBeVisible();

    await page.getByLabel('Enter unlock code').fill('REVEAL');
    await page.getByLabel('Enter unlock code').press('Enter');

    await expect(page.getByText('DEL-02')).toBeVisible();

    // The unlock hit the answers service once, with this module and the code.
    expect(requests).toEqual([{ app: 'delivery', key: 'REVEAL' }]);
  });

  /**
   * KNOWN BUG — DEL-09: the Add button works for an out-of-stock item, so a
   * sold-out product can be added to the cart and priced.
   */
  test('[BUG-DEL-09] out-of-stock item can be added to the cart', async ({ page }) => {
    await page.getByTestId('add-wings').click();
    // Wings are out of stock, but a quantity control now exists for them.
    await expect(page.getByTestId('qty-wings')).toBeVisible();
  });

  /**
   * KNOWN BUG — DEL-12: an empty cart can place an order, producing a $0.00
   * confirmed order instead of being rejected.
   */
  test('[BUG-DEL-12] empty cart still places an order', async ({ page }) => {
    // Requirement: an empty cart must be rejected. Bug: the order is confirmed
    // anyway (the total still carries the delivery fee + tax, so it is not $0).
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('confirmation')).toBeVisible();
  });

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TestLab 101')).toBeVisible();
  });
});
