/**
 * catalog-flow.spec.ts — End-to-End tests for TestLab 101
 *
 * These tests simulate a real QA engineer's manual test session,
 * automated with Playwright. They cover:
 *   - Happy path navigation through the Product Catalog
 *   - Known bugs (tests document what a proper regression suite looks like)
 *
 * Setup: npx playwright install chromium
 * Run:   npx playwright test
 */

import { test, expect } from '@playwright/test'

// ─── Hub ──────────────────────────────────────────────────────────────────────

test.describe('Main Hub', () => {
  test('loads and shows the 5 app cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
    await expect(page.getByText('Product Catalog')).toBeVisible()
    await expect(page.getByText('E-commerce Store')).toBeVisible()
    await expect(page.getByText('Bank Core System')).toBeVisible()
    await expect(page.getByText('Patient Portal')).toBeVisible()
    await expect(page.getByText('Trading Dashboard')).toBeVisible()
  })

  test('shows difficulty badges for each app', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Easy')).toBeVisible()
    await expect(page.getByText('Medium')).toBeVisible()
    await expect(page.getByText('Hard')).toBeVisible()
    await expect(page.getByText('Expert')).toBeVisible()
    await expect(page.getByText('Impossible')).toBeVisible()
  })

  test('clicking Product Catalog navigates to /catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Product Catalog').click()
    await expect(page).toHaveURL(/\/catalog/)
    await expect(page.getByText('TechMart v02')).toBeVisible()
  })

  test('404 page appears for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Back to Hub')).toBeVisible()
  })

  test('Back to Hub link on 404 page returns to home', async ({ page }) => {
    await page.goto('/unknown-route')
    await page.getByText('Back to Hub').click()
    await expect(page).toHaveURL('/')
  })
})

// ─── Catalog Home ─────────────────────────────────────────────────────────────

test.describe('Catalog Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalog')
  })

  test('displays category navigation buttons', async ({ page }) => {
    await expect(page.getByText('Electronics')).toBeVisible()
    await expect(page.getByText('Home Goods')).toBeVisible()
    await expect(page.getByText('Apparel')).toBeVisible()
    await expect(page.getByText('Accessories')).toBeVisible()
  })

  test('displays at least 3 featured product cards', async ({ page }) => {
    // Wait for products to load from MockAPI
    await page.waitForTimeout(500)
    const cards = page.locator('.glass-panel').filter({ hasText: '$' })
    await expect(cards).toHaveCount(3)
  })

  test('clicking a category navigates to the category view', async ({ page }) => {
    await page.getByText('Electronics').first().click()
    await expect(page).toHaveURL(/\/catalog\/category\/Electronics/)
    await expect(page.getByText('Category: Electronics')).toBeVisible()
  })

  test('search bar navigates to search results on Enter', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...')
    await searchInput.fill('keyboard')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/\/catalog\/search\?q=keyboard/)
    await expect(page.getByText('Search Results')).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 1: "Shop Now" button is a no-op
   * Requirement: clicking "Shop Now" must navigate somewhere useful.
   * Actual:      The button has no onClick handler and does nothing.
   */
  test('[BUG-L1] Shop Now button navigates to a meaningful destination', async ({ page }) => {
    const shopNow = page.getByText('Shop Now')
    await shopNow.click()
    // After clicking, URL should have changed from /catalog
    const currentUrl = page.url()
    // This test documents the bug — it will pass once the bug is fixed
    expect(currentUrl).not.toBe(`${page.context().browser()?.version}`)
    expect(currentUrl).not.toMatch(/^http:\/\/localhost:5173\/catalog$/)
  })
})

// ─── Category View ────────────────────────────────────────────────────────────

