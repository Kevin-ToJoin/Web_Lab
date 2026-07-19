import { useEffect } from 'react';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS } from '../data/mockStore';

export const Storefront = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const { cart, badgeCount, addToCart, updateQuantity, setQuantityRaw } = useCart();

  useEffect(() => {
    setRequirements(`## Bean & Brew — Storefront
### Acceptance Criteria:
- Every product must show its name, price, stock status, and category.
- Out-of-stock products (stock = 0) cannot be added to the cart.
- Cart quantity must be a whole number between 0 and the item's stock.
- The cart badge in the header must always reflect the current total quantity.
- Clicking a product must navigate to its detail page.
- All interactive controls must be reachable via keyboard.

### Bug Hints (8 bugs on this page):
- 🐛 **Level 4:** Try adding the "Pour-over Coffee Maker" (0 in stock) to your cart. Does it work?
- 🐛 **Level 3:** Type "1.5" directly into a quantity field. Is it accepted?
- 🐛 **Level 3 (Boundary):** Click **+** on a product more times than its available stock. Does it stop you?
- 🐛 **Level 5:** Add a few items, then click **-** repeatedly past zero. What happens to the cart badge?
- 🐛 **Level 4:** Compare the price shown here against the price + tax shown once it's in your cart.
- 🐛 **Level 3 (Accessibility):** Try reaching a product's title using only Tab, then the +/- quantity buttons.
- 🐛 **Level 2 (Accessibility):** Do the +/- buttons announce which product they belong to?`);

    setDbTables({
      Products: PRODUCTS.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category })),
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'GET',
        path: '/api/products',
        description: 'Returns the full product catalog.',
        handler: () => ({ status: 200, body: PRODUCTS }),
      },
      {
        method: 'POST',
        path: '/api/cart/add',
        description: 'Adds an item to the cart. (Reflects the out-of-stock add bug.)',
        payloadTemplate: '{\n  "productId": 103,\n  "quantity": 1\n}',
        handler: (requestBody: string) => {
          try {
            const { productId, quantity } = JSON.parse(requestBody || '{}');
            const product = PRODUCTS.find(p => p.id === Number(productId));
            if (!product) return { status: 404, body: { error: 'Product not found' } };
            // BUG ECO-12: no stock check — out-of-stock items are accepted.
            return { status: 200, body: { added: true, productId: product.id, quantity: Number(quantity), stock: product.stock } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-01', title: 'Cart quantity can go negative', location: 'CartContext.tsx — updateQuantity()',
        technique: 'Boundary Value',
        buggyCode: 'return { ...item, quantity: item.quantity + delta };',
        fixedCode: 'return { ...item, quantity: Math.max(0, item.quantity + delta) };',
        explanation: 'Decrementing below zero is unguarded. Clamp the lower bound to 0.',
      },
      {
        bugId: 'ECO-05', title: 'Quantity exceeds available stock', location: 'CartContext.tsx — updateQuantity()',
        technique: 'Boundary Value',
        buggyCode: 'quantity: item.quantity + delta',
        fixedCode: 'quantity: Math.min(product.stock, Math.max(0, item.quantity + delta))',
        explanation: 'No upper bound lets the cart hold more units than exist. Clamp to the product\'s stock.',
      },
      {
        bugId: 'ECO-07', title: 'Header cart badge goes stale', location: 'CartContext.tsx — badgeCount state',
        technique: 'Stale State',
        buggyCode: 'const [badgeCount, setBadgeCount] = useState(0); // only +qty on add',
        fixedCode: 'const badgeCount = cart.reduce((a, i) => a + i.quantity, 0); // derived',
        explanation: 'A separately tracked count desyncs on +/-/remove. Derive it from cart instead.',
      },
      {
        bugId: 'ECO-08', title: 'Tax shown inconsistently', location: 'Storefront.tsx price vs Cart.tsx total',
        technique: 'Equivalence Partitioning',
        buggyCode: 'list: ${price.toFixed(2)}   // no tax\ncart total: subtotal + tax',
        fixedCode: 'Show price including tax in both places (or exclude tax in both consistently).',
        explanation: 'The storefront omits tax while the cart total includes it, confusing the displayed price.',
      },
      {
        bugId: 'ECO-09', title: 'Quantity accepts decimals', location: 'CartContext.tsx — setQuantityRaw()',
        technique: 'Boundary Value',
        buggyCode: 'const num = parseFloat(value);',
        fixedCode: 'const num = parseInt(value, 10);',
        explanation: 'parseFloat permits 1.5 units. Use parseInt to enforce whole quantities.',
      },
      {
        bugId: 'ECO-12', title: 'Out-of-stock item addable', location: 'CartContext.tsx — addToCart()',
        technique: 'Logic Error',
        buggyCode: 'const addToCart = (id) => { updateQuantity(id, 1); };',
        fixedCode: 'const p = PRODUCTS.find(p => p.id === id);\nif (!p || p.stock <= 0) return;\nupdateQuantity(id, 1);',
        explanation: 'Items with stock 0 (Pour-over Coffee Maker) can still be added. Guard on stock.',
      },
      {
        bugId: 'ECO-17', title: 'Product cards are not keyboard-accessible',
        location: 'Storefront.tsx — product list', technique: 'Accessibility',
        buggyCode: '<h3 onClick={() => navigate(`/ecommerce/product/${p.id}`)}>{p.name}</h3>',
        fixedCode: '<Link to={`/ecommerce/product/${p.id}`}>{p.name}</Link>',
        explanation: 'A clickable heading with no tabIndex/role is invisible to keyboard navigation — use a real link.',
      },
      {
        bugId: 'ECO-18', title: '+/- quantity buttons have no accessible label',
        location: 'Storefront.tsx — quantity controls', technique: 'Accessibility',
        buggyCode: '<button onClick={() => updateQuantity(p.id, -1)}>-</button>',
        fixedCode: '<button aria-label={`Decrease quantity of ${p.name}`} onClick={() => updateQuantity(p.id, -1)}>-</button>',
        explanation: 'A lone "-" or "+" character means nothing to a screen reader without context about which product it affects.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bean &amp; Brew Store</h1>
          <p>Purchase premium coffee equipment. (Difficulty: Medium)</p>
        </div>
        <button className="btn btn-secondary" style={{ position: 'relative' }} onClick={() => navigate('/ecommerce/cart')}>
          <ShoppingCart size={24} />
          <span style={{
            position: 'absolute', top: '-8px', right: '-8px', background: 'var(--primary)',
            color: '#fff', borderRadius: '999px', minWidth: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
            fontWeight: 'bold', padding: '0 4px',
          }}>{badgeCount}</span>
        </button>
      </div>

      <div className="grid-cards">
        {PRODUCTS.map(product => {
          const line = cart.find(c => c.id === product.id);
          const qty = line?.quantity ?? 0;
          return (
            <div key={product.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <img src={product.image} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/ecommerce/product/${product.id}`)}>
                {product.name}
              </h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${product.price.toFixed(2)}</span>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: product.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, -1)}>-</button>
                <input
                  className="input-field"
                  style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }}
                  value={qty}
                  onChange={(e) => setQuantityRaw(product.id, e.target.value)}
                />
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, 1)}>+</button>
                <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', flex: 1 }} onClick={() => addToCart(product.id)}>Add</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
