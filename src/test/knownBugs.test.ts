/**
 * knownBugs.test.ts
 *
 * Registry integrity tests for the aggregated known-bug registry.
 * Verifies counts, uniqueness, per-app distribution, and field shape.
 */

import { describe, it, expect } from 'vitest'
import { knownBugs, TOTAL_BUGS } from '../data/knownBugs'

// Per-app counts are derived from the registry itself rather than hard-coded,
// so the suite does not break every time an app's bug catalogue grows. The
// APP_IDS list is the single place to update when a NEW app is added.
const APP_IDS = [
  'catalog', 'registration', 'ecommerce', 'bank', 'healthcare', 'trading',
  'hotel', 'delivery', 'exam', 'insurance', 'auth', 'mobile',
] as const

const byApp = knownBugs.reduce<Record<string, number>>((acc, b) => {
  acc[b.appId] = (acc[b.appId] ?? 0) + 1
  return acc
}, {})

describe('knownBugs registry — totals', () => {
  it('TOTAL_BUGS matches knownBugs.length', () => {
    expect(TOTAL_BUGS).toBe(knownBugs.length)
  })

  it('the registry is non-empty', () => {
    expect(knownBugs.length).toBeGreaterThan(0)
  })

  it('all bug ids are unique', () => {
    const ids = knownBugs.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('per-app counts sum to the total', () => {
    const sum = Object.values(byApp).reduce((a, b) => a + b, 0)
    expect(sum).toBe(knownBugs.length)
  })
})

describe('knownBugs registry — per-app coverage', () => {
  for (const appId of APP_IDS) {
    it(`${appId} has at least one bug`, () => {
      expect(byApp[appId] ?? 0).toBeGreaterThan(0)
    })
  }

  it('every registered appId is one of the known apps', () => {
    for (const appId of Object.keys(byApp)) {
      expect(APP_IDS).toContain(appId as (typeof APP_IDS)[number])
    }
  })
})

describe('knownBugs registry — field shape', () => {
  it('every bug has a non-empty id, appId, title and technique', () => {
    for (const bug of knownBugs) {
      expect(typeof bug.id).toBe('string')
      expect(bug.id.length).toBeGreaterThan(0)
      expect(typeof bug.appId).toBe('string')
      expect(bug.appId.length).toBeGreaterThan(0)
      expect(typeof bug.title).toBe('string')
      expect(bug.title.length).toBeGreaterThan(0)
      expect(typeof bug.technique).toBe('string')
      expect(bug.technique.length).toBeGreaterThan(0)
    }
  })

  it('every bug level is an integer between 1 and 10', () => {
    for (const bug of knownBugs) {
      expect(Number.isInteger(bug.level)).toBe(true)
      expect(bug.level).toBeGreaterThanOrEqual(1)
      expect(bug.level).toBeLessThanOrEqual(10)
    }
  })

  it('every bug has >= 3 lowercase non-empty string keywords', () => {
    for (const bug of knownBugs) {
      expect(Array.isArray(bug.keywords)).toBe(true)
      expect(bug.keywords.length).toBeGreaterThanOrEqual(3)
      for (const kw of bug.keywords) {
        expect(typeof kw).toBe('string')
        expect(kw.length).toBeGreaterThan(0)
        expect(kw).toBe(kw.toLowerCase())
      }
    }
  })

  it('every bug appId is one of the known ids', () => {
    for (const bug of knownBugs) {
      expect(APP_IDS).toContain(bug.appId as (typeof APP_IDS)[number])
    }
  })
})
