import type { KnownBug } from './bugTypes';
import { catalogBugs } from './bugs/catalog';
import { registrationBugs } from './bugs/registration';
import { ecommerceBugs } from './bugs/ecommerce';
import { bankBugs } from './bugs/bank';
import { healthcareBugs } from './bugs/healthcare';
import { tradingBugs } from './bugs/trading';

export type { KnownBug };

// Aggregated registry of every intentionally injected bug across all six apps.
// The Bug Reporter uses this for fuzzy-matched scoring (appId + keywords).
export const knownBugs: KnownBug[] = [
  ...catalogBugs,
  ...registrationBugs,
  ...ecommerceBugs,
  ...bankBugs,
  ...healthcareBugs,
  ...tradingBugs,
];

// Total injected bugs across the platform.
export const TOTAL_BUGS = knownBugs.length;
