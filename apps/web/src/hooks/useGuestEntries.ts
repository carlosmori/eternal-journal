'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type GuestEntry,
  loadGuestEntries,
  addGuestEntry,
  updateGuestEntry,
  deleteGuestEntry,
} from '@/lib/guestStorage';

export function useGuestEntries() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setEntries(loadGuestEntries());
    setIsLoading(false);
  }, []);

  const addEntry = useCallback((data: { date: string; title: string; description: string }) => {
    const entry = addGuestEntry(data);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateEntry = useCallback(
    (id: number, data: { date: string; title: string; description: string }) => {
      const updated = updateGuestEntry(id, data);
      if (updated) {
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      }
      return updated;
    },
    [],
  );

  const removeEntry = useCallback((id: number) => {
    deleteGuestEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const totalCount = entries.length;

  return { entries, isLoading, addEntry, updateEntry, removeEntry, totalCount };
}
