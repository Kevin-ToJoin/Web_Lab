/**
 * knownBugs.test.ts
 *
 * Registry integrity tests for the aggregated known-bug registry.
 * Verifies counts, uniqueness, per-app distribution, and field shape.
 */

import { describe, it, expect } from 'vitest'
import { knownBugs, TOTAL_BUGS } from '../data/knownBugs'

const APP_IDS = ['catalog', 'registration', 'ecommerce', 'bank', 'healthcare', 'trading'] as const

const EXPECTED_COUNTS: Record<string, number> = {
  catalog: 30,
  registration: 14,
  ecommerce: 14,
  bank: 14,
  healthcare: 14,
  trading: 14,
}

describe('knownBugs registry — totals', () => {
  it('TOTAL_BUGS is 100', () => {
    expect(TOTAL_BUGS).toBe(100)
  })

  it('knownBugs.length is 100', () => {
    expect(knownBugs.length).toBe(100)
  })

  it('all bug ids are unique', () => {
    const ids = knownBugs.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('knownBugs registry — per-app counts', () => {
  const byApp = knownBugs.reduce<Record<string, number>>((acc, b) => {
    acc[b.appId] = (acc[b.appId] ?? 0) + 1
    return acc
  }, {})

  for (const appId of APP_IDS) {
    it(`${appId} has ${EXPECTED_COUNTS[appId]} bugs`, () => {
      expect(byApp[appId]).toBe(EXPECTED_COUNTS[appId])
    })
  }

  it('the six expected counts sum to 100', () => {
    const sum = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0)
    expect(sum).toBe(100)
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

  it('every bug appId is one of the six known ids', () => {
    for (const bug of knownBugs) {
      expect(APP_IDS).toContain(bug.appId as (typeof APP_IDS)[number])
    }
  })
})
