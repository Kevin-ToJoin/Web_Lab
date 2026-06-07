/**
 * CartContext.test.tsx
 *
 * Unit tests for the CartProvider context.
 * The CartContext has 7 intentional bugs across levels 3–10.
 *
 * Test structure:
 *   ✅ Passing tests  → verify correct behavior exists
 *   ❌ Failing tests  → document known bugs (will fail until fixed)
 *
 * Each failing test is clearly labeled with its bug level so students
 * can trace the test back to the source code defect.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { type ReactNode } from 'react'
import { CartProvider, useCart } from '../apps/catalog-v02/context/CartContext'
import { type Product } from '../apps/catalog-v02/api/mockDatabase'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'PROD-TEST',
  name: 'Test Widget',
  category: 'Electronics',
  price: 10.00,
  stock: 100,
  description: 'A test product',
  images: ['https://example.com/img.jpg'],
  reviews: [],
  tags: [],
  ...overrides,
})

const PROD_001 = makeProduct({ id: 'PROD-001', name: 'Ultra HD 4K Smart TV', price: 599.99 })
const PROD_002 = makeProduct({ id: 'PROD-002', name: 'Headphones', price: 249.50 })
const PROD_003 = makeProduct({ id: 'PROD-003', name: 'Office Chair', price: 199.00 })

const wrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const useCartSetup = () => renderHook(() => useCart(), { wrapper })

// ─── Initial state ────────────────────────────────────────────────────────────

describe('CartContext — initial state', () => {
  it('cart starts empty', () => {
    const { result } = useCartSetup()
    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalItems).toBe(0)
    expect(result.current.subtotal).toBe(0)
    expect(result.current.total).toBe(0)
  })
})

// ─── addToCart ────────────────────────────────────────────────────────────────

describe('CartContext — addToCart', () => {
  it('adds a new product to the cart', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 1) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('PROD-002')
  })

  it('increments quantity when the same product is added again', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 1) })
    act(() => { result.current.addToCart(PROD_002, 2) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(3)
  })

  it('updates totalItems correctly after adding', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 3) })
    expect(result.current.totalItems).toBe(3)
  })

  /**
   * KNOWN BUG — Level 3: Boundary Value Analysis
   * Requirement: quantity must be ≥ 1. Negative quantities must be rejected.
   * Actual:      addToCart(-1) is accepted and subtracts from the total.
   */
  it('rejects quantity of 0 or less', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, -1) })

    const hasNegativeQty = result.current.items.some(i => i.quantity <= 0)
    if (hasNegativeQty) {
      console.warn('[KNOWN BUG - Level 3] addToCart accepted a negative quantity (-1). Items:', result.current.items)
    }

    // Requirement: cart must remain empty (invalid qty rejected)
    expect(result.current.items).toHaveLength(0)
  })
})

// ─── removeFromCart ───────────────────────────────────────────────────────────

describe('CartContext — removeFromCart', () => {
  it('removes the correct product when given its ID', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 1) })
    act(() => { result.current.addToCart(PROD_003, 1) })
    act(() => { result.current.removeFromCart('PROD-002') })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('PROD-003')
  })

  /**
   * KNOWN BUG — Level 7: Data Integrity
   * Requirement: removeFromCart('PROD-001') must remove the item with id 'PROD-001'.
   * Actual:      It calls array.shift(), removing the FIRST item regardless of ID.
   *              If PROD-001 is not first, a different product is deleted.
   */
  it('removes PROD-001 specifically, not the first item in the array', () => {
    const { result } = useCartSetup()
    // Add PROD-002 first, then PROD-001 — PROD-001 is now at index 1
    act(() => { result.current.addToCart(PROD_002, 1) })
    act(() => { result.current.addToCart(PROD_001, 1) })
    act(() => { result.current.removeFromCart('PROD-001') })

    const remaining = result.current.items
    const prod002StillHere = remaining.some(i => i.id === 'PROD-002')
    const prod001Gone      = !remaining.some(i => i.id === 'PROD-001')

    if (!prod002StillHere) {
      console.warn('[KNOWN BUG - Level 7] removeFromCart("PROD-001") removed PROD-002 (the first item) instead.')
    }

    expect(prod001Gone).toBe(true)      // PROD-001 should be gone
    expect(prod002StillHere).toBe(true) // PROD-002 must survive
  })

  /**
   * KNOWN BUG — Level 5: Stale State
   * Requirement: totalItems must decrease after removeFromCart.
   * Actual:      removeFromCart does NOT update totalItems — the counter goes stale.
   */
  it('updates totalItems after removing a product', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 2) })
    expect(result.current.totalItems).toBe(2)

    act(() => { result.current.removeFromCart('PROD-002') })

    if (result.current.totalItems !== 0) {
      console.warn(`[KNOWN BUG - Level 5] totalItems is ${result.current.totalItems} after removing all items (expected 0).`)
    }

    expect(result.current.totalItems).toBe(0)
  })
})

// ─── updateQuantity ───────────────────────────────────────────────────────────

