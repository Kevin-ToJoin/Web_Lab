# Getting started — Module 9: Online Exam / CertifyHub (backend lab)

This is a beginner-friendly, step-by-step guide to running the **CertifyHub Exam
API lab** on your own computer. No coding experience needed. You'll install one
app, download one file, and run one command.

The lab is a small, **deliberately buggy** online-exam API (exams, questions,
scored attempts) with a real database. The bugs are the exam-engine classics:
pass-cutoff boundary, floored percentages, negative marking on blanks, no
time-limit or retake enforcement, an answer-key leak, and unclamped scores.

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

Download this single file into a **new empty folder** (e.g. `exam-lab`):

- **`docker-compose.yml`** — from `api-lab/services/exam/docker-compose.yml`.
  (On the website's Exam module, the **API Lab** tab downloads it in one click.)

## Step 3 — Open a terminal in that folder

- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **macOS:** open **Terminal**, type `cd ` (with a space), drag the folder in, Enter.
- **Linux:** `cd` into the folder.

## Step 4 — Run one command

```bash
docker compose up
```

First run downloads the API, a database, and a database browser (~1 minute).
When you see `CertifyHub Exam API listening on :4008`, it's ready. **Leave this
window open.**

## Step 5 — Check that it's working

- **http://localhost:4008/_lab/requirements** — the rules the exam engine is
  *supposed* to follow (JSON). If you see this, the lab is running. 🎉
- **http://localhost:8080** — **Adminer** (database browser). Log in with:
  System **PostgreSQL**, Server **db**, Username **lab**, Password **lab**,
  Database **exam**. Seeded: 1 exam (pass 60%, negative marking), 5 questions,
  1 attempt.

## Step 6 — Start testing

```bash
# Answer-key leak: the questions endpoint returns correct_index (EXAM-06):
curl http://localhost:4008/exams/1/questions

# Submit answers scoring exactly 60% — should PASS, but fails (> vs >=) (EXAM-01):
curl -X POST http://localhost:4008/exams/1/submit -H 'content-type: application/json' \
  -d '{"user_id":7,"started_at":"2026-07-22T10:00:00","answers":{"1":0,"2":2,"3":1,"4":3,"5":0}}'

# Submit way past the 30-min window — should be rejected, but is scored (EXAM-04):
curl -X POST http://localhost:4008/exams/1/submit -H 'content-type: application/json' \
  -d '{"user_id":7,"started_at":"2000-01-01T00:00:00","answers":{"1":0}}'
```

For the full set, import **`postman_collection.json`** into **Postman** or
**Bruno** — every request is labelled with the bug it reveals. Write up each
finding as a bug report: title, steps, expected vs. actual.

When you're ready, reveal the tagged answers:

- **http://localhost:4008/_lab/bugs?key=REVEAL**

## Step 7 — Stop the lab

Press **Ctrl + C**, then:

```bash
docker compose down
```

---

## Troubleshooting

- **"port is already allocated" / 4008 or 8080 in use** — edit
  `docker-compose.yml` and change the left number of `"4008:4008"` (e.g. to
  `"4018:4008"`), then use that new port.
- **"Cannot connect to the Docker daemon"** — Docker Desktop isn't running.
- **Start fresh** — `docker compose down -v` removes the database so the next
  `up` re-seeds it.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
