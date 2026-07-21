# TestLab 101 — Web QA Training Platform

A professional sandbox for QA engineers. Explore **12 real-looking web applications**, each
containing **intentionally injected bugs** ranging from trivial (Level 1) to practically
impossible (Level 10). Every app ships with an in-app **QA Inspector** (requirements, database
viewer, live API tester, and locked solutions) and a global **Bug Reporter** for filing and
scoring your findings.

> **290+ intentionally injected bugs** across 12 apps and 10 difficulty levels.
> (Authoritative count: `TOTAL_BUGS` in `src/data/knownBugs.ts`.)

---

## What is this?

TestLab 101 simulates the kinds of defects you encounter in real-world software, organized by
testing technique and difficulty. Your job is to find the bugs by testing each app against its
documented requirements, then document them as proper bug reports (title, severity, steps to
reproduce, expected vs. actual result).

Two tools support you throughout:

- **QA Inspector** — a split-screen panel showing the spec, the underlying database, a
  functional API tester, and (instructor-gated) solutions.
- **Bug Reporter** — a floating button on every app that opens a bug-report form. Reports
  persist to `localStorage`, are fuzzy-matched against the known-bug registry, and drive a
  per-app score so you can see how many real bugs you have caught.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Scripts

```bash
npm run dev            # Start the Vite dev server (HMR)
npm run build          # TypeScript project build (tsc -b) + production Vite build
npm run preview        # Preview the production build locally
npm run lint           # ESLint static analysis

npm run test:unit      # Run Vitest unit tests once
npm run test:unit:watch# Run Vitest in watch mode
npm test               # Alias for test:unit

npm run test:e2e       # Run Playwright end-to-end tests (e2e/)
npm run test:e2e:ui    # Run Playwright in interactive UI mode
```

> **Note on unit tests:** the Vitest suite (in `src/test/`) includes *characterization tests*
> that deliberately assert known bugs **exist**. They document defects such as a Level 1
> placeholder description, the "Laptap Stand" typo, `addToCart` accepting a negative quantity
> (Level 3), and `removeFromCart` deleting by position instead of by ID (Level 7). These tests
> are expected to pass while the bugs are present — they will start failing once the bugs are
> fixed, which is the intended signal.

---

## Run locally with Docker

The platform is served two ways with **zero hosting cost**:

- **Online (reference):** the full sandbox is published on the web under `tojoin.org/Lab101`.
- **Local (practice):** download and run a self-contained Docker image so each learner has
  their own isolated instance — no backend, no account, works offline. Practising against a
  local container (`docker run` → test `localhost`) also mirrors a real QA workflow.

### Option 1 — pull the published image (no source needed)

```bash
docker run --rm -p 8080:80 ghcr.io/kevin-tojoin/web_lab:latest
```

### Option 2 — build from source

```bash
docker compose up            # builds the image and serves it
```

Then open **http://localhost:8080/**.

The image is a two-stage build (`node:22-alpine` builds the Vite app → `nginx:alpine` serves the
static output). It is built with `VITE_BASE=/` so the app lives at the container root (the online
build instead nests under `/Lab101/`). A GitHub Action (`.github/workflows/docker-publish.yml`)
publishes the image to GitHub Container Registry on every push to `main`.

---

## The Testing Environments

