/**
 * exam-flow.spec.ts — E2E smoke + bug coverage for the Exam app ("CertifyHub")
 *
 * Bug tests are CHARACTERIZATION tests: they assert the known bug currently
 * EXISTS so the suite stays green while documenting the requirement.
 */

import { test, expect } from '@playwright/test';
import { mockSolutionsApi } from './support/solutions';

test.describe('Exam App — CertifyHub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exam');
  });

  test('app loads with the CertifyHub heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'CertifyHub', exact: true })).toBeVisible();
    await expect(page.getByText('Exam Summary')).toBeVisible();
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
      'EXM-02': { title: 'Score is rounded up on a failing mark' },
    });

    await page.getByRole('tab', { name: 'Solutions' }).click();
    await expect(page.getByRole('heading', { name: 'Solutions are locked' })).toBeVisible();

    await page.getByLabel('Enter unlock code').fill('REVEAL');
    await page.getByLabel('Enter unlock code').press('Enter');

    await expect(page.getByText('EXM-02')).toBeVisible();

    // The unlock hit the answers service once, with this module and the code.
    expect(requests).toEqual([{ app: 'exam', key: 'REVEAL' }]);
  });

  /**
   * KNOWN BUG — EXM-09: the exam can be submitted with zero answers, and
   * EXM-03: those blank answers are counted correct, so a result appears.
   */
  test('[BUG-EXM-09] exam submits with zero answers', async ({ page }) => {
    await page.getByTestId('submit-exam').click();
    await expect(page.getByTestId('exam-result')).toBeVisible();
  });

  /**
   * KNOWN BUG — EXM-03: unanswered questions are counted correct, so an exam
   * submitted with NO answers still passes.
   */
  test('[BUG-EXM-03] a blank exam is graded as a PASS', async ({ page }) => {
    await page.getByTestId('submit-exam').click();
    await expect(page.getByTestId('exam-verdict')).toHaveText('PASS');
  });

  test('Back to Hub navigates to the hub home', async ({ page }) => {
    await page.getByRole('button', { name: 'Back to Hub' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TestLab 101')).toBeVisible();
  });
});
