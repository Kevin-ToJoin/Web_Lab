/**
 * prettierChanged.test.ts
 *
 * The format check is the kind of step that fails silently: pick the wrong base
 * commit and it reports success having looked at nothing, which is exactly the
 * "decorative tooling" the repo standard penalises. These are the two decisions
 * it makes, so these are what get tested.
 */

import { describe, it, expect } from 'vitest';
import { resolveBase, formattable } from '../../scripts/prettier-changed.mjs';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const allExist = () => true;

describe('resolveBase — which commit the diff is taken against', () => {
  it('prefers an explicit --base over everything else', () => {
    expect(
      resolveBase({ env: { GITHUB_BASE_REF: 'main' }, argBase: 'v1.2.0', exists: allExist }),
    ).toBe('v1.2.0');
  });

  it('honours PRETTIER_BASE when no argument is given', () => {
    expect(resolveBase({ env: { PRETTIER_BASE: 'origin/dev' }, exists: allExist })).toBe(
      'origin/dev',
    );
  });

  it('on a pull request compares against the remote target branch', () => {
    expect(resolveBase({ env: { GITHUB_BASE_REF: 'main' }, exists: allExist })).toBe('origin/main');
  });

  it('falls back to the bare branch name when the remote ref was not fetched', () => {
    const exists = (ref: string) => ref === 'main';
    expect(resolveBase({ env: { GITHUB_BASE_REF: 'main' }, exists })).toBe('main');
  });

  it('on a push compares against the commit that was pushed from', () => {
    const before = 'a'.repeat(40);
    expect(resolveBase({ env: { GITHUB_EVENT_BEFORE: before }, exists: allExist })).toBe(before);
  });

  it('ignores the all-zero sha of a branch first push', () => {
    expect(resolveBase({ env: { GITHUB_EVENT_BEFORE: '0'.repeat(40) }, exists: allExist })).toBe(
      'HEAD~1',
    );
  });

  it('ignores a before-sha that is not in the clone (force push)', () => {
    const exists = (ref: string) => ref === 'HEAD~1';
    expect(resolveBase({ env: { GITHUB_EVENT_BEFORE: 'b'.repeat(40) }, exists })).toBe('HEAD~1');
  });

  it('uses the previous commit locally', () => {
    expect(resolveBase({ env: {}, exists: allExist })).toBe('HEAD~1');
  });

  it('uses the empty tree in a repo with a single commit', () => {
    expect(resolveBase({ env: {}, exists: () => false })).toBe(EMPTY_TREE);
  });
});

describe('formattable — which changed files Prettier is given', () => {
  it('keeps the extensions Prettier has a parser for', () => {
    const paths = [
      'src/App.tsx',
      'api/solutions.ts',
      'vercel.json',
      'README.md',
      '.github/workflows/ci.yml',
    ];
    expect(formattable(paths, { exists: allExist })).toEqual(paths);
  });

  it('drops files Prettier cannot parse, which would abort the whole run', () => {
    const paths = ['schema.sql', 'Dockerfile', 'nginx.conf', 'hero.png', 'LICENSE'];
    expect(formattable(paths, { exists: allExist })).toEqual([]);
  });

  it('drops paths that no longer exist, as a rename leaves the old one in the diff', () => {
    const exists = (p: string) => p !== 'src/old.tsx';
    expect(formattable(['src/old.tsx', 'src/new.tsx'], { exists })).toEqual(['src/new.tsx']);
  });

  it('ignores blank entries from an empty diff', () => {
    expect(formattable([''], { exists: allExist })).toEqual([]);
  });
});
