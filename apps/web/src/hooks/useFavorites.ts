'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'eternal-journal-favorites';

function getKey(userKey: string) {
  return `${STORAGE_KEY}-${userKey}`;
}

function loadFavorites(userKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getKey(userKey));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFavorites(userKey: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(userKey), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

/**
 * useFavorites accepts a userKey and supports string entry ids (e.g. "web2-123", "web3-5", "guest-456")
 * for merged Web2+Web3 views.
 */
export function useFavorites(userKey: string | undefined) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userKey) {
      setFavorites(new Set());
      return;
    }
    setFavorites(loadFavorites(userKey));
  }, [userKey]);

  const toggleFavorite = useCallback(
    (entryId: string) => {
      if (!userKey) return;
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(entryId)) {
          next.delete(entryId);
        } else {
          next.add(entryId);
        }
        saveFavorites(userKey, next);
        return next;
      });
    },
    [userKey],
  );

  const isFavorite = useCallback((entryId: string) => favorites.has(entryId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
