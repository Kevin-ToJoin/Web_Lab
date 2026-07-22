# QuickBite (Delivery module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(delivery API, port 4007). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| DELV-01 | Delivery beyond the zone (max distance) accepted | Functional | Functional correctness | Boundary Value Analysis | Contract |
| DELV-02 | Order below the minimum accepted | Functional | Input validation | Boundary Value Analysis | Contract |
| DELV-03 | Orders outside operating hours accepted | Functional | Functional correctness | Boundary Value Analysis | Contract |
| DELV-04 | Money summed as float — total/tip drift | Functional | Functional correctness | Boundary Value Analysis | Integration |
| DELV-05 | Non-stackable promos stack (flag ignored) | Functional | Functional correctness | Decision Table | Integration |
| DELV-06 | Tip on wrong base + negative tip accepted | Functional | Functional correctness | Boundary Value Analysis | Component |
| DELV-07 | Free-delivery threshold uses `>` instead of `>=` | Functional | Functional correctness | Boundary Value Analysis | Component |
| DELV-08 | Missing order returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| DELV-09 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| DELV-10 | A delivered order can still be cancelled | Functional | Functional correctness | State Transition | Integration |
| DELV-11 | PII leak / IDOR — `GET /orders/:id` returns phone & address | Non-functional | Security | Exploratory | Integration |
| DELV-12 | `/admin/orders` has no authorization | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
