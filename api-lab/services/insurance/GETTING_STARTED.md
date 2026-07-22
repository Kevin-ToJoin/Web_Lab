# Getting started — Module 10: Insurance Quote / SecureQuote (backend lab)

This is a beginner-friendly, step-by-step guide to running the **SecureQuote
Insurance API lab** on your own computer. No coding experience needed. You'll
install one app, download one file, and run one command.

The lab is a small, **deliberately buggy** insurance-rating API (products, promos,
quotes) with a real database. The bugs are the rating-engine classics:
multi-factor decision tables, age-band boundaries, multipliers that should
multiply, discount clamps, and PII handling.

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

Download this single file into a **new empty folder** (e.g. `insurance-lab`):

- **`docker-compose.yml`** — from `api-lab/services/insurance/docker-compose.yml`.
  (On the website's Insurance module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `SecureQuote Insurance API listening on :4009`, it's ready. **Leave
this window open.**

## Step 5 — Check that it's working

- **http://localhost:4009/_lab/requirements** — the rules the rating engine is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **insurance**. Seeded: 3 products, 3 promos, 1 quote.

## Step 6 — Start testing

```bash
# Age-band boundary: a 25-year-old should NOT get the young-driver loading (INSU-01):
curl -X POST http://localhost:4009/quotes -H 'content-type: application/json' \
  -d '{"product_id":1,"user_id":7,"applicant_name":"X","dob":"2001-01-01","ssn":"000","coverage_amount":20000,"age":25,"smoker":false,"region":"standard","prior_claims":0}'

# Smoker flag as the STRING "false" wrongly applies the surcharge (INSU-06):
curl -X POST http://localhost:4009/quotes -H 'content-type: application/json' \
  -d '{"product_id":1,"user_id":7,"applicant_name":"X","dob":"1990-01-01","ssn":"000","coverage_amount":20000,"age":40,"smoker":"false"}'

# Stack big promos → premium goes negative (INSU-02):
curl -X POST http://localhost:4009/quotes -H 'content-type: application/json' \
  -d '{"product_id":1,"user_id":7,"applicant_name":"X","dob":"1990-01-01","ssn":"000","coverage_amount":20000,"age":40,"promo_codes":["WELCOME20","BUNDLE15","LOYAL10"]}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4009/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4009 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4009:4009"` (e.g. to
  `"4019:4009"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake PII. Never deploy it or point it at real data.
