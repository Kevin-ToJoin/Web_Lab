# Getting started — Module 3: Registration Portal (backend lab)

This is a beginner-friendly, step-by-step guide to running the **Registration
API lab** on your own computer. No coding experience needed. You'll install one
app, download one file, and run one command.

The lab is a small, **deliberately buggy** signup / email-verification / login
API with a real database that you practice testing on — using curl, Postman, or
your browser. The bugs live in the auth logic: case-sensitive uniqueness,
plaintext passwords, guessable codes, expiry that isn't checked, user
enumeration.

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

Download this single file into a **new empty folder** (e.g. `registration-lab`):

- **`docker-compose.yml`** — from `api-lab/services/registration/docker-compose.yml`.
  (On the website's Registration module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `DevPortal Registration API listening on :4003`, it's ready.
**Leave this window open.**

## Step 5 — Check that it's working

- **http://localhost:4003/_lab/requirements** — the rules the API is *supposed*
  to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **registration**. Seeded users: `alice@dev.io` (verified) and
  `bob@dev.io` (pending, code `042519`, already expired).

## Step 6 — Start testing

```bash
# Register alice again with different casing — uniqueness should block it, but doesn't:
curl -X POST http://localhost:4003/signup -H 'content-type: application/json' \
  -d '{"email":"ALICE@dev.io","username":"a2","password":"x"}'

# Verify bob with a leading-zero variant of his code — should fail, but passes:
curl -X POST http://localhost:4003/verify -H 'content-type: application/json' \
  -d '{"email":"bob@dev.io","code":"42519"}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4003/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4003 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4003:4003"` (e.g. to
  `"4013:4003"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
