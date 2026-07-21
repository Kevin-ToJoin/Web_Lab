# TestLab 101 — API & Data track

The frontend lab at **[tojoin.org/Lab101](https://tojoin.org/Lab101)** teaches the
presentation layer: observation, usability, accessibility, form validation — the
component/UI test level.

**This stack teaches the other half**: the backend. Real HTTP status codes and
contracts, database integrity, concurrency, and async queues — the integration /
system / contract test levels you'd actually exercise with **curl, Postman,
`psql`, and k6**. You can't teach a `500`-from-a-flaky-transaction or a
double-spend race with a mocked in-browser API; you need a real one.

## One service per module

Each frontend module gets a **matching real backend here**, so you can test the
same domain at both levels. Every module is self-contained under `services/`,
but they share one Postgres (a database each) and reuse infra, so it stays light
on a laptop.

| Module | Service | Port | Teaches | Bugs |
|--------|---------|------|---------|------|
| Catalog | `services/catalog` (TechMart) | 4002 | **search**, filtering, **pagination**, sorting, **reviews** | 13 |
| Ecommerce | `services/ecommerce` (OrderFlow) | 4000 | HTTP status codes & contracts, DB integrity, **queues** | 19 |
| Bank | `services/bank` (Vault Online) | 4001 | transactions, **ledger integrity**, **concurrency**, money math | 12 |

More modules (healthcare, delivery, …) drop in the same way — see
[Adding a module](#adding-a-module).

## Quick start

You need Docker. Then:

```bash
cd api-lab
docker compose up --build                 # every module + shared infra
```

Or bring up just one module:

```bash
docker compose up --build bank-api db     # only the bank backend
```

Shared services: **Postgres** (`localhost:5432`, user/pass `lab`), **Redis**
(`localhost:6379`, used by the ecommerce queue), **Adminer** DB browser
(http://localhost:8080 — system `PostgreSQL`, server `db`, user/pass `lab`;
pick the `ecommerce` or `bank` database).

Sanity check:

```bash
curl localhost:4000/_lab/requirements     # ecommerce contract
curl localhost:4001/_lab/requirements     # bank contract
```

## How to practice

Per module:

1. Read the contract: `GET /_lab/requirements`.
2. Import that module's `postman_collection.json` (each request is labelled with
   the bug it exposes), or drive it with curl.
3. Inspect the database in Adminer; watch the ecommerce queue at
   `GET localhost:4000/admin/queue`.
4. Trigger the concurrency bugs with k6:
   ```bash
   k6 run load/k6-oversell.js      # ecommerce oversell (BUG-DB-05)
   k6 run load/k6-doublespend.js   # bank double-spend (BANK-03)
   ```
5. Write each finding up as a real bug report.
6. Reveal the ISTQB-tagged answers when done: `GET /_lab/bugs?key=REVEAL`
   (per module), mirrored in each service's `KNOWN_BUGS.md`.

Every backend bug is tagged with the same four ISTQB axes as the frontend — test
type, quality characteristic, test-design technique, test level.

## Adding a module

1. `cp -r services/ecommerce services/<module>` (or start from `services/bank`
   for a queue-less service) and trim it to the new domain.
2. Give it its own database: add `CREATE DATABASE <module>;` to
   `db/00-databases.sql`, `\connect <module>` at the top of its `schema.sql`,
   and mount that schema + add the `<module>-api` service in
   `docker-compose.yml` (copy the `bank-api` block, pick a new port).
3. Fill `src/knownBugs.ts` with the module's ISTQB-tagged bugs and mark each in
   the code with a `BUG-…` comment. Keep the registry 1:1 with the code.

> ⚠️ These services are intentionally insecure and incorrect. Never deploy them,
> and never point them at real data. They exist only to be tested.
