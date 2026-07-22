# Patient Portal (Healthcare module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(healthcare API, port 4004). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| HLTH-01 | An appointment can be booked in the past | Functional | Functional correctness | Boundary Value Analysis | Contract |
| HLTH-02 | Double-booking — same provider + slot allowed twice | Functional | Data integrity | Exploratory | Integration |
| HLTH-03 | Copay deductible-met check uses `>` instead of `>=` | Functional | Functional correctness | Decision Table | Component |
| HLTH-04 | Pediatric age cutoff off-by-one (`<= 18` vs `< 18`) | Functional | Functional correctness | Boundary Value Analysis | Component |
| HLTH-05 | PHI leak / IDOR — `GET /patients/:id` returns SSN, no auth | Non-functional | Security | Exploratory | Integration |
| HLTH-06 | Vitals accepted with no physiological range validation | Functional | Input validation | Boundary Value Analysis | Contract |
| HLTH-07 | Date-range appointment query is end-exclusive (misses same day) | Functional | Functional correctness | Boundary Value Analysis | Integration |
| HLTH-08 | Missing patient returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| HLTH-09 | Malformed body returns a `500` HTML stack trace instead of `400` | Functional | Reliability | Equivalence Partitioning | Contract |
| HLTH-10 | Appointment times stored without a time zone — "today" drifts | Non-functional | Reliability | Exploratory | System |
| HLTH-11 | A completed appointment can still be cancelled (illegal transition) | Functional | Functional correctness | State Transition | Integration |
| HLTH-12 | `/admin/patients` has no authorization and dumps SSNs | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> It contains fake PHI. Never deploy it or point it at real data.
