/**
 * auth-flow.spec.ts — E2E smoke + bug coverage for the Auth app ("VaultAuth")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test';
import { mockSolutionsApi } from './support/solutions';

test.describe('Auth App — VaultAuth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('app loads with the VaultAuth heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'VaultAuth', exact: true })).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
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
      'AUT-01': { title: 'Login accepts an empty password' },
    });

    await page.getByRole('tab', { name: 'Solutions' }).click();
    await expect(page.getByRole('heading', { name: 'Solutions are locked' })).toBeVisible();

    await page.getByLabel('Enter unlock code').fill('REVEAL');
    await page.getByLabel('Enter unlock code').press('Enter');

    await expect(page.getByText('AUT-01')).toBeVisible();

    // The unlock hit the answers service once, with this module and the code.
    expect(requests).toEqual([{ app: 'auth', key: 'REVEAL' }]);
  });

  /**
   * KNOWN BUG — AUT-01: the password minimum-length gate uses > 6, so a
   * 7-character password is wrongly accepted at sign-up.
   */
  test('[BUG-AUT-01] sign-up accepts a 7-character password', async ({ page }) => {
    await page.getByLabel('Email', { exact: true }).first().fill('newuser@x');
    await page.getByLabel('Password', { exact: true }).first().fill('Abc123!'); // 7 chars
    await page.getByLabel('Confirm password').fill('Abc123!');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Requirement: reject (< 8 chars). Bug: account is created.
    await expect(page.getByTestId('signup-status')).toContainText('Account created');
  });

  /**
   * KNOWN BUG — AUT-08: the confirm-password field is never compared, so a
   * mismatch between password and confirmation is accepted.
   */
  test('[BUG-AUT-08] sign-up accepts a password/confirm mismatch', async ({ page }) => {
    await page.getByLabel('Email', { exact: true }).first().fill('mismatch@x');
    await page.getByLabel('Password', { exact: true }).first().fill('Abc12345');
    await page.getByLabel('Confirm password').fill('TotallyDifferent9');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Requirement: reject on mismatch. Bug: account is created anyway.
    await expect(page.getByTestId('signup-status')).toContainText('Account created');
  });

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TestLab 101')).toBeVisible();
  });
});
