'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SharedMapping {
  sourceEntryId: string;
  quoteId: string;
}

export function useSharedQuotes() {
  const { jwt } = useAuth();
  const [sharedMap, setSharedMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchMine = useCallback(async () => {
    if (!jwt) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/shared-quotes/mine`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data: { shared: SharedMapping[] } = await res.json();
      const map = new Map<string, string>();
      for (const s of data.shared) {
        map.set(s.sourceEntryId, s.quoteId);
      }
      setSharedMap(map);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [jwt]);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const shareEntry = useCallback(
    async (text: string, sourceEntryId?: string) => {
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/shared-quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ text, sourceEntryId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to share');
      }
      const result: { id: string; status: string } = await res.json();
      if (sourceEntryId) {
        setSharedMap((prev) => new Map([...prev, [sourceEntryId, result.id]]));
      }
    },
    [jwt],
  );

  const unshareEntry = useCallback(
    async (sourceEntryId: string) => {
      if (!jwt) return;
      const quoteId = sharedMap.get(sourceEntryId);
      if (!quoteId) return;
      await fetch(`${API_URL}/shared-quotes/${quoteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setSharedMap((prev) => {
        const next = new Map(prev);
        next.delete(sourceEntryId);
        return next;
      });
    },
    [jwt, sharedMap],
  );

  const isShared = useCallback(
    (sourceEntryId: string) => sharedMap.has(sourceEntryId),
    [sharedMap],
  );

  return { sharedMap, isShared, shareEntry, unshareEntry, isLoading, refetch: fetchMine };
}
