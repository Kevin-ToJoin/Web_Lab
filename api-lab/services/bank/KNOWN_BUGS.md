# Vault Online (Bank module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(bank API, port 4001). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| BANK-01 | Transfer isn't transactional — a crash after debit loses money | Functional | Data integrity | Error Guessing | Integration |
| BANK-02 | No overdraft check — balance can go negative | Functional | Functional correctness | Boundary Value Analysis | Integration |
| BANK-03 | Concurrent transfers race → double-spend (no row lock) | Non-functional | Reliability | Exploratory | System |
| BANK-04 | Money stored as float — cent rounding drift | Functional | Functional correctness | Boundary Value Analysis | Integration |
| BANK-05 | `Idempotency-Key` ignored — retried transfer posts twice | Functional | Reliability | State Transition | Integration |
| BANK-06 | IDOR — any account balance readable, no ownership check | Non-functional | Security | Exploratory | Integration |
| BANK-07 | Non-positive amount accepted (negative reverses direction) | Functional | Input validation | Boundary Value Analysis | Contract |
| BANK-08 | Transfer to a nonexistent account destroys funds | Functional | Data integrity | Error Guessing | Integration |
| BANK-09 | Statement closing balance doesn't reconcile with the ledger | Functional | Data integrity | Checklist / Heuristic | Integration |
| BANK-10 | Missing account returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| BANK-11 | Malformed transfer payload returns `500` instead of `400` | Functional | Reliability | Equivalence Partitioning | Contract |
| BANK-12 | `/admin/accounts` has no authorization and exposes every balance | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` (and the live `GET /_lab/bugs?key=REVEAL`). The code that
causes each is marked with a matching `BANK-…` comment.

> Note: unlike the ecommerce module, this module's `/health` is **correct** —
> not every module repeats the same lesson.
