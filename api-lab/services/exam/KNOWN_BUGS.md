# CertifyHub (Exam module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(exam API, port 4008). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| EXAM-01 | Pass cutoff uses `>` instead of `>=` | Functional | Functional correctness | Boundary Value Analysis | Component |
| EXAM-02 | Percentage is floored — borderline results pushed down | Functional | Functional correctness | Boundary Value Analysis | Component |
| EXAM-03 | Negative marking penalizes blank (unanswered) questions | Functional | Functional correctness | Decision Table | Component |
| EXAM-04 | Submission after the time limit is accepted | Functional | Functional correctness | State Transition | Integration |
| EXAM-05 | The retake limit (max_attempts) is not enforced | Functional | Functional correctness | Boundary Value Analysis | Integration |
| EXAM-06 | The questions endpoint leaks the correct answers | Non-functional | Security | Exploratory | Integration |
| EXAM-07 | An answer index outside the option range is accepted | Functional | Input validation | Boundary Value Analysis | Contract |
| EXAM-08 | Missing attempt returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| EXAM-09 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| EXAM-10 | Duplicate submission records a second attempt | Functional | Reliability | State Transition | Integration |
| EXAM-11 | The score is not clamped — it can go negative | Functional | Functional correctness | Boundary Value Analysis | Component |
| EXAM-12 | `/admin/results` has no authorization | Non-functional | Security | Exploratory | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
