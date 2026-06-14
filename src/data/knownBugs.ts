export interface KnownBug {
  id: string;
  appId: string;
  title: string;
  keywords: string[];   // words used for fuzzy matching against user report titles
  level: number;
  technique: string;
}

export const knownBugs: KnownBug[] = [
  // ── Registration App ──────────────────────────────────────────────────────
  { id: 'REG-01', appId: 'registration', level: 3, technique: 'Boundary Value',
    title: 'First name accepts single character (minimum not enforced)',
    keywords: ['first', 'name', 'minimum', 'single', 'character', 'empty'] },
  { id: 'REG-02', appId: 'registration', level: 3, technique: 'Boundary Value',
    title: 'Last name has no maximum length limit',
    keywords: ['last', 'name', 'maximum', 'length', 'long', '50'] },
  { id: 'REG-03', appId: 'registration', level: 4, technique: 'Equivalence Partitioning',
    title: 'Email accepts invalid format (e.g. a@b)',
    keywords: ['email', 'invalid', 'format', 'regex', 'a@b', 'permissive'] },
  { id: 'REG-04', appId: 'registration', level: 4, technique: 'Regex Flaw',
    title: 'Password validation does not require uppercase letter',
    keywords: ['password', 'uppercase', 'validation', 'regex', 'missing'] },
  { id: 'REG-05', appId: 'registration', level: 5, technique: 'Logic Bug',
    title: 'Password confirmation ignores trailing spaces',
    keywords: ['password', 'confirm', 'match', 'space', 'trailing', 'trim'] },
  { id: 'REG-06', appId: 'registration', level: 5, technique: 'Input Type',
    title: 'Phone field accepts non-numeric characters',
    keywords: ['phone', 'numeric', 'text', 'letters', 'symbols', 'input'] },
  { id: 'REG-07', appId: 'registration', level: 6, technique: 'Stale State',
    title: 'Review step shows stale email after going back and changing it',
    keywords: ['email', 'stale', 'review', 'back', 'old', 'snapshot', 'step 3'] },

  // ── E-commerce App ────────────────────────────────────────────────────────
  { id: 'ECO-01', appId: 'ecommerce', level: 3, technique: 'Boundary Value',
    title: 'Cart quantity can go negative',
    keywords: ['quantity', 'negative', 'minus', 'cart', 'zero', 'boundary'] },
  { id: 'ECO-02', appId: 'ecommerce', level: 4, technique: 'Equivalence Partitioning',
    title: 'Free shipping threshold uses > instead of >= (exactly $100 still pays shipping)',
    keywords: ['shipping', 'free', '100', 'threshold', 'equal', '>=', 'boundary'] },
  { id: 'ECO-03', appId: 'ecommerce', level: 4, technique: 'Missing Validation',
    title: 'Address field is not validated on checkout',
    keywords: ['address', 'validation', 'empty', 'checkout', 'required'] },
  { id: 'ECO-04', appId: 'ecommerce', level: 5, technique: 'Stale State',
    title: 'Cart total does not update after removing an item',
    keywords: ['total', 'remove', 'stale', 'update', 'item', 'cart'] },

  // ── Bank App ──────────────────────────────────────────────────────────────
  { id: 'BNK-01', appId: 'bank', level: 6, technique: 'Missing Validation',
    title: 'Transfer allows account to go into negative balance',
    keywords: ['balance', 'negative', 'transfer', 'overdraft', 'funds'] },
  { id: 'BNK-02', appId: 'bank', level: 7, technique: 'Precision Bug',
    title: 'Rounding error causes debit and credit amounts to differ',
    keywords: ['rounding', 'precision', 'decimal', 'transfer', 'amount', 'mismatch'] },
  { id: 'BNK-03', appId: 'bank', level: 7, technique: 'Data Exposure',
    title: 'Can view other users account balances via dropdown',
    keywords: ['other', 'user', 'balance', 'dropdown', 'exposure', 'session'] },
  { id: 'BNK-04', appId: 'bank', level: 8, technique: 'Race Condition',
    title: 'Double transfer occurs when submit button is clicked rapidly',
    keywords: ['double', 'transfer', 'click', 'race', 'button', 'disabled'] },

  // ── Healthcare App ────────────────────────────────────────────────────────
  { id: 'HLT-01', appId: 'healthcare', level: 8, technique: 'Decision Table',
    title: 'Copay calculator uses OR instead of AND (branch unreachable)',
    keywords: ['copay', 'or', 'and', 'decision', 'logic', 'unreachable', 'branch'] },
  { id: 'HLT-02', appId: 'healthcare', level: 9, technique: 'Date Validation',
    title: 'Appointment booking accepts past dates',
    keywords: ['appointment', 'past', 'date', 'validation', 'previous'] },
  { id: 'HLT-03', appId: 'healthcare', level: 9, technique: 'Edge Case',
    title: 'Feb 29 leap year date throws error even in valid leap years',
    keywords: ['february', 'leap', 'year', 'feb 29', 'date', 'error', '29'] },

  // ── Trading App ───────────────────────────────────────────────────────────
  { id: 'TRD-01', appId: 'trading', level: 10, technique: 'Race Condition',
    title: 'Race condition allows double purchase when clicking Buy rapidly',
    keywords: ['race', 'double', 'buy', 'purchase', 'rapid', 'click', 'funds'] },
  { id: 'TRD-02', appId: 'trading', level: 10, technique: 'Float Precision',
    title: 'Portfolio total shows floating-point precision error',
    keywords: ['float', 'precision', 'portfolio', 'total', 'decimal', 'drift'] },
  { id: 'TRD-03', appId: 'trading', level: 10, technique: 'Timezone Bug',
    title: 'Transaction history sorted incorrectly due to timezone offset',
    keywords: ['timezone', 'sort', 'transaction', 'history', 'order', 'offset'] },

  // ── Product Catalog ───────────────────────────────────────────────────────
  { id: 'CAT-01', appId: 'catalog', level: 1, technique: 'Content Bug',
    title: 'Product description contains Lorem ipsum placeholder text',
    keywords: ['lorem', 'ipsum', 'placeholder', 'description', 'text'] },
  { id: 'CAT-02', appId: 'catalog', level: 1, technique: 'Content Bug',
    title: 'Product name has typo "Laptap Stand" instead of "Laptop Stand"',
    keywords: ['typo', 'laptap', 'laptop', 'name', 'spelling'] },
  { id: 'CAT-03', appId: 'catalog', level: 2, technique: 'Broken Link',
    title: 'Back button navigates to /catalog/invalid-url instead of /catalog',
    keywords: ['back', 'button', 'invalid', 'url', 'navigation', 'link'] },
  { id: 'CAT-04', appId: 'catalog', level: 2, technique: 'Broken UI',
    title: 'Add to Wishlist button is permanently disabled',
    keywords: ['wishlist', 'disabled', 'button', 'add'] },
  { id: 'CAT-05', appId: 'catalog', level: 4, technique: 'Equivalence Partitioning',
    title: 'Home Goods category filter also returns Electronics products',
    keywords: ['home', 'goods', 'electronics', 'category', 'filter', 'wrong'] },
  { id: 'CAT-06', appId: 'catalog', level: 7, technique: 'Data Integrity',
    title: 'PROD-002 displays reviews belonging to PROD-001',
    keywords: ['review', 'prod-002', 'prod-001', 'wrong', 'data', 'integrity'] },
  { id: 'CAT-07', appId: 'catalog', level: 8, technique: 'Regex Flaw',
    title: 'Invalid promo code accepted if it ends in "20" (e.g. HACK20)',
    keywords: ['promo', 'regex', 'hack20', 'code', 'invalid', 'accepted'] },
  { id: 'CAT-08', appId: 'catalog', level: 9, technique: 'XSS',
    title: 'Search query rendered as HTML (XSS via dangerouslySetInnerHTML)',
    keywords: ['xss', 'html', 'injection', 'search', 'inner', 'dangerous'] },
];
