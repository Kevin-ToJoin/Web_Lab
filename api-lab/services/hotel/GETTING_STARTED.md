# Getting started — Module 7: Hotel Booking / StayEasy (backend lab)

This is a beginner-friendly, step-by-step guide to running the **StayEasy
Booking API lab** on your own computer. No coding experience needed. You'll
install one app, download one file, and run one command.

The lab is a small, **deliberately buggy** hotel-booking API (rooms, bookings,
pricing) with a real database. The bugs are the classic reservation ones:
date-order & occupancy validation, overbooking, night-count off-by-one, discount
clamping, timezone drift.

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

Download this single file into a **new empty folder** (e.g. `hotel-lab`):

- **`docker-compose.yml`** — from `api-lab/services/hotel/docker-compose.yml`.
  (On the website's Hotel module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `StayEasy Booking API listening on :4006`, it's ready. **Leave this
window open.**

## Step 5 — Check that it's working

- **http://localhost:4006/_lab/requirements** — the rules the booking API is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **hotel**. Seeded: 4 rooms and 2 bookings (room 3 has a confirmed
  future stay; room 1 has a checked-out one).

## Step 6 — Start testing

```bash
# Overbook room 3 over its confirmed dates — should 409, but succeeds (HOTL-02):
curl -X POST http://localhost:4006/bookings -H 'content-type: application/json' \
  -d '{"room_id":3,"guest_name":"X","guest_email":"x@y.io","user_id":9,"check_in":"2999-01-06T15:00:00","check_out":"2999-01-07T11:00:00","guests":2}'

# 150% discount → the total goes negative (HOTL-06):
curl -X POST http://localhost:4006/bookings -H 'content-type: application/json' \
  -d '{"room_id":1,"guest_name":"X","guest_email":"x@y.io","user_id":9,"check_in":"2999-02-01","check_out":"2999-02-03","discount":1.5}'

# PII leak: any caller reads a booking's guest email (HOTL-11):
curl http://localhost:4006/bookings/1
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4006/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4006 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4006:4006"` (e.g. to
  `"4016:4006"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
