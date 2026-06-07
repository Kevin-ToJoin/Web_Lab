/**
 * MockAPI.test.ts
 *
 * Tests the MockAPI layer against its documented requirements.
 * Bugs marked [KNOWN BUG - Level X] are intentionally injected.
 * These tests will FAIL until the bugs are fixed — that's the point.
 */

import { describe, it, expect } from 'vitest'
import { MockAPI } from '../apps/catalog-v02/api/MockAPI'
import { database } from '../apps/catalog-v02/api/mockDatabase'

describe('MockAPI.getProducts — happy path', () => {
  it('returns all products when called with no arguments', async () => {
    const result = await MockAPI.getProducts()
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBe(database.products.length)
  })

  it('filters products by search term (case-insensitive)', async () => {
    const result = await MockAPI.getProducts('keyboard')
    expect(result.every(p => p.name.toLowerCase().includes('keyboard'))).toBe(true)
  })

  it('returns empty array when no products match the search', async () => {
    const result = await MockAPI.getProducts('xyznotarealproduct')
    expect(result).toHaveLength(0)
  })

  it('returns correct product count for Electronics', async () => {
    const dbCount = database.products.filter(p => p.category === 'Electronics').length
    const apiResult = await MockAPI.getProducts('', 'Electronics')
    // Electronics has a 1500ms delay — this test will be slow but accurate
    expect(apiResult.length).toBe(dbCount)
  }, 10_000) // 10s timeout to account for simulated latency
})

describe('MockAPI.getProducts — error handling', () => {
  it('throws a 500 error when searching for "error"', async () => {
    await expect(MockAPI.getProducts('error')).rejects.toThrow('500 Internal Server Error')
  })
})

describe('MockAPI.getProducts — Level 4 bug: Equivalence Partitioning', () => {
  /**
   * KNOWN BUG — Level 4: Category filter includes wrong products
   * Requirement: getProducts('', 'Home Goods') must return ONLY Home Goods products.
   * Actual:      Electronics products are included because of a flawed conditional.
   */
  it('Home Goods filter returns ONLY Home Goods products', async () => {
    const result = await MockAPI.getProducts('', 'Home Goods')
    const wrongCategory = result.filter(p => p.category !== 'Home Goods')

    if (wrongCategory.length > 0) {
      console.warn(
        `[KNOWN BUG - Level 4] Home Goods filter returned ${wrongCategory.length} non-Home-Goods product(s):\n` +
        wrongCategory.map(p => `  ${p.id} "${p.name}" (category: ${p.category})`).join('\n')
      )
    }

    expect(wrongCategory).toHaveLength(0)
  })

  it('Apparel filter returns ONLY Apparel products', async () => {
    const result = await MockAPI.getProducts('', 'Apparel')
    expect(result.every(p => p.category === 'Apparel')).toBe(true)
  })

  it('Accessories filter returns ONLY Accessories products', async () => {
    const result = await MockAPI.getProducts('', 'Accessories')
    expect(result.every(p => p.category === 'Accessories')).toBe(true)
  })
})

describe('MockAPI.getProductById — happy path', () => {
  it('returns the correct product by ID', async () => {
    const product = await MockAPI.getProductById('PROD-001')
    expect(product.id).toBe('PROD-001')
    expect(product.name).toBe('Ultra HD 4K Smart TV')
  })

  it('throws 404 for a non-existent product ID', async () => {
    await expect(MockAPI.getProductById('PROD-999')).rejects.toThrow('404 Not Found')
  })
})

describe('MockAPI.getProductById — Level 7 bug: Data Integrity', () => {
  /**
   * KNOWN BUG — Level 7: PROD-002 returns PROD-001's reviews
   * Requirement: getProductById('PROD-002') must return reviews belonging to PROD-002.
   * Actual:      Reviews from PROD-001 are substituted into the response.
   */
  it('PROD-002 reviews belong to PROD-002, not another product', async () => {
    const prod002 = await MockAPI.getProductById('PROD-002')
    const dbProd001 = database.products.find(p => p.id === 'PROD-001')!

    const reviewsAreFromProd001 = prod002.reviews.some(r =>
      dbProd001.reviews.some(r1 => r1.id === r.id)
    )

    if (reviewsAreFromProd001) {
      console.warn(
        `[KNOWN BUG - Level 7] PROD-002 is returning reviews from PROD-001.\n` +
        `  Returned review IDs: ${prod002.reviews.map(r => r.id).join(', ')}\n` +
        `  PROD-001 review IDs: ${dbProd001.reviews.map(r => r.id).join(', ')}`
      )
    }

    expect(reviewsAreFromProd001).toBe(false)
  })

  it('other products return their own reviews without cross-contamination', async () => {
    const prod003 = await MockAPI.getProductById('PROD-003')
    const dbProd003 = database.products.find(p => p.id === 'PROD-003')!
    // PROD-003 should have exactly its own reviews
    expect(prod003.reviews).toEqual(dbProd003.reviews)
  })
})