test.describe('Category View', () => {
  test('shows products after navigation', async ({ page }) => {
    await page.goto('/catalog/category/Apparel')
    await page.waitForTimeout(500)
    await expect(page.getByText('Category: Apparel')).toBeVisible()
    // Apparel should have products
    const products = page.locator('.glass-panel h4')
    await expect(products.first()).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 4: Home Goods category includes Electronics products
   * Requirement: only products with category="Home Goods" should display.
   * Actual:      Electronics products appear due to a flawed if-condition in MockAPI.
   */
  test('[BUG-L4] Home Goods shows only Home Goods products', async ({ page }) => {
    await page.goto('/catalog/category/Home%20Goods')
    await page.waitForTimeout(500)

    // Get all product cards
    const productHeadings = page.locator('.glass-panel h4')
    const count = await productHeadings.count()

    // Known Home Goods products: Ergonomic Office Chair, Ceramic Coffee Mug
    // Known Electronics that should NOT appear: TVs, Headphones, etc.
    const knownElectronics = ['Ultra HD 4K Smart TV', 'Noise Cancelling Headphones', 'Smartwatch Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Gaming Monitor']

    for (let i = 0; i < count; i++) {
      const name = await productHeadings.nth(i).textContent()
      const isElectronics = knownElectronics.some(e => name?.includes(e.split(' ')[0]))
      if (isElectronics) {
        console.warn(`[BUG-L4] Electronics product "${name}" appeared in Home Goods category`)
      }
      // This assertion will fail until the bug is fixed
      expect(isElectronics, `"${name}" should not appear in Home Goods`).toBe(false)
    }
  })
})

// ─── Product Detail ───────────────────────────────────────────────────────────

test.describe('Product Detail', () => {
  test('displays product name, price, and add-to-cart button', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    await expect(page.getByText('Ultra HD 4K Smart TV')).toBeVisible()
    await expect(page.getByText('$599.99')).toBeVisible()
    await expect(page.getByText('Add to Cart')).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 2: Back button navigates to invalid URL
   * Requirement: "Back to Catalog" must return to /catalog
   * Actual:      It navigates to /catalog/invalid-url (a 404)
   */
  test('[BUG-L2] Back to Catalog button navigates to /catalog not /catalog/invalid-url', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    await page.getByText('Back to Catalog').click()

    const url = page.url()
    if (url.includes('invalid-url')) {
      console.warn(`[BUG-L2] Back button navigated to: ${url}`)
    }
    await expect(page).not.toHaveURL(/invalid-url/)
    await expect(page).toHaveURL('/catalog')
  })

  /**
   * KNOWN BUG — Level 2: "Add to Wishlist" button is permanently disabled
   * Requirement: the wishlist button must be enabled and functional
   * Actual:      The button has the `disabled` attribute hardcoded
   */
  test('[BUG-L2] Add to Wishlist button is enabled', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    const wishlistBtn = page.getByText('Add to Wishlist')
    const isDisabled = await wishlistBtn.isDisabled()
    if (isDisabled) {
      console.warn('[BUG-L2] "Add to Wishlist" button is permanently disabled')
    }
    await expect(wishlistBtn).toBeEnabled()
  })
})

// ─── Search Results ───────────────────────────────────────────────────────────

test.describe('Search Results', () => {
  test('shows results matching the search query', async ({ page }) => {
    await page.goto('/catalog/search?q=keyboard')
    await page.waitForTimeout(500)
    await expect(page.getByText('Search Results')).toBeVisible()
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()
  })

  test('shows error message when API returns 500', async ({ page }) => {
    await page.goto('/catalog/search?q=error')
    await page.waitForTimeout(500)
    await expect(page.getByText(/500 Internal Server Error/)).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 9: XSS via dangerouslySetInnerHTML
   * Requirement: search query must be displayed as plain text (escaped).
   * Actual:      The query is rendered via dangerouslySetInnerHTML — allows HTML injection.
   */
  test('[BUG-L9] Search query is displayed as escaped text, not rendered HTML', async ({ page }) => {
    const xssPayload = '<b>bold</b>'
    await page.goto(`/catalog/search?q=${encodeURIComponent(xssPayload)}`)
    await page.waitForTimeout(500)

    // If the bug exists, the page will render a <b> element instead of showing the text literally
    const boldTag = page.locator('p b')
    const hasBoldRendered = await boldTag.count() > 0

    if (hasBoldRendered) {
      console.warn('[BUG-L9] XSS: HTML in search query was rendered as DOM elements instead of escaped text')
    }

    // Requirement: the literal string '<b>bold</b>' must appear as text
    await expect(boldTag).toHaveCount(0)
  })
})

// ─── Cart Flow ────────────────────────────────────────────────────────────────

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalog/product/PROD-003')
    await page.waitForTimeout(700)
    await page.getByText('Add to Cart').click()
    await page.goto('/catalog/cart')
  })

  test('shows added item in cart', async ({ page }) => {
    await expect(page.getByText('Ergonomic Office Chair')).toBeVisible()
  })

  test('shows order summary with subtotal', async ({ page }) => {
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page.getByText('Tax (8%)')).toBeVisible()
    await expect(page.getByText('Total')).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 8: Promo regex accepts any code ending in "20"
   * Requirement: only SAVE20 and FALL10 are valid codes.
   * Actual:      Any string matching /.*20$/ is accepted.
   */
  test('[BUG-L8] Invalid promo code HACK20 should be rejected', async ({ page }) => {
    const promoInput = page.getByPlaceholder('Promo code...')
    await promoInput.fill('HACK20')
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click()
    // If the bug exists, a discount line will appear
    const discountLine = page.getByText('Discount')
    const hasDiscount = await discountLine.isVisible().catch(() => false)
    if (hasDiscount) {
      console.warn('[BUG-L8] Invalid promo code "HACK20" was accepted (regex flaw)')
    }
    await expect(discountLine).not.toBeVisible()
  })
})

// ─── Checkout Flow ────────────────────────────────────────────────────────────

test.describe('Checkout Shipping', () => {
  test.beforeEach(async ({ page }) => {
    // Add an item and get to cart first
    await page.goto('/catalog/product/PROD-005')
    await page.waitForTimeout(700)
    await page.getByText('Add to Cart').click()
    await page.goto('/catalog/cart')
    await page.getByText('Checkout').click()
  })

  /**
   * KNOWN BUG — Level 4: Shipping form has no validation
   * Requirement: address and ZIP must be validated before proceeding.
   * Actual:      Clicking "Continue to Payment" with empty fields navigates anyway.
   */
  test('[BUG-L4] Empty shipping form should not proceed to payment', async ({ page }) => {
    // Ensure fields are empty and click Continue
    await page.getByText('Continue to Payment').click()

    const currentUrl = page.url()
    if (currentUrl.includes('payment')) {
      console.warn('[BUG-L4] Checkout moved to payment with no address or ZIP entered')
    }
    // Requirement: should stay on shipping page with validation error
    await expect(page).not.toHaveURL(/payment/)
  })
})
