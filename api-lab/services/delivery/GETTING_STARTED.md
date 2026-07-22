# Getting started — Module 8: Food Delivery / QuickBite (backend lab)

This is a beginner-friendly, step-by-step guide to running the **QuickBite
Delivery API lab** on your own computer. No coding experience needed. You'll
install one app, download one file, and run one command.

The lab is a small, **deliberately buggy** food-delivery API (restaurants,
promos, orders) with a real database. The bugs are the delivery classics:
out-of-zone deliveries, order minimums, operating hours, promo stacking, tip
math, and the free-delivery boundary.

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

Download this single file into a **new empty folder** (e.g. `delivery-lab`):

- **`docker-compose.yml`** — from `api-lab/services/delivery/docker-compose.yml`.
  (On the website's Delivery module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `QuickBite Delivery API listening on :4007`, it's ready. **Leave
this window open.**

## Step 5 — Check that it's working

- **http://localhost:4007/_lab/requirements** — the rules the delivery API is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **delivery**. Seeded: 3 restaurants, 3 promos, 1 delivered order.

## Step 6 — Start testing

```bash
# Stack THREE non-stackable promos — all discounts apply (DELV-05):
curl -X POST http://localhost:4007/orders -H 'content-type: application/json' \
  -d '{"restaurant_id":1,"user_id":9,"customer_name":"X","customer_phone":"555","customer_address":"1 St","distance_km":2,"subtotal":30,"promo_codes":["SAVE5","WELCOME","FRIENDS"],"tip_pct":15}'

# Deliver 99 km away — out of zone, should be rejected (DELV-01):
curl -X POST http://localhost:4007/orders -H 'content-type: application/json' \
  -d '{"restaurant_id":1,"user_id":9,"customer_name":"X","customer_phone":"555","customer_address":"far","distance_km":99,"subtotal":30}'

# PII leak: any caller reads a customer's phone & address (DELV-11):
curl http://localhost:4007/orders/1
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4007/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4007 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4007:4007"` (e.g. to
  `"4017:4007"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
