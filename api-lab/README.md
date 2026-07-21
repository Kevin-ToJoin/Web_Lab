# TestLab 101 — API & Data track

A **deliberately-buggy backend** for practicing the half of QA that a browser
can't teach: HTTP status-code correctness, API contracts, database integrity,
concurrency, and async queues. Where the frontend lab
([tojoin.org/Lab101](https://tojoin.org/Lab101)) covers the component/UI test
level, this covers **integration, system, and contract** testing — the things
you'd actually do with curl, Postman, `psql`, and k6.

It's a small e-commerce order API — **OrderFlow** — seeded with real, findable
defects across four areas.

## Quick start

You need Docker. Then:

```bash
cd api-lab
docker compose up --build
```

That brings up five services:

| Service   | URL                          | What it is                              |
|-----------|------------------------------|-----------------------------------------|
| `api`     | http://localhost:4000        | the buggy REST API                      |
| `worker`  | —                            | the async fulfillment consumer (BullMQ) |
| `db`      | localhost:5432               | Postgres (user `lab` / pass `lab`)      |
| `redis`   | localhost:6379               | queue backend                           |
| `adminer` | http://localhost:8080        | visual DB inspector                     |

Sanity check:

```bash
curl localhost:4000/                    # service banner
curl localhost:4000/_lab/requirements   # the contract the API SHOULD meet
```

## How to practice

1. Read the **requirements**: `GET /_lab/requirements`.
2. Explore the API and try to break it. Starting points:
   - Import `postman_collection.json` into Postman/Bruno — every request is
     labelled with the bug it exposes.
   - Inspect the database in **Adminer** (http://localhost:8080, system
     `PostgreSQL`, server `db`, user/pass `lab`, database `orderflow`).
   - Watch the queue: `GET /admin/queue`.
   - Trigger the concurrency bug: `k6 run load/k6-oversell.js`.
3. Write each finding up as a real bug report (title, steps, expected vs
   actual, severity).
4. **Reveal the tagged answers** when you're done: `GET /_lab/bugs?key=REVEAL`.
   Every bug is classified with its ISTQB tags — test type, quality
   characteristic, test-design technique, and test level — just like the
   frontend QA Inspector.

## What's in scope (19 injected bugs)

- **HTTP / Contract** — wrong status codes (200-instead-of-404, 500-instead-of-400,
  200-instead-of-201, 200-on-auth-failure), uncapped page size, a health check
  that lies, ignored idempotency keys, and an inconsistent error envelope.
- **Database** — a missing UNIQUE constraint, a missing foreign key, a
  non-transactional write, SQL injection, an overselling race, and money stored
  as a float.
- **Queue / Async** — a non-idempotent consumer that double-processes on retry,
  and a poison message that stalls with no dead-letter queue.
- **Security** — IDOR, an admin endpoint that leaks password hashes with no
  authorization, and a login with no rate limiting.

Full tagged list: [`KNOWN_BUGS.md`](./KNOWN_BUGS.md) (or the live
`GET /_lab/bugs?key=REVEAL`).

## Fixing / extending

The API runs the TypeScript directly with `tsx` (no build step). To hack on it
outside Docker:

```bash
cd api-lab/api
npm install
DATABASE_URL=postgres://lab:lab@localhost:5432/orderflow REDIS_URL=redis://localhost:6379 npm start
```

Every bug is marked with a `BUG-…` comment next to the code that causes it, and
each `KNOWN_BUGS` entry names the one-line-ish fix.

> ⚠️ This service is intentionally insecure and incorrect. Never deploy it, and
> never point it at data you care about. It exists only to be tested.
