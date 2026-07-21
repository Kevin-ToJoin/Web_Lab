# TechMart Catalog (Catalog module) — known bugs (answer key)

The 13 intentionally injected defects, each tagged with its ISTQB
classification. The same data is served live at `GET /_lab/bugs?key=REVEAL`
(catalog API, port 4002). **Try to find them first.**

Legend: **Type** · **Characteristic** (ISO 25010) · **Technique** · **Level**.

| ID | Bug | Type | Characteristic | Technique | Level |
|----|-----|------|----------------|-----------|-------|
| CATA-01 | "Home Goods" category filter also returns Electronics | Functional | Functional correctness | Equivalence Partitioning | Integration |
| CATA-02 | Search is case-sensitive (`LIKE` not `ILIKE`) | Functional | Functional correctness | Equivalence Partitioning | Contract |
| CATA-03 | Pagination `total` ignores the active filters | Functional | Data integrity | Checklist / Heuristic | Integration |
| CATA-04 | A page past the end returns the last page, not empty | Functional | Functional correctness | Boundary Value Analysis | Contract |
| CATA-05 | `page=0` → negative OFFSET → `500` | Non-functional | Reliability | Boundary Value Analysis | Contract |
| CATA-06 | `sort` param concatenated into `ORDER BY` (SQL injection) | Non-functional | Security | Error Guessing | Integration |
| CATA-07 | A product with no reviews returns another product's reviews | Functional | Data integrity | Error Guessing | Integration |
| CATA-08 | Average rating uses integer division (drops the decimal) | Functional | Functional correctness | Boundary Value Analysis | Integration |
| CATA-09 | POST review accepts a rating outside 1–5 | Functional | Input validation | Boundary Value Analysis | Contract |
| CATA-10 | Review comment stored & served raw (stored XSS) | Non-functional | Security | Error Guessing | Integration |
| CATA-11 | Non-numeric product id returns `500` instead of `400` | Non-functional | Reliability | Equivalence Partitioning | Contract |
| CATA-12 | Missing product silently returns product #1, not `404` | Functional | Data integrity | Error Guessing | Contract |
| CATA-13 | `expand=reviews` triggers an N+1 query storm | Non-functional | Performance | Exploratory | System |

Each bug's reproduction, expected-vs-actual, and fix are in `src/knownBugs.ts`
(and the live `GET /_lab/bugs?key=REVEAL`). The code that causes each is marked
with a matching `CATA-…` comment.

> This module is read-heavy and search/reviews-focused, so its bugs are distinct
> from the ecommerce (orders/queues) and bank (ledger) modules — even where the
> ISTQB category is the same, the concrete mechanism differs.
