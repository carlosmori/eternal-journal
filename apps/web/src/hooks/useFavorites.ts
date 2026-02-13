'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'eternal-journal-favorites';

function getKey(address: string) {
  return `${STORAGE_KEY}-${address.toLowerCase()}`;
}

function loadFavorites(address: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getKey(address));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFavorites(address: string, set: Set<number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(address), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function useFavorites(address: string | undefined) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!address) {
      setFavorites(new Set());
      return;
    }
    setFavorites(loadFavorites(address));
  }, [address]);

  const toggleFavorite = useCallback((entryIndex: number) => {
    if (!address) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(entryIndex)) {
        next.delete(entryIndex);
      } else {
        next.add(entryIndex);
      }
      saveFavorites(address, next);
      return next;
    });
  }, [address]);

  const isFavorite = useCallback(
    (entryIndex: number) => favorites.has(entryIndex),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