describe('CartContext — updateQuantity', () => {
  it('updates the quantity of a specific item', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(PROD_002, 1) })
    act(() => { result.current.updateQuantity('PROD-002', 5) })
    expect(result.current.items[0].quantity).toBe(5)
  })
})

// ─── applyPromo ───────────────────────────────────────────────────────────────

describe('CartContext — applyPromo', () => {
  beforeEach(() => {
    // Mock localStorage for each test
    localStorage.clear()
  })

  it('applies 20% discount for valid code SAVE20', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })
    act(() => { result.current.applyPromo('SAVE20') })
    expect(result.current.discount).toBeCloseTo(20, 1)
  })

  it('applies 10% discount for valid code FALL10', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })
    act(() => { result.current.applyPromo('FALL10') })
    expect(result.current.discount).toBeCloseTo(10, 1)
  })

  /**
   * KNOWN BUG — Level 8: Regex / Decision Table
   * Requirement: only 'SAVE20' and 'FALL10' are valid promo codes.
   * Actual:      The regex /.*20$/ accepts ANY string ending in "20"
   *              (e.g., "HACK20", "INVALID20", "00000020").
   */
  it('rejects invalid promo codes that happen to end in "20"', () => {
    const INVALID_CODES = ['HACK20', 'INVALID20', 'AAA20', '00020', 'NOTACODE20']
    for (const code of INVALID_CODES) {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })
      act(() => { result.current.applyPromo(code) })

      if (result.current.discount > 0) {
        console.warn(`[KNOWN BUG - Level 8] Fake promo code "${code}" was accepted (regex flaw). Discount: ${result.current.discount}`)
      }

      expect(result.current.discount).toBe(0)
    }
  })

  /**
   * KNOWN BUG — Level 9: Security — localStorage bypass
   * Requirement: discount logic must use server-validated promo codes only.
   * Actual:      Setting localStorage.isAdmin='true' gives 100% discount.
   */
  it('does not grant 100% discount when localStorage.isAdmin is manually set', () => {
    localStorage.setItem('isAdmin', 'true')
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })

    if (result.current.discount >= result.current.subtotal) {
      console.warn(`[KNOWN BUG - Level 9] localStorage.setItem('isAdmin','true') granted 100% discount. Discount: ${result.current.discount}, Subtotal: ${result.current.subtotal}`)
    }

    expect(result.current.discount).toBeLessThan(result.current.subtotal)
  })
})

// ─── Tax calculation ──────────────────────────────────────────────────────────

describe('CartContext — tax calculation', () => {
  beforeEach(() => { localStorage.clear() })

  /**
   * KNOWN BUG — Level 8: Complex Logic
   * Requirement: Tax (8%) must be calculated on subtotal AFTER discount.
   *              Formula: Tax = (Subtotal - Discount) × 0.08
   * Actual:      Tax is calculated on raw subtotal before discount is applied.
   *              Formula: Tax = Subtotal × 0.08  ← wrong when promo active
   */
  it('calculates tax on the post-discount amount when a promo is applied', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })
    act(() => { result.current.applyPromo('SAVE20') }) // 20% off → subtotal 100, discount 20

    // Expected: Tax = (100 - 20) × 0.08 = 6.40
    // Buggy:    Tax = 100 × 0.08         = 8.00

    const expectedTax = (100 - 20) * 0.08

    if (Math.abs(result.current.tax - expectedTax) > 0.01) {
      console.warn(`[KNOWN BUG - Level 8] Tax is calculated before discount. Got ${result.current.tax.toFixed(2)}, expected ${expectedTax.toFixed(2)}`)
    }

    expect(result.current.tax).toBeCloseTo(expectedTax, 1)
  })

  it('calculates tax correctly without any promo (no bug here)', () => {
    const { result } = useCartSetup()
    act(() => { result.current.addToCart(makeProduct({ price: 100 }), 1) })
    // No promo → subtotal = 100, tax = 100 × 0.08 = 8.00 (correct in this case)
    expect(result.current.tax).toBeCloseTo(8.0, 1)
  })
})

// ─── Float precision ──────────────────────────────────────────────────────────

describe('CartContext — Level 10: floating-point precision', () => {
  /**
   * KNOWN BUG — Level 10: Floating-Point Drift
   * Requirement: total must be a clean 2-decimal value for payment processing.
   * Actual:      Repeated floating-point additions cause sub-cent drift
   *              (e.g., 249.50 × 3 + 8% tax = 808.38000000000001).
   */
  it('total has at most 2 decimal places for payment processing', () => {
    const { result } = useCartSetup()
    // $249.50 is a known trigger for float issues
    act(() => { result.current.addToCart(PROD_002, 3) }) // 249.50 × 3 = 748.50
    // + 8% tax = 808.38 (but floating point may produce 808.3800000000001)

    const total = result.current.total
    const centExact = (total * 100) % 1

    if (centExact !== 0) {
      console.warn(`[KNOWN BUG - Level 10] Total has floating-point drift: ${total} (extra: ${centExact})`)
    }

    // Requirement: (total × 100) must be an integer
    expect(centExact).toBe(0)
  })
})
