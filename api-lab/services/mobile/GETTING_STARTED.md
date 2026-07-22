# Getting started — Module 12: Mobile Wallet / MobiTap (backend lab)

This is a beginner-friendly, step-by-step guide to running the **MobiTap Wallet
API lab** on your own computer. No coding experience needed. You'll install one
app, download one file, and run one command.

The lab is a small, **deliberately buggy** mobile-wallet API (wallets, tap-to-pay
payments, top-ups, reversals) with a real database. The bugs are the wallet /
money classics: overspend, float drift, double-spend races, negative amounts,
missing idempotency, unenforced daily/PIN limits, and card-number (PAN) leaks.

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

Download this single file into a **new empty folder** (e.g. `mobile-lab`):

- **`docker-compose.yml`** — from `api-lab/services/mobile/docker-compose.yml`.
  (On the website's Mobile Wallet module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `MobiTap Wallet API listening on :4011`, it's ready. **Leave this
window open.**

## Step 5 — Check that it's working

- **http://localhost:4011/_lab/requirements** — the rules the wallet is *supposed*
  to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **mobile**. Seeded: wallet 1 (Alice, $120), wallet 2 (Bob, $15.50),
  and one payment.

## Step 6 — Start testing

```bash
# Overspend: pay more than the balance — should be rejected (WALL-01):
curl -X POST http://localhost:4011/wallets/2/pay -H 'content-type: application/json' \
  -d '{"amount":999,"merchant":"BigStore"}'

# Negative amount credits the wallet (WALL-04):
curl -X POST http://localhost:4011/wallets/1/pay -H 'content-type: application/json' \
  -d '{"amount":-50,"merchant":"Refund?"}'

# PAN leak: any caller reads the full card number (WALL-10):
curl http://localhost:4011/wallets/1

# Reverse the same payment twice → double refund (WALL-12):
curl -X POST http://localhost:4011/transactions/1/reverse
curl -X POST http://localhost:4011/transactions/1/reverse
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4011/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4011 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4011:4011"` (e.g. to
  `"4021:4011"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake card numbers. Never deploy it or point it at real data.
