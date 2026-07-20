import type { KnownBug } from '../bugTypes';

// Product Catalog — 27 curated bugs across 10 pages. Curated down from an
// earlier 104 so each bug teaches a DISTINCT lesson, balanced across ISTQB
// quality characteristics rather than repeating a handful of easy ones. Every
// entry is tagged (testType / characteristic / testDesign / testLevel) so the
// QA Inspector can teach the vocabulary while the learner hunts, and each `id`
// has a matching Solution card on the page that owns it.
export const catalogBugs: KnownBug[] = [
  // ─── Functional correctness ───────────────────────────────────────────
  { id: 'CAT-HOME-01', appId: 'catalog', level: 2, technique: 'Broken control',
    title: '"Shop Now" hero button is a no-op (no navigation)',
    keywords: ['shop', 'now', 'button', 'hero', 'noop', 'navigation', 'broken', 'dead'],
    testType: 'Functional', characteristic: 'Functional correctness', testDesign: 'Error Guessing', testLevel: 'System' },
  { id: 'CART-05', appId: 'catalog', level: 8, technique: 'Order-of-operations',
    title: 'Tax is applied before the discount instead of after',
    keywords: ['tax', 'discount', 'before', 'after', 'order', 'calculation'],
    testType: 'Functional', characteristic: 'Functional correctness', testDesign: 'Decision Table', testLevel: 'Integration' },
  { id: 'CAT-05', appId: 'catalog', level: 4, technique: 'Wrong filter logic',
    title: 'Home Goods category filter also returns Electronics products',
    keywords: ['home', 'goods', 'electronics', 'category', 'filter', 'wrong'],
    testType: 'Functional', characteristic: 'Functional correctness', testDesign: 'Equivalence Partitioning', testLevel: 'Unit' },
  { id: 'CART-04', appId: 'catalog', level: 8, technique: 'Regex flaw',
    title: 'Promo code accepted if it merely ends in "20" (e.g. HACK20)',
    keywords: ['promo', 'regex', 'hack20', 'code', 'invalid', 'accepted'],
    testType: 'Functional', characteristic: 'Functional correctness', testDesign: 'Equivalence Partitioning', testLevel: 'Unit' },

  // ─── Input validation ─────────────────────────────────────────────────
  { id: 'CART-01', appId: 'catalog', level: 3, technique: 'Missing lower bound',
    title: 'Cart quantity can be reduced below 1',
    keywords: ['quantity', 'below', 'negative', 'zero', 'cart', 'minus'],
    testType: 'Functional', characteristic: 'Input validation', testDesign: 'Boundary Value Analysis', testLevel: 'Unit' },
  { id: 'SEARCH-01', appId: 'catalog', level: 3, technique: 'Empty-input handling',
    title: 'Empty search query returns all products instead of none',
    keywords: ['search', 'empty', 'query', 'all', 'products', 'filter'],
    testType: 'Functional', characteristic: 'Input validation', testDesign: 'Boundary Value Analysis', testLevel: 'Unit' },
  { id: 'PAY-01', appId: 'catalog', level: 4, technique: 'Invalid class accepted',
    title: 'Card number is not Luhn-validated (any 16 chars accepted)',
    keywords: ['card', 'luhn', 'validation', 'number', 'invalid', 'payment'],
    testType: 'Functional', characteristic: 'Input validation', testDesign: 'Equivalence Partitioning', testLevel: 'Unit' },
  { id: 'SHIP-01', appId: 'catalog', level: 3, technique: 'No format check',
    title: 'ZIP code accepts non-numeric characters / any length',
    keywords: ['zip', 'code', 'numeric', 'validation', 'length', 'shipping'],
    testType: 'Functional', characteristic: 'Input validation', testDesign: 'Equivalence Partitioning', testLevel: 'Unit' },

  // ─── Data integrity ───────────────────────────────────────────────────
  { id: 'CART-03', appId: 'catalog', level: 7, technique: 'Wrong record mutated',
    title: 'Remove always deletes the first item, not the selected one',
    keywords: ['remove', 'first', 'item', 'wrong', 'delete', 'cart'],
    testType: 'Functional', characteristic: 'Data integrity', testDesign: 'Decision Table', testLevel: 'Integration' },
  { id: 'ORD-01', appId: 'catalog', level: 7, technique: 'Hardcoded value',
    title: 'Order ID is always hardcoded as ORD-9999',
    keywords: ['order', 'id', 'hardcoded', 'ord-9999', 'unique', 'same'],
    testType: 'Functional', characteristic: 'Data integrity', testDesign: 'Error Guessing', testLevel: 'System' },
  { id: 'CAT-06', appId: 'catalog', level: 7, technique: 'Wrong record shown',
    title: 'PROD-002 displays reviews belonging to PROD-001',
    keywords: ['review', 'prod-002', 'prod-001', 'wrong', 'data', 'integrity'],
    testType: 'Functional', characteristic: 'Data integrity', testDesign: 'Checklist / Heuristic', testLevel: 'Integration' },

  // ─── Usability ────────────────────────────────────────────────────────
  { id: 'CAT-HOME-08', appId: 'catalog', level: 1, technique: 'Placeholder content',
    title: 'Product description contains leftover "Lorem ipsum" placeholder text',
    keywords: ['lorem', 'ipsum', 'placeholder', 'description', 'content'],
    testType: 'Non-functional', characteristic: 'Usability', testDesign: 'Checklist / Heuristic', testLevel: 'System' },
  { id: 'SEARCH-02', appId: 'catalog', level: 1, technique: 'Typo / wording',
    title: 'Typo in product name "Laptap Stand" instead of "Laptop Stand"',
    keywords: ['typo', 'laptap', 'laptop', 'stand', 'name', 'spelling'],
    testType: 'Non-functional', characteristic: 'Usability', testDesign: 'Checklist / Heuristic', testLevel: 'Unit' },
  { id: 'CART-16', appId: 'catalog', level: 2, technique: 'Missing feedback',
    title: 'Invalid promo codes fail silently with no error message',
    keywords: ['promo', 'invalid', 'error', 'message', 'silent', 'feedback'],
    testType: 'Non-functional', characteristic: 'Usability', testDesign: 'Error Guessing', testLevel: 'Integration' },

  // ─── Accessibility ────────────────────────────────────────────────────
  { id: 'PDP-08', appId: 'catalog', level: 2, technique: 'Missing text alternative',
    title: 'Product images have empty or missing alt attributes',
    keywords: ['alt', 'image', 'accessibility', 'missing', 'empty', 'screen', 'reader'],
    testType: 'Non-functional', characteristic: 'Accessibility', testDesign: 'Checklist / Heuristic', testLevel: 'Unit' },
  { id: 'PDP-09', appId: 'catalog', level: 3, technique: 'Contrast violation',
    title: '"Out of Stock" badge fails WCAG AA color contrast (#c8c8c8 on #e0e0e0)',
    keywords: ['contrast', 'wcag', 'out', 'of', 'stock', 'badge', 'color', 'accessibility'],
    testType: 'Non-functional', characteristic: 'Accessibility', testDesign: 'Checklist / Heuristic', testLevel: 'Unit' },
  { id: 'PDP-03', appId: 'catalog', level: 7, technique: 'Keyboard trap',
    title: 'Quick View modal traps focus with no way to Tab out, and focus never returns on close',
    keywords: ['modal', 'focus', 'trap', 'keyboard', 'accessibility', 'quick', 'view'],
    testType: 'Non-functional', characteristic: 'Accessibility', testDesign: 'Exploratory', testLevel: 'System' },

  // ─── Security ─────────────────────────────────────────────────────────
  { id: 'CAT-08', appId: 'catalog', level: 9, technique: 'XSS injection',
    title: 'Search query rendered as HTML (XSS via dangerouslySetInnerHTML)',
    keywords: ['xss', 'html', 'injection', 'search', 'inner', 'dangerous'],
    testType: 'Non-functional', characteristic: 'Security', testDesign: 'Error Guessing', testLevel: 'Integration' },
  { id: 'CART-06', appId: 'catalog', level: 9, technique: 'Client-side trust',
    title: 'isAdmin flag in localStorage grants a 100% discount',
    keywords: ['isadmin', 'localstorage', 'discount', 'security', 'admin', 'privilege'],
    testType: 'Non-functional', characteristic: 'Security', testDesign: 'Exploratory', testLevel: 'System' },
  { id: 'USER-01', appId: 'catalog', level: 9, technique: 'Sensitive data exposure',
    title: 'API exposes passwordHash to the frontend',
    keywords: ['password', 'hash', 'expose', 'api', 'security', 'sensitive'],
    testType: 'Non-functional', characteristic: 'Security', testDesign: 'Exploratory', testLevel: 'Integration' },

  // ─── Performance ──────────────────────────────────────────────────────
  { id: 'CAT-HOME-04', appId: 'catalog', level: 6, technique: 'Memory leak',
    title: 'Carousel interval and ghost DOM nodes are never cleaned up',
    keywords: ['carousel', 'interval', 'cleanup', 'leak', 'memory', 'dom', 'ghost'],
    testType: 'Non-functional', characteristic: 'Performance', testDesign: 'Exploratory', testLevel: 'System' },
  { id: 'CAT-HOME-05', appId: 'catalog', level: 5, technique: 'Inefficient handler',
    title: 'Scroll-to-top button re-queries the DOM on every scroll event',
    keywords: ['scroll', 'top', 'button', 'getelementbyid', 'performance', 'query'],
    testType: 'Non-functional', characteristic: 'Performance', testDesign: 'Exploratory', testLevel: 'Unit' },

  // ─── Compatibility ────────────────────────────────────────────────────
  { id: 'PDP-10', appId: 'catalog', level: 3, technique: 'Fixed width overflow',
    title: 'Product title has a hardcoded 400px width, overflowing on mobile',
    keywords: ['overflow', 'mobile', 'safari', 'width', 'hardcoded', 'responsive', 'title'],
    testType: 'Non-functional', characteristic: 'Compatibility', testDesign: 'Checklist / Heuristic', testLevel: 'System' },
  { id: 'PDP-02', appId: 'catalog', level: 4, technique: 'Fixed-position on scroll',
    title: 'Price tooltip uses position:fixed and stays put while the page scrolls',
    keywords: ['tooltip', 'scroll', 'fixed', 'position', 'persist', 'price'],
    testType: 'Non-functional', characteristic: 'Compatibility', testDesign: 'Exploratory', testLevel: 'System' },

  // ─── Reliability ──────────────────────────────────────────────────────
  { id: 'SEARCH-03', appId: 'catalog', level: 6, technique: 'Raw error leak',
    title: 'Searching "error" shows a raw technical stack trace, not a friendly message',
    keywords: ['error', 'search', 'raw', 'stack', 'trace', 'friendly', 'message'],
    testType: 'Non-functional', characteristic: 'Reliability', testDesign: 'Error Guessing', testLevel: 'Integration' },
  { id: 'SEARCH-04', appId: 'catalog', level: 6, technique: 'No timeout / hang',
    title: 'Searching "infinite" hangs the page forever with no timeout or escape',
    keywords: ['infinite', 'search', 'hang', 'timeout', 'loading', 'forever'],
    testType: 'Non-functional', characteristic: 'Reliability', testDesign: 'Error Guessing', testLevel: 'System' },
  { id: 'PAY-03', appId: 'catalog', level: 8, technique: 'Double-submit race',
    title: 'Double-submit race condition on the Authorize Payment button',
    keywords: ['double', 'submit', 'authorize', 'payment', 'race', 'button'],
    testType: 'Non-functional', characteristic: 'Reliability', testDesign: 'Exploratory', testLevel: 'System' },
];
