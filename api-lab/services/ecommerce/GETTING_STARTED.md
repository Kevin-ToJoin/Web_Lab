# Getting started — Module 2: E-commerce Store (backend lab)

This is a beginner-friendly, step-by-step guide to running the **OrderFlow API
lab** on your own computer. No coding experience needed. You'll install one app,
download one file, and run one command.

The lab is a small, **deliberately buggy** e-commerce API (users, products,
orders) with a real database **and a background queue**. Orders are placed by
the API and fulfilled asynchronously by a worker via Redis — so this is where
you practice testing **queue / async** bugs (retries, poisoned jobs,
non-idempotent processing) on top of HTTP status codes and DB integrity.

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

Download this single file into a **new empty folder** (e.g. `ecommerce-lab`):

- **`docker-compose.yml`** — from `api-lab/services/ecommerce/docker-compose.yml`.
  (On the website's E-commerce module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a worker, a database, Redis, and a database browser
(~1–2 minutes). When you see `OrderFlow API listening on :4000`, it's ready.
**Leave this window open.**

## Step 5 — Check that it's working

- **http://localhost:4000/_lab/requirements** — the rules the API is *supposed*
  to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **ecommerce**.

## Step 6 — Start testing

```bash
# Sign up the same email twice — it should be blocked, but duplicates are allowed:
curl -X POST http://localhost:4000/signup -H 'content-type: application/json' \
  -d '{"email":"alice@shop.io","password":"x"}'

# Place an order for more stock than exists — it should reject (oversell bug):
curl -X POST http://localhost:4000/orders -H 'content-type: application/json' \
  -d '{"user_id":1,"items":[{"product_id":1,"quantity":9999}]}'
```

For the full set (including the queue/worker bugs), import
**`postman_collection.json`** into **Postman** or **Bruno** — every request is
labelled with the bug it reveals. Write up each finding as a bug report.

When you're ready, reveal the tagged answers:

- **http://localhost:4000/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4000 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4000:4000"` (e.g. to
  `"4010:4000"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **The worker looks idle** — that's normal until you place an order; then it
  processes the fulfillment job.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
