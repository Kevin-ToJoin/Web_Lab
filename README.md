# TestLab 101 — Web QA Training Platform

A professional sandbox for QA engineers. Explore 5 real-looking web applications, each containing intentionally injected bugs ranging from trivial (Level 1) to practically impossible (Level 10).

---

## What is this?

TestLab 101 simulates the kinds of bugs you'll encounter in real-world software, organized by testing technique and difficulty. Each app comes with a built-in **QA Inspector panel** — a split-screen IDE-like tool showing:

- **Requirements** — the acceptance criteria to test against
- **DB Viewer** — the underlying database state so you can verify data integrity
- **API Endpoints** — live testable mock API calls

Your job: find the bugs, document them as proper bug reports (title, steps to reproduce, expected vs. actual result, severity).

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Other commands

```bash
npm run build    # TypeScript check + production build
npm run lint     # ESLint static analysis
npm run preview  # Preview the production build locally
```

---

## The 5 Testing Environments

| App | Theme | Difficulty | Bug Levels | Testing Techniques |
|-----|-------|-----------|-----------|-------------------|
| **Product Catalog** | Online store catalog with QA Inspector | Easy | 1–2 | UI observation, broken links, disabled elements |
| **E-commerce Store** | Coffee shop cart & checkout | Medium | 3–5 | Boundary value analysis, equivalence partitioning, state bugs |
| **Bank Core System** | Banking transfers & transactions | Hard | 6–8 | State transitions, session management, async race conditions |
| **Patient Portal** | Medical copay & appointment booking | Expert | 8–9 | Decision tables, date validation, unreachable branches |
| **Trading Dashboard** | Live stock trading platform | Impossible | 10 | Race conditions, floating-point precision, timezone bugs |

---

## Bug Levels Explained

| Level | Description | Example |
|-------|-------------|---------|
| 1 | **Visual / Copy** | Placeholder text left in production |
| 2 | **Broken UI** | Button navigates to wrong page, element incorrectly disabled |
| 3 | **Boundary Value** | No validation on quantity field (accepts -1), off-by-one pagination |
| 4 | **Equivalence** | Free shipping kicks in at $101 instead of $100, wrong category filter |
| 5 | **Stale State** | Cart item count doesn't update after removing an item |
| 6 | **Error Handling** | Silent failure on API error, infinite loading state |
| 7 | **Data Integrity** | Product shows reviews from a different product ID |
| 8 | **Complex Logic** | Decision table uses `OR` where `AND` is required, regex flaw |
| 9 | **Validation Edge Cases** | Past dates accepted, leap year throws error, weekends not blocked |
| 10 | **Concurrency / Precision** | Race condition allows double-spend, floating-point drift, timezone sort |

---

## How to Use the QA Inspector Panel (Product Catalog only)

The Product Catalog app has a split-screen layout:

- **Left (70%)** — The application you're testing
- **Right (30%)** — The QA Inspector with 4 tabs:
  - `Requirements` — Markdown spec with acceptance criteria and bug hints
  - `DB Viewer` — JSON snapshot of the relevant database tables
  - `API` — Endpoint list with a live "Send" button to test responses
  - `Response` — Output of your last API call

Use the DB Viewer to compare what the UI shows vs. what the database actually contains — this is key for data integrity bugs.

---

## Project Structure

```
src/
├── App.tsx                        # Main router + hub page
├── index.css                      # Global styles (glassmorphism design system)
├── components/
│   └── ErrorBoundary.tsx          # Crash boundary for each app
└── apps/
    ├── catalog-v02/               # Product Catalog (Levels 1–2) with QA Inspector
    │   ├── api/                   # MockAPI + mock database
    │   ├── context/               # Cart, BugTracker, QAPanel state
    │   ├── components/            # Layout + QA Inspector Panel
    │   └── pages/                 # 10 pages: home → order confirmation
    ├── EcommerceApp.tsx            # E-commerce Store (Levels 3–5)
    ├── BankApp.tsx                 # Bank Core System (Levels 6–8)
    ├── HealthcareApp.tsx           # Patient Portal (Levels 8–9)
    └── TradingApp.tsx              # Trading Dashboard (Level 10)
```

---

## Tech Stack

- **React 19** + **TypeScript** — frontend framework
- **React Router v7** — client-side routing
- **Vite** — build tool with HMR
- **Lucide React** — icon library
- Vanilla CSS with CSS custom properties (glassmorphism design)

No external APIs. Everything runs locally with mock data.

---

## Tips for Bug Reporting

A good bug report includes:

1. **Title** — Short, descriptive (e.g., "Back button on Product Detail navigates to non-existent URL")
2. **Steps to Reproduce** — Numbered, specific
3. **Expected Result** — What should happen per the requirements
4. **Actual Result** — What actually happens
5. **Severity** — Critical / High / Medium / Low
6. **Evidence** — Screenshot, network response, or DB viewer output

---

## License

MIT — use freely for learning and teaching QA.