| App | Route | Difficulty | Bug Levels | Bug Count | Focus / Techniques |
|-----|-------|-----------|-----------|:---------:|--------------------|
| **Product Catalog** | `/catalog` | Easy | 1–10 | **30** | UI observation, broken links, disabled elements, data integrity — full multi-page flow |
| **Registration Portal** | `/registration` | Medium | 3–6 | **14** | Multi-step form, state management bugs |
| **E-commerce Store** | `/ecommerce` | Medium | 3–5 | **14** | Boundary value analysis, equivalence partitioning, stale state in cart & checkout |
| **Bank Core System** | `/bank` | Hard | 6–8 | **14** | State transitions, session management, async submission/race conditions |
| **Patient Portal** (Healthcare) | `/healthcare` | Expert | 8–9 | **14** | Decision-table logic, complex date validation, unreachable branches |
| **Trading Dashboard** | `/trading` | Impossible | 10 | **14** | Race conditions, floating-point cascades, timezone offset bugs |
| **Hotel Booking** (StayEasy) | `/hotel` | Medium | 3–6 | **14** | Date-range logic, occupancy boundaries, pricing math, overbooking, timezone |
| **Food Delivery** (QuickBite) | `/delivery` | Medium | 3–5 | **14** | Delivery zones, time windows, order minimums, promo stacking, tip math |
| **Online Exam** (CertifyHub) | `/exam` | Hard | 5–7 | **14** | Countdown timer/auto-submit, pass-cutoff boundaries, scoring, negative marking |
| **Insurance Quote** (SecureQuote) | `/insurance` | Expert | 7–9 | **14** | Multi-factor decision tables, premium multipliers, discount clamps |
| **Account Security** (VaultAuth) | `/auth` | Expert | 6–9 | **14** | Password strength, token expiry, rate-limit lockout, sessions, 2FA, user enumeration |
| **Mobile Wallet** (MobiTap) | `/mobile` | Medium | 3–5 | **14** | Mobile UX: touch targets, viewport overflow, input types, gestures, a11y, safe areas |

> The hub page (`/`) lists every app with its difficulty badge and level range. The cards above
> match the difficulty labels shown in-app. Note that the on-hub "Levels 1–2" copy for Product
> Catalog reflects its starting levels; its bug registry actually spans Levels 1–10.

Several apps have had their bug catalogues expanded well beyond the counts shown above, so the
**authoritative total is `TOTAL_BUGS`** exported from `src/data/knownBugs.ts` (aggregated from the
modular per-app files in `src/data/bugs/`). The `knownBugs` registry test derives its per-app
coverage from that registry, so it never goes stale as catalogues grow.

---

## The QA Inspector

Apps render in a split-screen `QALayout` — the application on the left (~70%) and the **QA
Inspector** panel on the right (~30%). The inspector has four tabs:

- **Reqs** — Markdown requirements and acceptance criteria for the current view, rendered by a
  lightweight built-in Markdown renderer (headings, bold, inline code, lists, code blocks).
- **DB** — A read-only table viewer that pretty-prints the underlying database tables as JSON.
  Use it to compare what the UI shows against what the data actually contains — key for data
  integrity bugs.
- **API** — A **functional** API tester. Endpoints are listed with their method and path;
  clicking **Send** executes the endpoint's real handler against the (editable) request body
  and renders a **live** response with an HTTP status line and pretty-printed JSON. Endpoints
  backed by a real handler show a green **LIVE** badge. (A few legacy catalog endpoints still
  use canned `expectedResponse` strings.)
- **Solutions** — Diff-style cards showing each bug's **buggy** vs. **fixed** code, its
  location, technique, and an explanation. This tab is **locked** behind an unlock code; enter
  `REVEAL` to reveal the solutions.

State is provided via `QAContext` (`useQAPanel`): pages call setters to feed requirements, DB
tables, API endpoints, and solutions into the inspector.

---

## The Bug Reporter

A floating **Report Bug** button appears on every app. It opens a modal form with:

- **Bug Title** (required)
- **Severity** — Critical / High / Medium / Low
- **Steps to Reproduce** (required)
- **Expected Result** (required)
- **Actual Result** (required)

On submit:

- The report is saved to `localStorage` (key `testlab101_reports`) so it survives reloads.
- The title is **fuzzy-matched** against the known-bug registry for the current app: if **2 or
  more keywords** of a known bug appear in your title, the report is linked to that bug.
- A **per-app score** (`found / total`) counts how many distinct known bugs you have matched.

A **My Reports** panel lets you review submitted reports (and clear them). Reporter state lives
in `BugReporterContext` (`useBugReporter`), provided at the app root.

---

## Architecture

- **Shared QA module** — `src/qa/` houses the reusable inspector: `QAContext` (state +
  `REVEAL` gate), `QAInspectorPanel` (the 4-tab UI + Markdown renderer + live API tester), and
  `QALayout` (the split-screen wrapper for the standalone apps).
