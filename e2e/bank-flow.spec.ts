/**
 * bank-flow.spec.ts — E2E smoke + bug coverage for the Bank app ("Vault Online")
 */

import { test, expect } from '@playwright/test';
import { mockSolutionsApi } from './support/solutions';

test.describe('Bank App — Vault Online', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bank');
  });

  test('app loads with the Vault Online Banking heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Vault Online Banking' })).toBeVisible();
    await expect(page.getByText('Logged in as Alice Morgan')).toBeVisible();
  });

  test('QA Inspector tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Reqs' })).toBeVisible();
    // These modules dropped the simulated DB/API tabs when they got a real
    // Dockerised backend: the API Lab tab replaced both.
    await expect(page.getByRole('tab', { name: 'API Lab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'DB', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Solutions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vault Online Banking' })).toBeVisible();
  });

  test('Solutions are locked until the REVEAL code is entered', async ({ page }) => {
    // The answers come from a serverless function that `vite dev` does not run,
    // so the spec serves them and asserts the client contract instead.
    const requests = await mockSolutionsApi(page, {
      'BNK-03': {
        title: 'From Account lists accounts of every owner',
        explanation: "The dropdown lists other users' accounts and balances.",
      },
    });

    await page.getByRole('tab', { name: 'Solutions' }).click();
    await expect(page.getByRole('heading', { name: 'Solutions are locked' })).toBeVisible();

    await page.getByLabel('Enter unlock code').fill('REVEAL');
    await page.getByLabel('Enter unlock code').press('Enter');

    await expect(page.getByText('BNK-03')).toBeVisible();
    await expect(page.getByText(/other users.*balances/i)).toBeVisible();

    // The unlock hit the answers service once, with this module and the code.
    expect(requests).toEqual([{ app: 'bank', key: 'REVEAL' }]);
  });

  /**
   * KNOWN BUG — BNK-03: the "From Account" dropdown lists every account, including
   * other owners' accounts and balances, instead of only the logged-in user's.
   */
  test('[BUG-BNK-03] account dropdown exposes other users accounts', async ({ page }) => {
    // The transfer form moved to its own route in the refactor.
    await page.goto('/bank/transfer');
    const fromSelect = page.locator('select.input-field').first();
    // Requirement: only Alice Morgan's accounts should appear.
    // Bug: Bob Carter and Carol Diaz accounts (and balances) are also listed.
    await expect(fromSelect.locator('option', { hasText: 'Bob Carter' })).toHaveCount(1);
    await expect(fromSelect.locator('option', { hasText: 'Carol Diaz' })).toHaveCount(1);
  });

  /**
   * KNOWN BUG — BNK-08: an empty amount is parsed as 0 and submitted instead of rejected.
   */
  test('[BUG-BNK-08] transfer with empty amount is accepted', async ({ page }) => {
    // The transfer form moved to its own route in the refactor.
    await page.goto('/bank/transfer');
    await page.getByPlaceholder('e.g. 1001-2002-9999').fill('1001-2002-9999');
    await page.getByRole('button', { name: 'Send Transfer' }).click();

    // Requirement: a blank amount is invalid. Bug: a $0 transfer is "submitted".
    await expect(page.getByText(/Transfer of \$0 submitted/)).toBeVisible();
  });

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TestLab 101')).toBeVisible();
  });
});
