# OrderFlow API — known bugs (answer key)

The 19 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`.
**Try to find them first** — then use this to check your work.

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** (test-design technique that catches it) · **Level** (test level).

## HTTP / Contract

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| BUG-API-01 | Missing product returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| BUG-API-02 | Malformed order payload returns `500` instead of `400` | Functional | Reliability | Equivalence Partitioning | Contract |
| BUG-API-03 | Successful create returns `200` (not `201`), no `Location` header | Functional | Functional correctness | Checklist / Heuristic | Contract |
| BUG-API-04 | Failed login returns `200 {ok:false}` instead of `401` | Functional | Security | Decision Table | Contract |
| BUG-API-05 | Errors are `text/html` with inconsistent envelopes + stack leak | Non-functional | Usability (API) | Checklist / Heuristic | Contract |
| BUG-API-06 | List endpoint has no max page size (`?limit=1000000`) | Non-functional | Performance | Boundary Value Analysis | System |
| BUG-API-07 | `/health` returns `200` even when the database is down | Non-functional | Reliability | Error Guessing | System |
| BUG-API-08 | `Idempotency-Key` ignored — repeat POST duplicates the order | Functional | Reliability | State Transition | Integration |

## Database

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| BUG-DB-01 | `users.email` has no `UNIQUE` — duplicate signups | Functional | Data integrity | Equivalence Partitioning | Integration |
| BUG-DB-02 | `order_items.product_id` has no foreign key — orphan rows | Functional | Data integrity | Checklist / Heuristic | Integration |
| BUG-DB-03 | Order creation is not transactional — partial writes | Functional | Data integrity | Error Guessing | Integration |
| BUG-DB-04 | Product search built with string concatenation (SQL injection) | Non-functional | Security | Error Guessing | Integration |
| BUG-DB-05 | Overselling: concurrent orders drive stock negative (no row lock) | Non-functional | Reliability | Exploratory | System |
| BUG-DB-06 | Money stored as `DOUBLE PRECISION` — cent rounding drift | Functional | Functional correctness | Boundary Value Analysis | Integration |

## Queue / Async

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| BUG-Q-01 | Fulfillment consumer isn't idempotent — retries double-process | Non-functional | Reliability | Exploratory | System |
| BUG-Q-02 | Poison message stalls the queue — no dead-letter handling | Non-functional | Reliability | Error Guessing | System |

## Security

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| BUG-SEC-01 | IDOR — any order readable by id, no ownership check | Non-functional | Security | Exploratory | Integration |
| BUG-SEC-02 | `/admin/users` leaks password hashes, no authorization | Non-functional | Security | Exploratory | Integration |
| BUG-SEC-03 | Login has no rate limiting — unlimited brute force (no `429`) | Non-functional | Security | Exploratory | System |

---

Each bug's reproduction, expected-vs-actual, and one-line fix are in
`src/knownBugs.ts` (and the live `GET /_lab/bugs?key=REVEAL`). The code that
causes each one is marked with a matching `BUG-…` comment.
