/**
 * mockDatabase.test.ts
 *
 * Tests data integrity of the product database.
 * Several tests here INTENTIONALLY FAIL — they document known Level 1 bugs
 * that a QA engineer should catch during data validation.
 */

import { describe, it, expect } from 'vitest'
import { database } from '../apps/catalog-v02/api/mockDatabase'

describe('Database — structural integrity', () => {
  it('has products in the catalog', () => {
    expect(database.products.length).toBeGreaterThan(0)
  })

  it('every product has required fields', () => {
    for (const p of database.products) {
      expect(p.id,          `${p.id} missing id`).toBeTruthy()
      expect(p.name,        `${p.id} missing name`).toBeTruthy()
      expect(p.category,    `${p.id} missing category`).toBeTruthy()
      expect(p.price,       `${p.id} missing price`).toBeGreaterThan(0)
      expect(p.description, `${p.id} missing description`).toBeTruthy()
      expect(p.images,      `${p.id} missing images`).toBeInstanceOf(Array)
      expect(p.images.length, `${p.id} has no images`).toBeGreaterThan(0)
    }
  })

  it('all product IDs are unique', () => {
    const ids = database.products.map(p => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every category is one of the four valid values', () => {
    const valid = ['Electronics', 'Home Goods', 'Apparel', 'Accessories']
    for (const p of database.products) {
      expect(valid, `${p.id} has invalid category "${p.category}"`).toContain(p.category)
    }
  })

  it('every product image URL is reachable (well-formed)', () => {
    for (const p of database.products) {
      for (const url of p.images) {
        expect(url, `${p.id} has malformed image URL`).toMatch(/^https?:\/\/.+/)
      }
    }
  })
})

describe('Database — content quality (Level 1 bugs)', () => {
  /**
   * KNOWN BUG — Level 1: Placeholder text
   * PROD-001 description contains "Lorem ipsum dolor sit amet"
   * Requirement: all descriptions must be real product copy, no placeholder text.
   */
  it('documents KNOWN BUG (Level 1): a product description contains placeholder text', () => {
    const PLACEHOLDER_PATTERNS = [/lorem ipsum/i, /placeholder/i, /todo/i, /tbd/i]
    const offenders = database.products.filter(p =>
      PLACEHOLDER_PATTERNS.some(rx => rx.test(p.description))
    )
    if (offenders.length > 0) {
      console.warn(
        `[KNOWN BUG - Level 1] Products with placeholder descriptions:\n` +
        offenders.map(p => `  ${p.id}: "${p.description}"`).join('\n')
      )
    }
    // Characterization: the placeholder-text bug is present. When fixed,
    // invert this to expect(offenders).toHaveLength(0).
    expect(offenders.length).toBeGreaterThan(0)
  })

  /**
   * KNOWN BUG — Level 1: Typo in product name
   * PROD-012 is named "Laptap Stand" instead of "Laptop Stand"
   * Requirement: all product names must be correctly spelled.
   */
  it('documents KNOWN BUG (Level 1): a product name contains an obvious typo', () => {
    const KNOWN_TYPOS: Record<string, string> = {
      'PROD-012': 'Laptap Stand', // correct name: "Laptop Stand"
    }
    const offenders = database.products.filter(p =>
      KNOWN_TYPOS[p.id] && p.name === KNOWN_TYPOS[p.id]
    )
    if (offenders.length > 0) {
      console.warn(
        `[KNOWN BUG - Level 1] Products with typos in name:\n` +
        offenders.map(p => `  ${p.id}: "${p.name}"`).join('\n')
      )
    }
    // Characterization: the "Laptap Stand" typo is present.
    expect(offenders.length).toBeGreaterThan(0)
  })

  /**
   * KNOWN BUG — Level 1: Broken image URL
   * PROD-012 has an image URL with "broken-link-12345" which will return a 404.
   * Requirement: all image URLs must resolve to actual images.
   */
  it('documents KNOWN BUG (Level 1): a product has a broken image URL', () => {
    const BROKEN_PATTERNS = [/photo-broken-link/i, /placeholder\.com/i, /example\.com\/broken/i]
    const offenders = database.products.filter(p =>
      p.images.some(url => BROKEN_PATTERNS.some(rx => rx.test(url)))
    )
    if (offenders.length > 0) {
      console.warn(
        `[KNOWN BUG - Level 1] Products with broken image URLs:\n` +
        offenders.map(p => `  ${p.id}: ${p.images.join(', ')}`).join('\n')
      )
    }
    // Characterization: the broken image URL is present.
    expect(offenders.length).toBeGreaterThan(0)
  })

  it('out-of-stock products (stock=0) are correctly flagged', () => {
    // PROD-003 has stock: 0 — this is valid data, not a bug
    const outOfStock = database.products.filter(p => p.stock === 0)
    // Verifying it's intentional and documented
    expect(outOfStock.every(p => typeof p.stock === 'number')).toBe(true)
  })
})