- **Modular bug registry** — each app's known bugs live in their own file under
  `src/data/bugs/` (`catalog.ts`, `registration.ts`, `ecommerce.ts`, `bank.ts`,
  `healthcare.ts`, `trading.ts`), aggregated by `src/data/knownBugs.ts`.
- **Routing** — `react-router-dom` v7. `App.tsx` defines the hub (`/`), one route per app, and
  a `*` 404 fallback. Each app is wrapped in an `ErrorBoundary`.
- **State** — React Context API: `BugReporterProvider` wraps the whole app; `QAProvider` wraps
  each inspector-equipped app.

---

## Project Structure

```
Web_Lab/
├── README.md
├── package.json
├── e2e/                              # Playwright end-to-end tests
│   ├── catalog-flow.spec.ts
│   └── registration-flow.spec.ts
└── src/
    ├── App.tsx                       # Router + hub page + global Bug Reporter mount
    ├── index.css                     # Global styles (glassmorphism design system)
    ├── apps/
    │   ├── catalog-v02/              # Product Catalog (multi-page, Levels 1–10)
    │   ├── EcommerceApp.tsx          # E-commerce Store
    │   ├── RegistrationApp.tsx       # Registration Portal
    │   ├── BankApp.tsx               # Bank Core System
    │   ├── HealthcareApp.tsx         # Patient Portal
    │   └── TradingApp.tsx            # Trading Dashboard
    ├── qa/                           # Shared QA Inspector module
    │   ├── QAContext.tsx             # Inspector state + REVEAL unlock gate
    │   ├── QAInspectorPanel.tsx      # 4-tab UI: Reqs / DB / API / Solutions
    │   └── QALayout.tsx              # Split-screen app + inspector layout
    ├── context/
    │   └── BugReporterContext.tsx    # Reports, localStorage persistence, fuzzy scoring
    ├── components/
    │   ├── ErrorBoundary.tsx         # Per-app crash boundary
    │   └── BugReporter/              # Button, Modal, My Reports panel
    ├── data/
    │   ├── knownBugs.ts              # Aggregated registry + TOTAL_BUGS
    │   ├── bugTypes.ts               # KnownBug type
    │   └── bugs/                     # Per-app bug definitions (catalog, registration, …)
    └── test/                         # Vitest unit + characterization tests
        ├── MockAPI.test.ts
        ├── CartContext.test.tsx
        └── mockDatabase.test.ts
```

---

## Tech Stack

- **React 19** + **TypeScript** — frontend framework
- **React Router v7** — client-side routing
- **Vite** — build tool with HMR
- **Lucide React** — icon library
- **Vitest** + Testing Library — unit & characterization tests
- **Playwright** — end-to-end tests
- Vanilla CSS with custom properties (glassmorphism design)

No external APIs — everything runs locally against mock data and in-app handlers.

---

## How to use TestLab 101 as a learner

1. Open the hub and pick an environment — start with **Product Catalog** if you're new.
2. Read the **Reqs** tab in the QA Inspector to learn the acceptance criteria for each view.
3. Test the UI against those requirements. Use the **DB** tab to verify data integrity and the
   **API** tab to probe endpoints with live requests.
4. When you find a defect, click **Report Bug** and file a complete report: title, severity,
   steps to reproduce, expected vs. actual result.
5. Check your **per-app score** — the Bug Reporter fuzzy-matches your report titles against the
   known-bug registry, so descriptive titles score better.
6. Only after a genuine attempt, reveal the answers (see below) to compare your findings against
   the buggy-vs-fixed solution cards.

---

## For instructors

The **Solutions** tab in the QA Inspector is gated behind an unlock code so learners can't peek
prematurely. The code is **`REVEAL`** (case-insensitive; the in-app hint is *"a single English
word meaning to expose"*). Share it with learners only after they have attempted the exercises.
Solutions render as diff-style cards with the buggy code, the fix, the file location, the
testing technique, and an explanation for each bug.

---

## License

MIT — use freely for learning and teaching QA.
