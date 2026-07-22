# StayEasy (Hotel module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(hotel API, port 4006). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| HOTL-01 | Check-out on/before check-in is accepted | Functional | Functional correctness | Boundary Value Analysis | Contract |
| HOTL-02 | Overbooking — a room can be booked over an existing stay | Functional | Data integrity | Exploratory | Integration |
| HOTL-03 | Nights counted inclusively — one extra night charged | Functional | Functional correctness | Boundary Value Analysis | Component |
| HOTL-04 | Rates/totals as float — price drifts | Functional | Functional correctness | Boundary Value Analysis | Integration |
| HOTL-05 | Guests above room capacity accepted | Functional | Input validation | Boundary Value Analysis | Contract |
| HOTL-06 | Discount not clamped — total can go negative | Functional | Functional correctness | Decision Table | Component |
| HOTL-07 | Check-in dates have no time zone — arrivals drift | Non-functional | Reliability | Exploratory | System |
| HOTL-08 | Missing booking returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| HOTL-09 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| HOTL-10 | A checked-out booking can still be cancelled | Functional | Functional correctness | State Transition | Integration |
| HOTL-11 | PII leak / IDOR — `GET /bookings/:id` returns guest email | Non-functional | Security | Exploratory | Integration |
| HOTL-12 | `/admin/bookings` has no authorization | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
