// Runs Prettier over ONLY the files a change touches — never the whole repo.
//
// Reformatting everything would produce a commit that touches every file and
// destroy `git blame`, so the MustHave standard asks for an incremental check
// instead. The base-ref logic lives here (not inlined in the workflow) because
// it has to work in three different situations, and getting it wrong means the
// step silently checks nothing:
//
//   pull_request  compare against the merge-base with the target branch
//   push          compare against the pushed-from commit (github.event.before)
//   local         compare against HEAD~1, or pass --base=<ref> explicitly
//
// Usage:
//   node scripts/prettier-changed.mjs --check        # CI
//   node scripts/prettier-changed.mjs --write        # fix what you just wrote
//   node scripts/prettier-changed.mjs --base=main --check
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Extensions Prettier has a parser for. Anything else (.sql, .sh, Dockerfile,
// .png) would abort the run with "No parser could be inferred", so it is the
// file list that must be filtered — not Prettier's behaviour that is wrong.
const SUPPORTED = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'css',
  'scss',
  'less',
  'html',
  'md',
  'markdown',
  'yml',
  'yaml',
]);

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const ZERO_SHA = /^0{40}$/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const revExists = (ref) => {
  if (!ref) return false;
  try {
    git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};

// Exported for tests: picking the wrong base is the failure mode that makes this
// step pass without ever looking at a file.
export function resolveBase({ env = process.env, argBase, exists = revExists } = {}) {
  if (argBase) return argBase;
  if (env.PRETTIER_BASE) return env.PRETTIER_BASE;

  // pull_request: GITHUB_BASE_REF is the target branch name, e.g. "main".
  if (env.GITHUB_BASE_REF) {
    const remote = `origin/${env.GITHUB_BASE_REF}`;
    if (exists(remote)) return remote;
    if (exists(env.GITHUB_BASE_REF)) return env.GITHUB_BASE_REF;
  }

  // push: github.event.before is all zeros for a branch's first push, and points
  // at a commit that does not exist locally after a force-push.
  const before = env.GITHUB_EVENT_BEFORE;
  if (before && !ZERO_SHA.test(before) && exists(before)) return before;

  // Local, or a first push: the previous commit. A repo with a single commit has
  // no HEAD~1, so fall back to the empty tree (everything counts as added).
  return exists('HEAD~1') ? 'HEAD~1' : EMPTY_TREE;
}

// Exported for tests: a filter that is too wide aborts the run, one that is too
// narrow skips files and reports success.
export function formattable(paths, { exists = existsSync } = {}) {
  return paths
    .filter(Boolean)
    .filter((p) => SUPPORTED.has(p.split('.').pop().toLowerCase()))
    .filter((p) => exists(p)); // a rename leaves the old path in the diff
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--write') ? '--write' : '--check';
  const argBase = args.find((a) => a.startsWith('--base='))?.slice('--base='.length);
  const base = resolveBase({ argBase });

  // Three dots: compare against the merge-base, so commits that landed on the
  // target branch after this one started are not attributed to it.
  const range = base === EMPTY_TREE ? `${EMPTY_TREE}..HEAD` : `${base}...HEAD`;
  const files = formattable(git('diff', '--name-only', '--diff-filter=ACMR', range).split('\n'));

  if (files.length === 0) {
    console.log(`No formattable files changed against ${base} — nothing to check.`);
    return;
  }

  console.log(`Prettier ${mode} on ${files.length} changed file(s) against ${base}:`);
  for (const f of files) console.log(`  ${f}`);

  // Inherit stdio so Prettier's own report is the step's output, and let a
  // non-zero exit propagate: that is what turns the CI step red.
  execFileSync('npx', ['prettier', mode, '--no-error-on-unmatched-pattern', ...files], {
    stdio: 'inherit',
  });
}

// Only run when invoked directly, so the tests can import the pure helpers.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
