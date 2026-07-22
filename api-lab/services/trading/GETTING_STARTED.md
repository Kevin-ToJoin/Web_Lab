# Getting started — Module 6: Trading Dashboard (backend lab)

This is a beginner-friendly, step-by-step guide to running the **Trading Desk
API lab** on your own computer. No coding experience needed. You'll install one
app, download one file, and run one command.

The lab is a small, **deliberately buggy** trading API (instruments, orders,
positions, portfolio) with a real database. This is the "impossible" module —
the bugs are the nasty ones: race conditions / double-spend, float money drift,
stale fills, wrong cost basis, missing idempotency, timezone drift.

---

## What you need

- A Windows, macOS, or Linux computer.
- **Docker Desktop** — free software that runs the lab in a sandbox.

---

## Step 1 — Install Docker Desktop (one time)

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Download for your OS and install it (default options).
3. Open **Docker Desktop** and wait until it says **"Docker Desktop is running."**

## Step 2 — Download the lab file

Download this single file into a **new empty folder** (e.g. `trading-lab`):

- **`docker-compose.yml`** — from `api-lab/services/trading/docker-compose.yml`.
  (On the website's Trading module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `Trading Desk API listening on :4005`, it's ready. **Leave this
window open.**

## Step 5 — Check that it's working

- **http://localhost:4005/_lab/requirements** — the rules the desk is *supposed*
  to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **trading**. Seeded: account 1 (Alice, $10,000, holds 10 AAPL @150),
  account 2 (Bob, $250).

## Step 6 — Start testing

```bash
# Buy way beyond buying power — should be rejected, but cash goes negative (TRAD-01):
curl -X POST http://localhost:4005/orders -H 'content-type: application/json' \
  -d '{"account_id":2,"symbol":"AAPL","side":"buy","quantity":1000}'

# Market buy at your own made-up price — should ignore it (TRAD-06):
curl -X POST http://localhost:4005/orders -H 'content-type: application/json' \
  -d '{"account_id":1,"symbol":"AAPL","side":"buy","quantity":1,"price":0.01}'

# Concurrency — fire many buys at once and watch cash double-spend (TRAD-02):
seq 20 | xargs -P20 -I{} curl -s -X POST http://localhost:4005/orders \
  -H 'content-type: application/json' \
  -d '{"account_id":2,"symbol":"AAPL","side":"buy","quantity":1}' >/dev/null
curl http://localhost:4005/accounts/2/portfolio
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4005/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4005 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4005:4005"` (e.g. to
  `"4015:4005"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
