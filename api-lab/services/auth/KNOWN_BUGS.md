# VaultAuth (Auth module) — known bugs (answer key)

The 12 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(auth API, port 4010). **Try to find them first.**

Legend: **Type** (Functional / Non-functional) · **Characteristic** (ISO 25010) ·
**Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| AUTH-01 | No password-strength check on signup | Functional | Security | Boundary Value Analysis | Contract |
| AUTH-02 | No account lockout — logins brute-forceable | Non-functional | Security | Boundary Value Analysis | Integration |
| AUTH-03 | An expired session token is accepted | Functional | Security | State Transition | Integration |
| AUTH-04 | User enumeration — 404 (unknown) vs 401 (wrong pw) | Non-functional | Security | Equivalence Partitioning | Integration |
| AUTH-05 | Passwords stored in plaintext (and echoed by admin) | Non-functional | Security | Checklist / Heuristic | Integration |
| AUTH-06 | 2FA code compared numerically — leading-zero bypass | Functional | Security | Boundary Value Analysis | Component |
| AUTH-07 | Logout does not invalidate the session token | Functional | Security | State Transition | Integration |
| AUTH-08 | A password-reset code is reusable | Functional | Security | State Transition | Integration |
| AUTH-09 | Missing session returns `200` + `null` instead of `404` | Functional | Functional correctness | Error Guessing | Contract |
| AUTH-10 | Malformed body returns a `500` HTML stack trace | Functional | Reliability | Equivalence Partitioning | Contract |
| AUTH-11 | `/admin/users` has no authorization and leaks plaintext passwords | Non-functional | Security | Exploratory | Integration |
| AUTH-12 | 2FA is not enforced — an unverified session reaches protected data | Functional | Security | Decision Table | Integration |

Each bug's reproduction, expected-vs-actual, and fix are in
`src/knownBugs.ts` and served at `GET /_lab/bugs?key=REVEAL`.

> ⚠️ This API is intentionally insecure and incorrect — it's for practice only.
> Never deploy it or point it at real data.
