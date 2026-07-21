# DevPortal Registration (Registration module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(registration API, port 4003). **Try to find them first.**

Legend: **Type** · **Characteristic** (ISO 25010) · **Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| REGA-01 | Email uniqueness is case-sensitive (Alice@ and alice@ both register) | Functional | Data integrity | Equivalence Partitioning | Integration |
| REGA-02 | Passwords stored in plaintext (never hashed) | Non-functional | Security | Checklist / Heuristic | Integration |
| REGA-03 | No server-side password-strength check | Functional | Input validation | Equivalence Partitioning | Contract |
| REGA-04 | Verification code is low-entropy / predictable | Non-functional | Security | Exploratory | Integration |
| REGA-05 | Code compared numerically → leading zeros ignored | Functional | Functional correctness | Equivalence Partitioning | Contract |
| REGA-06 | Expired verification codes still accepted | Functional | Functional correctness | Boundary Value Analysis | Integration |
| REGA-07 | Verification has no attempt limit (brute-forceable) | Non-functional | Security | Exploratory | System |
| REGA-08 | User enumeration — login reveals whether an email exists | Non-functional | Security | Exploratory | Contract |
| REGA-09 | Age accepts under-18 / negative / absurd values | Functional | Input validation | Boundary Value Analysis | Contract |
| REGA-10 | Verification code is reusable (never marked/checked used) | Non-functional | Security | State Transition | Integration |
| REGA-11 | Re-verifying an already-verified account succeeds again | Functional | Functional correctness | State Transition | Contract |
| REGA-12 | Signup response echoes the password + internal fields | Non-functional | Security | Checklist / Heuristic | Contract |

Each bug's reproduction, expected-vs-actual, and fix are in `src/knownBugs.ts`
(and the live `GET /_lab/bugs?key=REVEAL`). The code that causes each is marked
with a matching `REGA-…` comment.

> This is an auth domain, so the deck leans on **security** — a characteristic
> the frontend can't teach authentically. Its concrete mechanisms (case-sensitive
> uniqueness, plaintext storage, code entropy/expiry/replay, enumeration) are
> distinct from the other modules'.
