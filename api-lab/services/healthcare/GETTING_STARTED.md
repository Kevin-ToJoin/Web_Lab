# Getting started — Module 5: Patient Portal (backend lab)

This is a beginner-friendly, step-by-step guide to running the **Patient Portal
API lab** on your own computer. No coding experience needed. You'll install one
app, download one file, and run one command.

The lab is a small, **deliberately buggy** patient-portal API (patients,
appointments, copay estimates, vitals) with a real database. It's where the
tricky clinical-logic bugs live: past-dated bookings, double-booking, copay
decision-table boundaries, age cutoffs, PHI leaks, timezone drift.

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

Download this single file into a **new empty folder** (e.g. `healthcare-lab`):

- **`docker-compose.yml`** — from `api-lab/services/healthcare/docker-compose.yml`.
  (On the website's Patient Portal module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `Patient Portal API listening on :4004`, it's ready. **Leave this
window open.**

## Step 5 — Check that it's working

- **http://localhost:4004/_lab/requirements** — the rules the portal is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **healthcare**.

## Step 6 — Start testing

```bash
# PHI leak: any caller reads a patient's full record including SSN (HLTH-05):
curl http://localhost:4004/patients/1

# Copay decision-table boundary: Alice's deductible_met (1000) exactly equals her
# Gold deductible (1000) — she should get the LOWER copay, but gets the higher one:
curl -X POST http://localhost:4004/copay/estimate \
  -H 'content-type: application/json' -d '{"patient_id":1}'

# Book an appointment in the PAST — it should be rejected, but is accepted:
curl -X POST http://localhost:4004/appointments -H 'content-type: application/json' \
  -d '{"patient_id":1,"provider_id":1,"slot_at":"2000-01-01T09:00:00"}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4004/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4004 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4004:4004"` (e.g. to
  `"4014:4004"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake PHI. Never deploy it or point it at real data.
