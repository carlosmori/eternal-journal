const STORAGE_KEY = 'eternal-journal-guest-entries';

export interface GuestEntry {
  id: number;
  date: string;
  title: string;
  description: string;
  timestamp: number;
}

export function loadGuestEntries(): GuestEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestEntry[];
  } catch {
    return [];
  }
}

export function saveGuestEntries(entries: GuestEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable
  }
}

export function addGuestEntry(data: {
  date: string;
  title: string;
  description: string;
}): GuestEntry {
  const entries = loadGuestEntries();
  const entry: GuestEntry = {
    id: Date.now(),
    date: data.date,
    title: data.title,
    description: data.description,
    timestamp: Math.floor(Date.now() / 1000),
  };
  entries.unshift(entry);
  saveGuestEntries(entries);
  return entry;
}

export function updateGuestEntry(
  id: number,
  data: Partial<{ date: string; title: string; description: string }>,
): GuestEntry | null {
  const entries = loadGuestEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  if (data.date !== undefined) entry.date = data.date;
  if (data.title !== undefined) entry.title = data.title;
  if (data.description !== undefined) entry.description = data.description;
  saveGuestEntries(entries);
  return { ...entry };
}

export function deleteGuestEntry(id: number): void {
  const entries = loadGuestEntries();
  const filtered = entries.filter((e) => e.id !== id);
  saveGuestEntries(filtered);
}
