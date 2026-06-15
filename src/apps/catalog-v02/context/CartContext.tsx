/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
}

const CartContext = createContext<CartState | undefined>(undefined);

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

  const addToCart = (product: Product, qty: number) => {
    // Level 3 BUG: Boundary Value Analysis
    // Fails to block qty = 0 or negative quantities.
    
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...product, quantity: qty }];
    });

    // We correctly update total items here...
    setTotalItems(prev => prev + qty);
  };

  const removeFromCart = (id: string) => {
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
    
    // Level 5 BUG: Stale State
    // We intentionally forget to update totalItems when an item is removed.
  };

  const updateQuantity = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    // We update total items by recounting (this fixes the stale state, making the bug erratic! - Level 5)
    setTotalItems(items.reduce((acc, i) => acc + i.quantity, 0)); 
  };

  const applyPromo = (code: string) => {
    // Level 8 BUG: Regex / Decision Table failure
    // Valid codes are "SAVE20" or "FALL10". 
    // The regex below is flawed, it accepts anything ending in "20" as 20% off.
    if (code.match(/.*20$/)) {
      setPromo('20OFF');
    } else if (code === 'FALL10') {
      setPromo('10OFF');
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
  }

  // Level 9 BUG: Security/Session
  // We check localStorage directly to override logic without validation.
  // If user manually sets localStorage.setItem('isAdmin', 'true'), they get 100% discount.
  if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
    discount = subtotal; 
  }

  const total = subtotal + tax - discount;

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity,
      totalItems, subtotal, discount, tax, total, applyPromo
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
