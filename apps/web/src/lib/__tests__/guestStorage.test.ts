import {
  loadGuestEntries,
  addGuestEntry,
  updateGuestEntry,
  deleteGuestEntry,
} from '../guestStorage';

const mockStorage: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
    },
    writable: true,
  });
});

beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
});

describe('guestStorage', () => {
  it('loadGuestEntries returns empty array when nothing stored', () => {
    expect(loadGuestEntries()).toEqual([]);
  });

  it('addGuestEntry persists and can be loaded back', () => {
    const entry = addGuestEntry({ date: '2026-01-01', title: 'Hello', description: 'World' });

    expect(entry.title).toBe('Hello');
    expect(entry.id).toBeGreaterThan(0);

    const loaded = loadGuestEntries();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Hello');
  });

  it('updateGuestEntry merges partial data preserving other fields', () => {
    const entry = addGuestEntry({ date: '2026-01-01', title: 'Original', description: 'Desc' });
    const updated = updateGuestEntry(entry.id, { title: 'Updated' });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
    expect(updated!.description).toBe('Desc');
    expect(updated!.date).toBe('2026-01-01');
  });

  it('deleteGuestEntry removes only the target entry', () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now++);

    const a = addGuestEntry({ date: '2026-01-01', title: 'A', description: 'a' });
    const b = addGuestEntry({ date: '2026-01-02', title: 'B', description: 'b' });

    expect(a.id).not.toBe(b.id);

    deleteGuestEntry(a.id);

    const remaining = loadGuestEntries();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);

    jest.restoreAllMocks();
  });
});
