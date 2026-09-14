import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// One block per runtime. Excluding a directory from the lint is the silent way of
// not having lint, so nothing of ours is ignored here: the build scripts, the
// Vercel function, the 12 api-lab backends and the k6 load tests each get the
// rules that apply to where they actually run. Before this split, every .js/.mjs
// file matched no block at all and ran with zero rules.
export default defineConfig([
  // Build artifacts and generated data only — never our own source.
  globalIgnores(['**/dist', 'playwright-report', 'test-results', 'api/_answers']),

  // 1 ── Browser: the React training apps and their unit tests (jsdom).
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // 2 ── Node + TypeScript: the serverless answer-key endpoint, the api-lab
  // services, the Playwright specs and the root tool configs. The React rules
  // are not "disabled" here, they simply never applied to server code.
  {
    files: [
      'api/**/*.ts',
      'api-lab/services/**/*.ts',
      'e2e/**/*.ts',
      'scripts/**/*.mts',
      '*.config.ts',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },

  // 3 ── Node + plain ESM: this file and the build/format scripts. `build` runs
  // scripts/nest-lab101.mjs, so a typo in it breaks every deploy.
  {
    files: ['**/*.{js,mjs,cjs}'],
    ignores: ['api-lab/load/**'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // 4 ── k6: its own runtime, neither browser nor Node. Only __ENV is used, and
  // `console` is the one host global these scripts rely on.
  {
    files: ['api-lab/load/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        console: 'readonly',
      },
      sourceType: 'module',
    },
  },
]);
