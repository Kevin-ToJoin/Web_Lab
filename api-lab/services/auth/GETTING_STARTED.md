# Getting started — Module 11: Account Security / VaultAuth (backend lab)

This is a beginner-friendly, step-by-step guide to running the **VaultAuth
Security API lab** on your own computer. No coding experience needed. You'll
install one app, download one file, and run one command.

The lab is a small, **deliberately buggy** authentication API (signup, login,
2FA, sessions, password reset) with a real database. The bugs are the auth
classics: weak-password acceptance, no lockout, expired/again-usable tokens,
user enumeration, plaintext passwords, a leading-zero 2FA bypass, and 2FA that
isn't actually enforced.

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

Download this single file into a **new empty folder** (e.g. `auth-lab`):

- **`docker-compose.yml`** — from `api-lab/services/auth/docker-compose.yml`.
  (On the website's Account Security module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `VaultAuth Security API listening on :4010`, it's ready. **Leave
this window open.**

## Step 5 — Check that it's working

- **http://localhost:4010/_lab/requirements** — the rules the auth service is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **auth**. Seeded: alice@vault.io (MFA on, code `042519`),
  bob@vault.io. Plus an EXPIRED-TOKEN and a NOMFA-TOKEN session.

## Step 6 — Start testing

```bash
# Weak password accepted (AUTH-01):
curl -X POST http://localhost:4010/signup -H 'content-type: application/json' \
  -d '{"email":"weak@vault.io","password":"123"}'

# Expired session still works (AUTH-03):
curl http://localhost:4010/me -H 'Authorization: Bearer EXPIRED-TOKEN'

# 2FA leading-zero bypass — real code is 042519 (AUTH-06):
#   1) login as alice to get a token, then:
curl -X POST http://localhost:4010/login/verify-2fa -H 'content-type: application/json' \
  -d '{"token":"NOMFA-TOKEN","code":"42519"}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4010/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4010 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4010:4010"` (e.g. to
  `"4020:4010"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
