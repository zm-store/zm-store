import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@zmstore_cart';

export interface CartItem {
  product_id: string;
  name: string;
  image_url?: string;
  unit_price: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: { id: string; name: string; image_url?: string; price: number }, qty?: number) => void;
  setQuantity: (product_id: string, qty: number) => void;
  removeItem: (product_id: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setItems(JSON.parse(raw));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (product: { id: string; name: string; image_url?: string; price: number }, qty = 1) => {
      console.log(`[Cart] addItem: ${product.name} x${qty}`);
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i
          );
        }
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            image_url: product.image_url,
            unit_price: Number(product.price),
            quantity: qty,
          },
        ];
      });
    },
    []
  );

  const setQuantity = useCallback((product_id: string, qty: number) => {
    console.log(`[Cart] setQuantity: ${product_id} → ${qty}`);
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product_id !== product_id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.product_id === product_id ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const removeItem = useCallback((product_id: string) => {
    console.log(`[Cart] removeItem: ${product_id}`);
    setItems((prev) => prev.filter((i) => i.product_id !== product_id));
  }, []);

  const clear = useCallback(() => {
    console.log('[Cart] clear');
    setItems([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, setQuantity, removeItem, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
