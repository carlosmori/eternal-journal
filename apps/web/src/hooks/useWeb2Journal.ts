'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Web2Entry {
  id: number;
  date: string;
  title: string;
  description: string;
  timestamp: number;
}

export function useWeb2Journal() {
  const { jwt } = useAuth();
  const [entries, setEntries] = useState<Web2Entry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!jwt) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/journal`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data: Web2Entry[] = await res.json();
      setEntries(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [jwt]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = useCallback(
    async (data: { date: string; title: string; description: string }) => {
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/journal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create entry');
      const entry: Web2Entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [jwt],
  );

  const updateEntry = useCallback(
    async (id: number, data: { date: string; title: string; description: string }) => {
      if (!jwt) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/journal/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update entry');
      const updated: Web2Entry = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [jwt],
  );

  const deleteEntry = useCallback(
    async (id: number) => {
      if (!jwt) return;
      await fetch(`${API_URL}/journal/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [jwt],
  );

  const totalCount = entries.length;

  return { entries, isLoading, error, addEntry, updateEntry, deleteEntry, totalCount, refetch: fetchEntries };
}
