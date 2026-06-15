/**
 * catalog-flow.spec.ts — End-to-End tests for TestLab 101
 *
 * These tests simulate a real QA engineer's manual test session, automated with
 * Playwright. Bug tests are written as CHARACTERIZATION tests: they assert the
 * known bug currently EXISTS (so the suite stays green) while documenting the
 * requirement. When a bug is fixed, its test should be inverted.
 *
 * Setup: npx playwright install chromium
 * Run:   npx playwright test
 */

import { test, expect } from '@playwright/test'

// ─── Hub ──────────────────────────────────────────────────────────────────────

test.describe('Main Hub', () => {
  test('loads and shows the 6 app cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('TestLab 101')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Product Catalog' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'E-commerce Store' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Registration Portal' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bank Core System' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Patient Portal' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Trading Dashboard' })).toBeVisible()
  })

  test('shows difficulty badges for each app', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Easy', { exact: true })).toBeVisible()
    await expect(page.getByText('Medium', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Hard', { exact: true })).toBeVisible()
    await expect(page.getByText('Expert', { exact: true })).toBeVisible()
    await expect(page.getByText('Impossible', { exact: true })).toBeVisible()
  })

  test('clicking Product Catalog navigates to /catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Product Catalog' }).click()
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
    await expect(page.getByText('Electronics', { exact: true })).toBeVisible()
    await expect(page.getByText('Home Goods', { exact: true })).toBeVisible()
    await expect(page.getByText('Apparel', { exact: true })).toBeVisible()
    await expect(page.getByText('Accessories', { exact: true })).toBeVisible()
  })

  test('displays at least 3 featured product cards', async ({ page }) => {
    // Web-first wait: the lazy app chunk + MockAPI latency means a fixed timeout
    // is unreliable. Wait for the first priced card, then assert the count.
    const cards = page.locator('.glass-panel').filter({ hasText: '$' })
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(3)
  })

  test('clicking a category navigates to the category view', async ({ page }) => {
    await page.getByText('Electronics', { exact: true }).click()
    await expect(page).toHaveURL(/\/catalog\/category\/Electronics/)
    await expect(page.getByText('Category: Electronics')).toBeVisible()
  })

  test('search bar navigates to search results on Enter', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...')
    await searchInput.fill('keyboard')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/\/catalog\/search\?q=keyboard/)
    await expect(page.getByRole('heading', { name: 'Search Results' }).first()).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 1: "Shop Now" button is a no-op
   * Requirement: clicking "Shop Now" must navigate somewhere useful.
   * Characterization: the button has no onClick handler, so the URL stays on /catalog.
   */
  test('[BUG-L1] documents that Shop Now is a no-op', async ({ page }) => {
    await page.getByRole('button', { name: 'Shop Now' }).click()
    await expect(page).toHaveURL(/\/catalog$/)
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
   * Characterization: the flawed MockAPI filter leaks >= 1 Electronics product in.
   */
  test('[BUG-L4] documents Home Goods leaking Electronics products', async ({ page }) => {
    await page.goto('/catalog/category/Home%20Goods')

    const productHeadings = page.locator('.glass-panel h4')
    await expect(productHeadings.first()).toBeVisible()
    const count = await productHeadings.count()

    const knownElectronics = ['Ultra HD 4K Smart TV', 'Noise Cancelling Headphones', 'Smartwatch Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Gaming Monitor']
    let leaked = 0
    for (let i = 0; i < count; i++) {
      const name = await productHeadings.nth(i).textContent()
      if (knownElectronics.some(e => name?.includes(e.split(' ')[0]))) {
        console.warn(`[BUG-L4] Electronics product "${name}" appeared in Home Goods category`)
        leaked++
      }
    }
    expect(leaked).toBeGreaterThan(0)
  })
})

// ─── Product Detail ───────────────────────────────────────────────────────────

