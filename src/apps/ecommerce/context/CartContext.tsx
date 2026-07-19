/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '../data/mockStore';

const TAX_RATE = 0.08;

export interface CartLine {
  id: number;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: { productId: number; quantity: number }[];
}

interface CartState {
  cart: CartLine[];
  badgeCount: number;
  subtotal: number;
  discount: number;
  discountApplied: boolean;
  discountCode: string;
  setDiscountCode: (code: string) => void;
  applyDiscount: () => void;
  tax: number;
  shipping: number;
  finalTotal: number;
  updateQuantity: (id: number, delta: number) => void;
  setQuantityRaw: (id: number, value: string) => void;
  addToCart: (id: number, qty?: number) => void;
  removeItem: (id: number) => void;
  orders: Order[];
  placeOrder: (address: string, email: string) => Order;
  savedAddress: string;
  savedEmail: string;
  saveProfile: (address: string, email: string) => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

const ORDERS_KEY = 'beanbrew_orders';
const PROFILE_KEY = 'beanbrew_profile';

const findProduct = (id: number): Product | undefined => PRODUCTS.find(p => p.id === id);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartLine[]>(PRODUCTS.map(p => ({ id: p.id, quantity: 0 })));
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);

  // BUG ECO-07 (L5 Stale State): header badge is tracked separately from cart
  // and only bumped on addToCart, so it desyncs after +/-/remove.
  const [badgeCount, setBadgeCount] = useState(0);

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    // Seed a couple of historical orders so the Order History page has
    // something to inspect before the tester places their own order.
    return [
      { id: 'ORD-501', date: '2026-05-12T10:00:00Z', total: 62.30, status: 'Delivered', items: [{ productId: 101, quantity: 2 }] },
      { id: 'ORD-502', date: '2026-06-03T14:30:00Z', total: 40.85, status: 'Processing', items: [{ productId: 105, quantity: 1 }, { productId: 106, quantity: 1 }] },
    ];
  });
  useEffect(() => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const loadProfile = (): { address?: string; email?: string } => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}'); } catch { return {}; }
  };
  const [savedAddress, setSavedAddress] = useState(() => loadProfile().address ?? '');
  const [savedEmail, setSavedEmail] = useState(() => loadProfile().email ?? '');

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // BUG ECO-01 (L3 Boundary): no Math.max(0, ...) so quantity can go negative.
        // BUG ECO-05 (L3 Boundary): no upper bound, can exceed the product's stock.
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }));
  };

  const setQuantityRaw = (id: number, value: string) => {
    // BUG ECO-09 (L3 Boundary): parseFloat accepts decimals like 1.5 (should be integer-only).
    const num = parseFloat(value);
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: isNaN(num) ? 0 : num } : item
    ));
  };

  const addToCart = (id: number, qty = 1) => {
    // BUG ECO-12 (L4 Logic): no stock===0 guard, out-of-stock items still added.
    updateQuantity(id, qty);
    setBadgeCount(c => c + qty);
  };

  const removeItem = (id: number) => {
    // BUG ECO-14 (L3 Data Integrity): removes by array index of the FIRST active
    // line rather than the matching id, so it can remove the wrong item.
    setCart(prev => {
      const firstActiveIdx = prev.findIndex(i => i.quantity !== 0);
      return prev.map((item, idx) =>
        idx === firstActiveIdx ? { ...item, quantity: 0 } : item
      );
    });
    // BUG ECO-04 (L5 Stale State): does not trigger total recalculation here.
    void id;
  };

  // BUG ECO-04 (L5 Stale State): subtotal is cached in state and the effect skips
  // recalculation when an item is removed (active count drops), leaving it stale.
  const [subtotal, setSubtotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const active = cart.filter(i => i.quantity > 0);
    if (active.length < activeCount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveCount(active.length);
      return;
    }
    // BUG ECO-13 (L4 Precision): naive float accumulation, no cent rounding.
     
    setSubtotal(cart.reduce((acc, item) => {
      const p = findProduct(item.id);
      return acc + (p ? p.price * item.quantity : 0);
    }, 0));
     
    setActiveCount(active.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  // BUG ECO-02 (L4 Equivalence): uses > 100 instead of >= 100; exactly $100 pays shipping.
  const shipping = subtotal > 100 ? 0 : 15.0;
  // BUG ECO-06 (L4 Equivalence): case-sensitive discount comparison.
  const discount = discountApplied ? subtotal * 0.1 : 0;
  // BUG ECO-08 (L4 Equivalence): cart total adds tax, but product list prices omit it.
  const tax = subtotal * TAX_RATE;
  const finalTotal = subtotal - discount + tax + shipping;

  const applyDiscount = () => {
    // BUG ECO-06: should be toUpperCase()/case-insensitive comparison.
    if (discountCode === 'SAVE10') {
      setDiscountApplied(true);
    } else {
      setDiscountApplied(false);
    }
  };

  const placeOrder = (_address: string, _email: string): Order => {
    void _address; void _email;
    // BUG ECO-15 (L7 Data Integrity): order id is a low-entropy random suffix,
    // not guaranteed unique — two rapid orders can collide.
    const order: Order = {
      id: `ORD-${Math.floor(Math.random() * 900 + 100)}`,
      date: new Date().toISOString(),
      total: finalTotal,
      status: 'Processing',
      items: cart.filter(i => i.quantity > 0).map(i => ({ productId: i.id, quantity: i.quantity })),
    };
    setOrders(prev => [order, ...prev]);
    // BUG ECO-16 (L5 Stale State): cart is never cleared after a successful order.
    return order;
  };

  const saveProfile = (address: string, email: string) => {
    setSavedAddress(address);
    setSavedEmail(email);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ address, email }));
  };

  return (
    <CartContext.Provider value={{
      cart, badgeCount, subtotal, discount, discountApplied, discountCode, setDiscountCode, applyDiscount,
      tax, shipping, finalTotal, updateQuantity, setQuantityRaw, addToCart, removeItem,
      orders, placeOrder, savedAddress, savedEmail, saveProfile,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
