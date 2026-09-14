/**
 * insurance-flow.spec.ts — E2E smoke + bug coverage for the Insurance app ("SecureQuote")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test';
import { mockSolutionsApi } from './support/solutions';

test.describe('Insurance App — SecureQuote', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insurance');
  });

  test('app loads with the SecureQuote heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SecureQuote', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Policy Details' })).toBeVisible();
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
      'INS-05': { title: 'Quote premium can go negative' },
    });

    await page.getByRole('tab', { name: 'Solutions' }).click();
    await expect(page.getByRole('heading', { name: 'Solutions are locked' })).toBeVisible();

    await page.getByLabel('Enter unlock code').fill('REVEAL');
    await page.getByLabel('Enter unlock code').press('Enter');

    await expect(page.getByText('INS-05')).toBeVisible();

    // The unlock hit the answers service once, with this module and the code.
    expect(requests).toEqual([{ app: 'insurance', key: 'REVEAL' }]);
  });

  /**
   * INS-05 (a discount larger than the premium yields a negative premium) has no
   * E2E test on purpose. It used to be driven through the QA Inspector's simulated
   * API tester, which this module dropped when it got a real Dockerised backend.
   * Through the form the case is now unreachable with valid input — the largest
   * discount the UI can apply is $250 against a minimum premium of $360 — and the
   * backend's equivalent (INSU-02) takes a different request shape that no web
   * spec can reach. The bug stays documented in src/data/bugs/insurance.ts.
   */

  /**
   * KNOWN BUG — INS-01: the young-driver surcharge boundary uses age <= 25, so a
   * driver who is exactly 25 is wrongly charged the +$150 surcharge.
   */
  test('[BUG-INS-01] young-driver surcharge charges a 25-year-old', async ({ page }) => {
    await page.getByLabel('Driver Age').fill('25');
    await page.getByLabel('Region').selectOption('rural');
    await page.getByLabel('Coverage Level').selectOption('basic');
    await page.getByRole('button', { name: 'Calculate Premium' }).click();

    // Requirement: under-25 only. Bug: a 25-year-old still gets the +$150 line.
    await expect(page.getByText('Young-driver surcharge: +$150')).toBeVisible();
  });

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TestLab 101')).toBeVisible();
  });
});