test.describe('Product Detail', () => {
  test('displays product name, price, and add-to-cart button', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    await expect(page.getByText('Ultra HD 4K Smart TV').first()).toBeVisible()
    await expect(page.getByText('$599.99').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 2: Back button navigates to invalid URL
   * Requirement: "Back to Catalog" must return to /catalog.
   * Characterization: it navigates to /catalog/invalid-url (a 404).
   */
  test('[BUG-L2] documents Back to Catalog navigating to an invalid URL', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Back to Catalog' }).click()
    await expect(page).toHaveURL(/invalid-url/)
  })

  /**
   * KNOWN BUG — Level 2: "Add to Wishlist" button is permanently disabled
   * Requirement: the wishlist button must be enabled and functional.
   * Characterization: the button has the `disabled` attribute hardcoded.
   */
  test('[BUG-L2] documents Add to Wishlist being permanently disabled', async ({ page }) => {
    await page.goto('/catalog/product/PROD-001')
    await page.waitForTimeout(700)
    const wishlistBtn = page.getByRole('button', { name: 'Add to Wishlist' })
    await expect(wishlistBtn).toBeDisabled()
  })
})

// ─── Search Results ───────────────────────────────────────────────────────────

test.describe('Search Results', () => {
  test('shows results matching the search query', async ({ page }) => {
    await page.goto('/catalog/search?q=keyboard')
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Search Results' }).first()).toBeVisible()
    await expect(page.getByText('Mechanical Keyboard').first()).toBeVisible()
  })

  test('shows error message when API returns 500', async ({ page }) => {
    await page.goto('/catalog/search?q=error')
    await page.waitForTimeout(500)
    await expect(page.getByText(/500 Internal Server Error/)).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 9: XSS via dangerouslySetInnerHTML
   * Requirement: search query must be displayed as plain text (escaped).
   * Characterization: the query is rendered via dangerouslySetInnerHTML, so an
   * injected <b> element actually appears in the DOM.
   */
  test('[BUG-L9] documents search query being rendered as raw HTML (XSS)', async ({ page }) => {
    const xssPayload = '<b>bold</b>'
    await page.goto(`/catalog/search?q=${encodeURIComponent(xssPayload)}`)
    await page.waitForTimeout(500)

    const renderedBold = await page.locator('p b').count()
    if (renderedBold > 0) {
      console.warn('[BUG-L9] XSS: HTML in search query was rendered as DOM elements instead of escaped text')
    }
    expect(renderedBold).toBeGreaterThan(0)
  })
})

// ─── Cart Flow ────────────────────────────────────────────────────────────────

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalog/product/PROD-003')
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Add to Cart' }).click()
    await page.waitForTimeout(300) // let the cart persist to localStorage
    await page.goto('/catalog/cart')
  })

  test('shows added item in cart', async ({ page }) => {
    await expect(page.getByText('Ergonomic Office Chair').first()).toBeVisible()
  })

  test('shows order summary with subtotal', async ({ page }) => {
    await expect(page.getByText('Subtotal', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Tax (8%)').first()).toBeVisible()
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible()
  })

  /**
   * KNOWN BUG — Level 8: Promo regex accepts any code ending in "20"
   * Requirement: only SAVE20 and FALL10 are valid codes.
   * Characterization: HACK20 matches /.*20$/ and a discount line appears.
   */
  test('[BUG-L8] documents invalid promo code HACK20 being accepted', async ({ page }) => {
    const promoInput = page.getByPlaceholder('Promo code...')
    await promoInput.fill('HACK20')
    await page.getByRole('button', { name: 'Apply promo code' }).click()
    // A discount amount line (e.g. "-$39.80") appears only when the code is accepted.
    await expect(page.getByText(/-\$\d/).first()).toBeVisible()
  })
})

// ─── Checkout Flow ────────────────────────────────────────────────────────────

test.describe('Checkout Shipping', () => {
  test.beforeEach(async ({ page }) => {
    // Add an item and get to cart first
    await page.goto('/catalog/product/PROD-005')
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Add to Cart' }).click()
    await page.waitForTimeout(300) // let the cart persist to localStorage
    await page.goto('/catalog/cart')
    await page.getByRole('button', { name: 'Checkout' }).click()
  })

  /**
   * KNOWN BUG — Level 4: Shipping form has no validation
   * Requirement: address and ZIP must be validated before proceeding.
   * Characterization: clicking "Continue to Payment" with empty fields navigates anyway.
   */
  test('[BUG-L4] documents empty shipping form proceeding to payment', async ({ page }) => {
    await page.getByRole('button', { name: 'Continue to Payment' }).click()
    await expect(page).toHaveURL(/payment/)
  })
})
