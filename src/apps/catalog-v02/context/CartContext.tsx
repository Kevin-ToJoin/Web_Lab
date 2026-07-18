/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Product } from '../api/mockDatabase';

interface CartItem extends Product {
  quantity: number;
}

// Persist the cart so it survives a full page reload (real carts behave this way).
// This does not alter any of the intentionally injected bugs below.
const CART_KEY = 'tl101_catalog_cart';
const loadCart = (): CartItem[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CART_KEY) : null;
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

interface CartState {
  items: CartItem[];
  addToCart: (product: Product, qty: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  applyPromo: (code: string) => void;
  mergeGuestCart: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

// BUG-091: Stale Cache — module-level cache that never invalidates.
// If a product's price changes after first add, the old cached price is used.
const productCache = new Map<string, Product>();

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [promo, setPromo] = useState<string>('');

  // Level 5 BUG: Stale state
  // We keep totalItems separate and purposefully don't update it in some actions.
  const [totalItems, setTotalItems] = useState(() => loadCart().reduce((acc, i) => acc + i.quantity, 0));

  // Persist items across reloads (does not affect the stale-totalItems bug, which
  // is about not updating the separate counter during a session).
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  // BUG-090: Local Storage Quota — saves entire cart state to localStorage
  // on every single state change, potentially filling up storage quota.
  useEffect(() => {
    try {
      localStorage.setItem('cart_backup', JSON.stringify({
        items,
        totalItems,
        promo,
        timestamp: Date.now()
      }));
    } catch {
      // BUG-090: silently swallows quota exceeded errors
    }
  }, [items, totalItems, promo]);

  const addToCart = useCallback(async (product: Product, qty: number) => {
    // BUG-091: Stale Cache — cache product on first add, use cached version thereafter.
    // If the product's price was updated, the stale cached price is used.
    if (!productCache.has(product.id)) {
      productCache.set(product.id, product);
    }
    const cachedProduct = productCache.get(product.id)!;

    // BUG-084: Race Condition on Quantity — artificial delay causes stale closure reads.
    // Rapid clicks will read the same `items` value from the closure.
    await new Promise(r => setTimeout(r, 200));

    // Level 3 BUG: Boundary Value Analysis
    // Fails to block qty = 0 or negative quantities.

    // BUG-084: Uses closure `items` (stale) instead of callback `prev` to check existence.
    const existing = items.find(i => i.id === cachedProduct.id);

    setItems(prev => {
      if (existing) {
        return prev.map(i => i.id === cachedProduct.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...cachedProduct, quantity: qty }];
    });

    // We correctly update total items here...
    setTotalItems(prev => prev + qty);
  }, [items]);

  const removeFromCart = (id: string) => {
    // BUG-058: Cannot Remove Last Cart Item — prevents removing the last item
    // (unless it's PROD-001 which has its own separate bug below).
    if (items.length <= 1 && id !== 'PROD-001') {
      return;
    }

    // Level 7 BUG: Data Integrity
    // If you try to remove PROD-001, it accidentally removes the FIRST item in the array instead!
    setItems(prev => {
      if (id === 'PROD-001') {
        const newArr = [...prev];
        newArr.shift(); // Bug!
        return newArr;
      }
      return prev.filter(i => i.id !== id);
    });
    
    // BUG-025: Cart Stale State (Removal)
    // We intentionally forget to call setTotalItems when an item is removed.
    // The totalItems count stays stale after removal.
  };

  const updateQuantity = (id: string, qty: number) => {
    // BUG-031: Data Integrity Cart Update — index-based mutation.
    // Directly mutates the previous array instead of creating a new one,
    // which can cause React to skip re-renders because the reference is the same.
    setItems(prev => {
      const idx = prev.indexOf(prev.find(i => i.id === id)!);
      prev[idx] = { ...prev[idx], quantity: qty };
      return prev; // returns same array reference — React may not re-render
    });
    // We update total items by recounting (this fixes the stale state, making the bug erratic! - Level 5)
    setTotalItems(items.reduce((acc, i) => acc + i.quantity, 0)); 
  };

  const applyPromo = (code: string) => {
    // Level 8 BUG: Regex / Decision Table failure
    // Valid codes are "SAVE20" or "FALL10". 
    // The regex below is flawed, it accepts anything ending in "20" as 20% off.
    if (code.match(/.*20$/)) {
      setPromo('20OFF');
    // BUG-056: Coupon Code Case Sensitivity — FALL10 only matches exact uppercase.
    // 'fall10' or 'Fall10' won't work.
    } else if (code === 'FALL10') {
      setPromo('10OFF');
    // BUG-033: Zero Price Checkout — FLAT50 subtracts $50 flat with no floor clamp.
    // If subtotal is $30, total goes to -$20.
    } else if (code === 'FLAT50') {
      setPromo('50FLAT');
    }
  };

  // BUG-089: Context State Mutated Directly — mergeGuestCart pushes directly
  // into the items array instead of using setItems with spread.
  const mergeGuestCart = () => {
    const guestData = localStorage.getItem('guest_cart');
    if (guestData) {
      try {
        const guestItems = JSON.parse(guestData) as CartItem[];
        // BUG-089: Direct mutation of state array
        guestItems.forEach(gi => {
          items.push(gi);
        });
        setItems([...items]); // spread to trigger re-render, but mutation already happened
      } catch {
        // ignore parse errors
      }
    }
  };

  // Level 10 BUG: Floating point drift
  // Instead of using Math.round, we let JS floating points drift.
  let subtotal = 0;
  items.forEach(i => {
    subtotal += i.price * i.quantity;
  });

  // Level 8 BUG: Complex Logic Error
  // Tax is calculated on the SUBTOTAL *BEFORE* discounts. (Users hate this!)
  const taxRate = 0.08;
  const tax = subtotal * taxRate;

  let discount = 0;
  if (promo === '20OFF') {
    discount = subtotal * 0.20;
  } else if (promo === '10OFF') {
    discount = subtotal * 0.10;
  } else if (promo === '50FLAT') {
    // BUG-033: Flat $50 discount with no Math.max(0, total) guard.
    // Can produce negative totals.
    discount = 50;
  }

  // Level 9 BUG: Security/Session
  // We check localStorage directly to override logic without validation.
  // If user manually sets localStorage.setItem('isAdmin', 'true'), they get 100% discount.
  if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
    discount = subtotal; 
  }

  // BUG-033: No Math.max(0, ...) guard — total can go negative
  const total = subtotal + tax - discount;

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity,
      totalItems, subtotal, discount, tax, total, applyPromo, mergeGuestCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
