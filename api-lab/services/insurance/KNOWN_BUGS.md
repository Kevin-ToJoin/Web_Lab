# SecureQuote (Insurance module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(insurance API, port 4009). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| INSU-01 | Age-band boundary — 25 charged the under-25 rate (`<=` vs `<`) | Functional | Functional correctness | Boundary Value Analysis | Component |
| INSU-02 | Discounts not clamped — premium can go negative | Functional | Functional correctness | Decision Table | Component |
| INSU-03 | Risk factors are added instead of multiplied | Functional | Functional correctness | Decision Table | Component |
| INSU-04 | Premiums computed in float — price drifts | Functional | Functional correctness | Boundary Value Analysis | Integration |
| INSU-05 | Coverage amount not validated positive | Functional | Input validation | Boundary Value Analysis | Contract |
| INSU-06 | Smoker flag truthy-checked — string "false" applies surcharge | Functional | Functional correctness | Equivalence Partitioning | Component |
| INSU-07 | No-claims discount at `<= 1` claim (should be 0) | Functional | Functional correctness | Boundary Value Analysis | Component |
| INSU-08 | Missing quote returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| INSU-09 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| INSU-10 | PII leak / IDOR — `GET /quotes/:id` returns SSN & DOB | Non-functional | Security | Exploratory | Integration |
| INSU-11 | `/admin/quotes` has no authorization | Non-functional | Security | Exploratory | Integration |
| INSU-12 | High-risk-region loading only applied to Auto (wrong cell) | Functional | Functional correctness | Decision Table | Component |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake PII. Never deploy it or point it at real data.
