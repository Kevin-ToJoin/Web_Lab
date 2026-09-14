// Test double for the server-gated answer key.
//
// The Solutions tab stopped shipping its content in the bundle: the browser now
// POSTs { app, key } to a Vercel function that validates the key server-side and
// returns the answers. `vite dev` — which is what these specs run against — does
// not execute that function, so every unlock attempt failed and took the 11
// "Solutions are locked" specs with it.
//
// Standing in for the function here keeps what the spec can actually own: the
// lock is closed until the right code is entered, the request carries the module
// slug and the key, and whatever the service returns for the current page's bug
// ids reaches the DOM. The real answers are deliberately not in this repo, so
// asserting their prose was never something CI could do.
import type { Page } from '@playwright/test';

export interface MockAnswer {
  title: string;
  location?: string;
  technique?: string;
  buggyCode?: string;
  fixedCode?: string;
  explanation?: string;
}

export interface SolutionsRequest {
  app: string;
  key: string;
}

/**
 * Intercepts the answers endpoint and replies the way the function does: 401 for
 * a wrong key, `{ answers }` for the right one. Returns the list of requests it
 * saw, so a spec can assert what the client sent.
 */
export async function mockSolutionsApi(
  page: Page,
  answers: Record<string, MockAnswer>,
): Promise<SolutionsRequest[]> {
  const seen: SolutionsRequest[] = [];

  // Glob, not a fixed URL: dev calls /api/solutions on the same origin while a
  // production build calls the deployment by its absolute URL.
  await page.route('**/api/solutions', async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Partial<SolutionsRequest>;
    seen.push({ app: String(body.app), key: String(body.key) });

    if (body.key !== 'REVEAL') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }

    // Fill in the fields a solution card reads but the spec does not assert, so a
    // card renders complete instead of with holes.
    const complete = Object.fromEntries(
      Object.entries(answers).map(([bugId, a]) => [
        bugId,
        {
          // Defaults must not repeat the bug id or the title: a spec locating
          // either by text would match two elements and fail on strict mode.
          location: 'src/apps/ExampleApp.tsx',
          technique: 'Boundary analysis',
          buggyCode: '// buggy',
          fixedCode: '// fixed',
          explanation: 'Answer text supplied by the answers service.',
          ...a,
        },
      ]),
    );

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ answers: complete }),
    });
  });

  return seen;
}
