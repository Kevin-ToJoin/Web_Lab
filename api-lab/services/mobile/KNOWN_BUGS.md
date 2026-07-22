# MobiTap (Mobile Wallet module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(mobile wallet API, port 4011). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| WALL-01 | Payment without funds drives the balance negative | Functional | Functional correctness | Boundary Value Analysis | Integration |
| WALL-02 | Balances as float — money drifts | Functional | Functional correctness | Boundary Value Analysis | Integration |
| WALL-03 | Concurrent taps race → double-spend (no lock) | Non-functional | Reliability | Exploratory | System |
| WALL-04 | Negative payment amount credits the wallet | Functional | Input validation | Boundary Value Analysis | Contract |
| WALL-05 | Idempotency key ignored — retried tap charges twice | Functional | Reliability | State Transition | Integration |
| WALL-06 | Daily spending limit not enforced | Functional | Functional correctness | Boundary Value Analysis | Integration |
| WALL-07 | No PIN required above the contactless limit | Functional | Security | Boundary Value Analysis | Integration |
| WALL-08 | Missing transaction returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| WALL-09 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| WALL-10 | PII leak / IDOR — `GET /wallets/:id` returns the full PAN | Non-functional | Security | Exploratory | Integration |
| WALL-11 | `/admin/wallets` has no authorization and exposes PANs | Non-functional | Security | Exploratory | Integration |
| WALL-12 | A payment can be reversed twice (double refund) | Functional | Functional correctness | State Transition | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake card numbers. Never deploy it or point it at real data.
