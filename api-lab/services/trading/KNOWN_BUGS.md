# Trading Desk (Trading module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(trading API, port 4005). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| TRAD-01 | Buy doesn't check buying power — cash goes negative | Functional | Functional correctness | Boundary Value Analysis | Integration |
| TRAD-02 | Concurrent buys race → cash double-spent (no lock) | Non-functional | Reliability | Exploratory | System |
| TRAD-03 | Cash/prices as float — P&L and balances drift | Functional | Functional correctness | Boundary Value Analysis | Integration |
| TRAD-04 | Sell more than held — position goes negative | Functional | Functional correctness | Boundary Value Analysis | Integration |
| TRAD-05 | Quantity not validated positive (negative flips side) | Functional | Input validation | Boundary Value Analysis | Contract |
| TRAD-06 | Market order fills at a client-supplied price | Functional | Functional correctness | Error Guessing | Integration |
| TRAD-07 | Cost basis uses last fill, not weighted average | Functional | Functional correctness | Checklist / Heuristic | Integration |
| TRAD-08 | Duplicate `client_order_id` creates a second order | Functional | Reliability | State Transition | Integration |
| TRAD-09 | Order times have no time zone — trading day drifts | Non-functional | Reliability | Exploratory | System |
| TRAD-10 | Missing order returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| TRAD-11 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| TRAD-12 | `/admin/orders` has no authorization | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
