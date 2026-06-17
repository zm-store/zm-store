import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wishlist_ids';

interface WishlistContextValue {
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  clearAll: () => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  favoriteIds: new Set(),
  isFavorite: () => false,
  toggleFavorite: () => {},
  clearAll: () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          setFavoriteIds(new Set(ids));
        }
      })
      .catch((e) => console.error('[Wishlist] Failed to load from storage:', e));
  }, []);

  const persist = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids))).catch((e) =>
      console.error('[Wishlist] Failed to persist:', e)
    );
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          console.log(`[Wishlist] Removed from wishlist: ${id}`);
          next.delete(id);
        } else {
          console.log(`[Wishlist] Added to wishlist: ${id}`);
          next.add(id);
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearAll = useCallback(() => {
    console.log('[Wishlist] Cleared all favorites');
    const empty = new Set<string>();
    setFavoriteIds(empty);
    persist(empty);
  }, [persist]);

  return (
    <WishlistContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, clearAll }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  return useContext(WishlistContext);
}
