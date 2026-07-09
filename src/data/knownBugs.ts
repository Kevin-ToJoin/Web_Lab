import type { KnownBug } from './bugTypes';
import { catalogBugs } from './bugs/catalog';
import { registrationBugs } from './bugs/registration';
import { ecommerceBugs } from './bugs/ecommerce';
import { bankBugs } from './bugs/bank';
import { healthcareBugs } from './bugs/healthcare';
import { tradingBugs } from './bugs/trading';
import { hotelBugs } from './bugs/hotel';
import { deliveryBugs } from './bugs/delivery';
import { examBugs } from './bugs/exam';
import { insuranceBugs } from './bugs/insurance';
import { authBugs } from './bugs/auth';

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
  ...hotelBugs,
  ...deliveryBugs,
  ...examBugs,
  ...insuranceBugs,
  ...authBugs,
];

// Total injected bugs across the platform.
export const TOTAL_BUGS = knownBugs.length;
