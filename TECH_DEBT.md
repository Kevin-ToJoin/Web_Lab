# Technical debt

What is knowingly left undone in this repo, why, and what closing it would take.

**This is not the same as the lab's bugs.** The defects in `src/apps/**` and
`api-lab/services/**` are injected on purpose — they are the teaching material,
catalogued in `src/data/knownBugs.ts` and each service's `KNOWN_BUGS.md`, and
they are not debt. This file is about the repo as a piece of engineering.

Measured 2026-09-18, at commit `23ef1d3`. The counts are reproducible with the
commands shown; re-run them before trusting a number.

---

## Open debt

### 1. Ten of the twelve lab backends have no behaviour tests

Only `bank` and `ecommerce` have them (`api-lab/services/*/tests/`), covering the
money paths. The other ten — auth, catalog, delivery, exam, healthcare, hotel,
insurance, mobile, registration, trading — have their types checked in CI and
nothing else.

```bash
for d in api-lab/services/*/; do [ -d "$d/tests" ] || basename "$d"; done
```

**Why it matters:** these backends exist to have their behaviour observed. A bug
that silently stops reproducing takes an exercise down with it, and for ten of
them nothing would notice.

**What it takes:** the pattern is already in place — `.github/workflows/api-lab.yml`
starts a service against a real Postgres (and Redis where the queue is used) and
runs `node --test`. Adding a service means a `tests/` directory and a matrix entry.
Mind the seeded stock/balance budgets: these suites mutate real rows, the seed only
runs on an empty database, and there is no reset endpoint.

### 2. Stale branches: 45 remote, 20 local

```bash
git branch -r | grep -v 'origin/HEAD\|origin/main$' | wc -l
git branch | wc -l
```

Most are finished module branches (`auth-complete`, `delivery-complete`,
`catalog-v01`, …) whose work reached `main` through squash-merged PRs.

**Why it is not a one-liner:** squashing rewrites the sha, so `git branch --merged`
recognises only one of the twenty. Deleting on that signal would be safe for the
wrong reason and unsafe in general. Each branch needs its _content_ compared against
`main` (`git diff <branch> origin/main --stat`, empty means fully contained) before
it goes.

### 3. The lab images ship devDependencies

`npm ci` in each service Dockerfile installs the full tree, `typescript` and
`@types/*` included, though the container only ever runs `tsx`.

**Why it is still open:** `npm ci --omit=dev` would slim twelve images, but the
services run TypeScript directly with no build step, so dropping dev packages needs
each image actually started and exercised, not just built. Worth doing deliberately,
not as a drive-by.

### 4. BUG-DB-05 (oversell) is not covered by CI

It is a race: it needs concurrent load to reproduce, so a single-threaded assertion
would be flaky and prove nothing. It has a purpose-built driver in
`api-lab/load/k6-oversell.js`, which nothing runs automatically.

**What it takes:** a scheduled (not per-push) job running k6 against a started
service, asserting stock can go negative. Off the push path, so a flaky race never
blocks a merge.

---

## Deliberate, and staying that way

These look like debt in a report and are not. Each is a decision with a reason.

### 210 of 362 files do not match Prettier

```bash
npx prettier --list-different . | wc -l
```

Formatting is checked on the files a change touches, never repo-wide
(`npm run format:check`). A bulk reformat would produce a commit touching every
file and destroy `git blame` — the MustHave standard names this as explicitly not
required. The number falls on its own as files get touched. If it is ever done, it
goes in one commit with its entry in `.git-blame-ignore-revs`.

### Four `react-hooks/exhaustive-deps` warnings

```
src/apps/catalog-v02/pages/CartPage.tsx:97      missing dependency: 'subtotal'
src/apps/catalog-v02/pages/CatalogHome.tsx:83   missing dependency: 'setRemoteSolutions'
src/apps/catalog-v02/pages/CategoryView.tsx:67  missing dependency: 'setRemoteSolutions'
src/apps/catalog-v02/pages/ProductDetail.tsx:97 missing dependency: 'setRemoteSolutions'
```

Left as warnings on purpose: they are real findings, so silencing them with an
`eslint-disable` would be exactly the decorative tooling the lint rules exist to
catch. A warning that reappears on every run stays visible; an `off` disappears.

### `packageManager` is not pinned in `package.json`

The MustHave notes ask for it, but that lesson is about `pnpm/action-setup` failing
with "No pnpm version is specified". This repo uses npm with `actions/setup-node`,
where that failure mode does not exist.

---

## Outside the repo

**Two blind spots to report to the MustHave standard.** Its page asks for rules
that measure wrong, and applying it here surfaced two:

1. `ci` passes on a workflow that never runs. This repo had 14 workflows and scored
   full marks while `ci.yml` was filtered to `[main, "claude/**"]`, so a push to any
   other branch was checked by nothing. Same family as the cron/dispatch false
   positive already fixed, reached by a different route.
2. `lint-completo` checks what the ESLint config _ignores_, not what it lints. Here
   only `dist` was ignored — a clean score — while every `.js`/`.mjs` file matched no
   `files` block and ran with zero rules. In flat config, "not ignored" is not
   "linted". Verified with a probe file containing an unused variable and a call to
   an undefined function: zero findings before the fix, two after.

**Auditing vulnerabilities needs every lockfile.** Dependabot counts alerts across
all 13 lockfiles in this repo; `npm audit` at the root reads one. A clean root audit
read as "no vulnerabilities" while 24 alerts were open in `api-lab/services/*`. Use
`gh api repos/Kevin-ToJoin/Web_Lab/dependabot/alerts?state=open`, or loop the audit
over every service.
