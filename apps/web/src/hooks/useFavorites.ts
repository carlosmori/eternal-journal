'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'eternal-journal-favorites';

function getKey(userKey: string) {
  return `${STORAGE_KEY}-${userKey.toLowerCase()}`;
}

function loadFavorites(userKey: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getKey(userKey));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFavorites(userKey: string, set: Set<number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(userKey), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

/**
 * useFavorites now accepts a generic userKey:
 * - 'guest' for guest mode
 * - userId for web2
 * - wallet address for web3
 */
export function useFavorites(userKey: string | undefined) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!userKey) {
      setFavorites(new Set());
      return;
    }
    setFavorites(loadFavorites(userKey));
  }, [userKey]);

  const toggleFavorite = useCallback(
    (entryIndex: number) => {
      if (!userKey) return;
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(entryIndex)) {
          next.delete(entryIndex);
        } else {
          next.add(entryIndex);
        }
        saveFavorites(userKey, next);
        return next;
      });
    },
    [userKey],
  );

  const isFavorite = useCallback(
    (entryIndex: number) => favorites.has(entryIndex),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
