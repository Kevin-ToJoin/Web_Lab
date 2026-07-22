# Getting started — Module 4: Bank Core System (backend lab)

This is a beginner-friendly, step-by-step guide to running the **Bank API lab**
on your own computer. No coding experience needed. You'll install one app,
download one file, and run one command.

The lab is a small, **deliberately buggy** core-banking API (accounts,
transfers, statements) with a real database that you practice testing on — using
curl, Postman, or your browser. It's where the money-handling bugs live: float
rounding, non-atomic transfers, missing idempotency, race conditions.

---

## What you need

- A Windows, macOS, or Linux computer.
- **Docker Desktop** — free software that runs the lab in a sandbox. That's the
  only thing to install.

---

## Step 1 — Install Docker Desktop (one time)

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Download the version for your operating system and install it (default options).
3. Open **Docker Desktop** and wait until it says **"Docker Desktop is running."**

> You only ever do this once.

## Step 2 — Download the lab file

Download this single file into a **new empty folder** (e.g. `bank-lab`):

- **`docker-compose.yml`** — from `api-lab/services/bank/docker-compose.yml`.
  (On the website's Bank module, the **API Lab** tab has a one-click download.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

The first time, Docker downloads the API, a database, and a database browser and
starts them together (~1 minute). When you see `Vault Bank API listening on
:4001`, it's ready. **Leave this window open.**

## Step 5 — Check that it's working

- **http://localhost:4001/_lab/requirements** — the rules the bank is *supposed*
  to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **bank**.

## Step 6 — Start testing

A couple you can paste into a terminal:

```bash
# Transfer more than the balance — it should be rejected, but overdraws:
curl -X POST http://localhost:4001/transfers \
  -H 'content-type: application/json' \
  -d '{"from_id":1,"to_id":3,"amount":999999}'

# Send the SAME idempotency key twice — it should run once, but posts twice:
curl -X POST http://localhost:4001/transfers -H 'content-type: application/json' \
  -H 'Idempotency-Key: abc' -d '{"from_id":1,"to_id":3,"amount":10}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4001/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4001 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4001:4001"` (e.g. to
  `"4011:4001"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
