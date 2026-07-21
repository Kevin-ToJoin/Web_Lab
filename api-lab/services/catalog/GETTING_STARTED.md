# Getting started — Module 1: Product Catalog (backend lab)

This is a beginner-friendly, step-by-step guide to running the **Catalog API
lab** on your own computer. No coding experience needed. You'll install one app,
download one file, and run one command.

The lab is a small, **deliberately buggy** product-catalog API (with a real
database) that you practice testing on — using curl, Postman, or your browser.

---

## What you need

- A Windows, macOS, or Linux computer.
- **Docker Desktop** — free software that runs the lab in a sandbox. That's the
  only thing to install.

---

## Step 1 — Install Docker Desktop (one time)

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Download the version for your operating system and install it (click through
   the installer with the default options).
3. Open **Docker Desktop**. Wait until the whale icon (top bar / system tray)
   stops animating and says **"Docker Desktop is running."**

> You only ever do this once.

## Step 2 — Download the lab file

Download this single file and put it in a **new empty folder** (for example, a
folder on your Desktop called `catalog-lab`):

- **`docker-compose.yml`** — from
  `api-lab/services/catalog/docker-compose.yml` in the project. (On GitHub: open
  the file, click **Raw**, then Save As. No Git needed.)

That one file describes the whole environment.

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder in File Explorer, click the address bar, type
  `cmd`, and press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder onto
  the window, and press Enter.
- **Linux:** open your terminal and `cd` into the folder.

## Step 4 — Run one command

Type this and press Enter:

```bash
docker compose up
```

The first time, Docker **downloads** the pieces (the API, a database, and a
database browser) and starts them together. Give it about a minute. When you see
a line like `TechMart Catalog API listening on :4002`, it's ready. **Leave this
window open** while you use the lab.

## Step 5 — Check that it's working

Open your web browser and visit:

- **http://localhost:4002/_lab/requirements** — the rules the catalog is
  *supposed* to follow (shown as JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer**, a visual database browser. Log in
  with: System **PostgreSQL**, Server **db**, Username **lab**, Password
  **lab**, Database **catalog**.

## Step 6 — Start testing

Try to make the API misbehave. A few quick ones you can paste into your browser
or a terminal:

```bash
# Search is case-sensitive — this returns nothing (it shouldn't):
curl "http://localhost:4002/products?search=headphones"

# A product that doesn't exist — it wrongly returns product #1 instead of 404:
curl "http://localhost:4002/products/9999"
```

For the full set, import **`postman_collection.json`** (in the same folder as
this guide) into **Postman** or **Bruno** — every request is labelled with the
bug it reveals. Write up each finding as a bug report: title, steps, what you
expected, what actually happened.

When you're ready to check your work, reveal the tagged answers:

- **http://localhost:4002/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

In the terminal window, press **Ctrl + C**. Then, to clean everything up:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4002 or 8080 in use** — something else is
  using that port. Stop it, or edit `docker-compose.yml` and change the left
  number of `"4002:4002"` (e.g. to `"4012:4002"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
  Open it and wait for "running", then try again.
- **It's slow the first time** — that's the one-time download. Later starts are
  fast.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it from scratch.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
