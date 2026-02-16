'use client';

import dynamic from 'next/dynamic';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal, type EditingEntry } from '@/components/AddQuoteModal';
import { SaveForeverModal } from '@/components/SaveForeverModal';
import { GuestBanner } from '@/components/GuestBanner';
import { SignInModal } from '@/components/SignInModal';
import { DiaryContainer } from '@/components/DiaryContainer';
import {
  JournalListView,
  JournalTimelineView,
  JournalGridView,
  JournalCalendarView,
  type ViewMode,
} from '@/components/JournalViews';
import { JournalFilters } from '@/components/JournalFilters';
import { JournalViewSwitcher } from '@/components/JournalViewSwitcher';
import { useFavorites } from '@/hooks/useFavorites';
import { useGuestEntries } from '@/hooks/useGuestEntries';
import { useWeb2Journal } from '@/hooks/useWeb2Journal';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSignMessage, useReadContract } from 'wagmi';
import { hexToBytes } from 'viem';
import { deriveKey, decryptEntry, SIGN_MESSAGE, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';
import { loadGuestEntries, saveGuestEntries } from '@/lib/guestStorage';
import { motion } from 'framer-motion';

const UniverseScene = dynamic(() => import('@/components/UniverseScene'), {
  ssr: false,
});

const PAGE_SIZE = 20;

interface DecryptedEntry {
  entry: JournalEntry;
  timestamp: number;
  entryIndex: number | string;
  source: 'guest' | 'web2' | 'web3';
}

function contentKey(entry: JournalEntry) {
  return `${entry.date}|${entry.title}|${entry.description}`;
}

export default function JournalPage() {
  const { theme, toggleTheme } = useTheme();
  const { web2User, jwt, logoutWeb2, isConnected, address } = useAuth();
  const { signMessageAsync } = useSignMessage();

  // -- Guest mode --
  const guest = useGuestEntries();

  // -- Web2 mode --
  const web2 = useWeb2Journal();

  // -- Web3 mode --
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [web3Entries, setWeb3Entries] = useState<DecryptedEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [web3Loading, setWeb3Loading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [web3Error, setWeb3Error] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [saveForeverEntry, setSaveForeverEntry] = useState<{ entryId: string; entry: JournalEntry; sourceMode: 'guest' | 'web2' } | null>(null);
  const [mounted, setMounted] = useState(false);

  const [pendingGuestMigration, setPendingGuestMigration] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const migrationCheckedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Check if guest entries exist when user logs in with Google
  useEffect(() => {
    if (jwt && !migrationCheckedRef.current) {
      migrationCheckedRef.current = true;
      const guestEntries = loadGuestEntries();
      if (guestEntries.length > 0) {
        setPendingGuestMigration(true);
      }
    }
    if (!jwt) {
      migrationCheckedRef.current = false;
      setPendingGuestMigration(false);
    }
  }, [jwt]);

  const handleMigrateGuest = useCallback(async () => {
    if (!jwt) return;
    setIsMigrating(true);
    try {
      const guestEntries = loadGuestEntries();
      for (const ge of guestEntries) {
        await web2.addEntry({ date: ge.date, title: ge.title, description: ge.description });
      }
      saveGuestEntries([]);
      setPendingGuestMigration(false);
    } catch {
      // Silently fail; entries remain in localStorage
    } finally {
      setIsMigrating(false);
    }
  }, [jwt, web2]);

  const handleDismissMigration = useCallback(() => {
    setPendingGuestMigration(false);
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const favoritesKey = useMemo(() => {
    return `merged-${web2User?.userId ?? 'g'}-${address ?? 'w'}`;
  }, [web2User?.userId, address]);

  const { isFavorite, toggleFavorite } = useFavorites(favoritesKey);
  const wrappedIsFavorite = useCallback(
    (id: string | number) => isFavorite(String(id)),
    [isFavorite],
  );
  const wrappedToggleFavorite = useCallback(
    (id: string | number) => toggleFavorite(String(id)),
    [toggleFavorite],
  );

  // -- Web3 blockchain reading --
  const { data: entryCount, refetch: refetchCount } = useReadContract({
    address: ETERNAL_JOURNAL_ADDRESS,
    abi: ETERNAL_JOURNAL_ABI,
    functionName: 'getEntryCount',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
    },
  });

  const lastFetchedRef = useRef<{ address: string; count: number; page: number } | null>(null);
  const manualRefreshRef = useRef(false);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setWeb3Error('');
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKey(signature);
      setEncryptionKey(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error signing';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setWeb3Error('Signature cancelled by user.');
      } else {
        setWeb3Error('Error unlocking: ' + msg.slice(0, 100));
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const fetchPage = useCallback(
    async (page: number, overrideCount?: number, keyOverride?: Uint8Array) => {
      const count =
        overrideCount !== undefined ? overrideCount : Number(entryCount ?? 0);
      const key = keyOverride ?? encryptionKey;
      if (!address || !key || (overrideCount === undefined && entryCount === undefined))
        return;

      if (count === 0) {
        setWeb3Entries([]);
        return;
      }

      const totalPages = Math.ceil(count / PAGE_SIZE);
      const safePage = Math.min(page, Math.max(0, totalPages - 1));
      const pageEndIdx = count - 1 - safePage * PAGE_SIZE;
      const pageStartIdx = Math.max(0, pageEndIdx - PAGE_SIZE + 1);

      setWeb3Loading(true);
      setWeb3Error('');

      try {
        const results = await sepoliaPublicClient.readContract({
          address: ETERNAL_JOURNAL_ADDRESS,
          abi: ETERNAL_JOURNAL_ABI,
          functionName: 'getEntries',
          args: [address as `0x${string}`, BigInt(pageStartIdx), BigInt(pageEndIdx)],
        });

        const batchResults = results as readonly {
          timestamp: bigint;
          ciphertext: `0x${string}`;
        }[];

        const decrypted: DecryptedEntry[] = [];
        for (let i = batchResults.length - 1; i >= 0; i--) {
          const entryIndex = pageStartIdx + i;
          try {
            const { timestamp, ciphertext } = batchResults[i];
            const ciphertextBytes = hexToBytes(ciphertext);
            const entry = decryptEntry(key, ciphertextBytes);
            decrypted.push({ entry, timestamp: Number(timestamp), entryIndex, source: 'web3' });
          } catch {
            console.warn('Could not decrypt an entry');
          }
        }
        setWeb3Entries(decrypted);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setWeb3Error('Error reading entries: ' + msg.slice(0, 100));
      } finally {
        setWeb3Loading(false);
      }
    },
    [address, encryptionKey, entryCount],
  );

  useEffect(() => {
    if (!isConnected || !encryptionKey || !address || entryCount === undefined || web3Loading || manualRefreshRef.current) return;

    const count = Number(entryCount);
    const totalPages = Math.ceil(count / PAGE_SIZE);
    const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));

    if (
      lastFetchedRef.current?.address === address &&
      lastFetchedRef.current?.count === count &&
      lastFetchedRef.current?.page === safePage
    ) {
      return;
    }
    lastFetchedRef.current = { address, count, page: safePage };
    fetchPage(safePage);
  }, [isConnected, encryptionKey, entryCount, address, fetchPage, currentPage, web3Loading]);

  useEffect(() => {
    setEncryptionKey(null);
    setWeb3Entries([]);
    setWeb3Error('');
    setCurrentPage(0);
    lastFetchedRef.current = null;
  }, [address]);

  // -- Merge entries from all active sources with reconciliation --
  const entries: DecryptedEntry[] = useMemo(() => {
    const guestItems: DecryptedEntry[] = !jwt
      ? guest.entries.map((e) => ({
          entry: { date: e.date, title: e.title, description: e.description },
          timestamp: e.timestamp,
          entryIndex: `guest-${e.id}`,
          source: 'guest' as const,
        }))
      : [];

    const web2Items: DecryptedEntry[] = jwt
      ? web2.entries.map((e) => ({
          entry: { date: e.date, title: e.title, description: e.description },
          timestamp: e.timestamp,
          entryIndex: `web2-${e.id}`,
          source: 'web2' as const,
        }))
      : [];

    const web3Items: DecryptedEntry[] = web3Entries.map((e) => ({
      ...e,
      entryIndex: `web3-${e.entryIndex}`,
      source: 'web3' as const,
    }));

    if (web2Items.length === 0 || web3Items.length === 0) {
      return [...web3Items, ...web2Items, ...guestItems].sort((a, b) => b.timestamp - a.timestamp);
    }
    const web3ContentSet = new Set(web3Items.map((e) => contentKey(e.entry)));
    const web2Filtered = web2Items.filter((e) => !web3ContentSet.has(contentKey(e.entry)));
    return [...web3Items, ...web2Filtered, ...guestItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [jwt, guest.entries, web2.entries, web3Entries]);

  const isLoading = useMemo(() => {
    return guest.isLoading || web2.isLoading || web3Loading;
  }, [guest.isLoading, web2.isLoading, web3Loading]);

  const error = useMemo(() => {
    return web2.error || web3Error;
  }, [web2.error, web3Error]);

  const totalCount = useMemo(() => {
    return entries.length;
  }, [entries.length]);

  const web3TotalPages = Math.ceil(Number(entryCount ?? 0) / PAGE_SIZE);
  const hasWeb3Entries = web3Entries.length > 0;
  const editable = true;
  const canSaveForever = !!jwt;

  const canAddEntry = true;

  // -- Modal handlers --
  const handleModalSuccess = useCallback(() => {
    setModalOpen(false);
    setEditingEntry(null);
  }, []);

  const handleGuestAdd = useCallback(
    (data: { date: string; title: string; description: string }) => {
      guest.addEntry(data);
    },
    [guest],
  );

  const handleWeb2Add = useCallback(
    async (data: { date: string; title: string; description: string }) => {
      await web2.addEntry(data);
    },
    [web2],
  );

  const handleGuestUpdate = useCallback(
    (id: number, data: { date: string; title: string; description: string }) => {
      guest.updateEntry(id, data);
    },
    [guest],
  );

  const handleWeb2Update = useCallback(
    async (id: number, data: { date: string; title: string; description: string }) => {
      await web2.updateEntry(id, data);
    },
    [web2],
  );

  const handleEdit = useCallback(
    (entryId: number | string, entry: JournalEntry) => {
      const idStr = String(entryId);
      const id = idStr.includes('-') ? Number(idStr.split('-')[1]) : Number(idStr);
      setEditingEntry({
        id,
        date: entry.date,
        title: entry.title,
        description: entry.description,
      });
      setModalOpen(true);
    },
    [],
  );

  const openAddModal = useCallback(() => {
    setEditingEntry(null);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (entryId: number | string) => {
      if (!confirm('Delete this entry? This cannot be undone.')) return;
      const idStr = String(entryId);
      if (idStr.startsWith('guest-')) {
        guest.removeEntry(Number(idStr.slice(6)));
      } else if (idStr.startsWith('web2-')) {
        web2.deleteEntry(Number(idStr.slice(5)));
      }
    },
    [guest, web2],
  );

  const handleSaveForever = useCallback((entryId: number | string, entry: JournalEntry) => {
    const idStr = String(entryId);
    const sourceMode = idStr.startsWith('web2-') ? 'web2' : 'guest';
    setSaveForeverEntry({ entryId: idStr, entry, sourceMode });
  }, []);

  const handleSaveForeverSuccess = useCallback(
    (keyFromModal?: Uint8Array) => {
      if (!saveForeverEntry) return;
      const id = saveForeverEntry.entryId.includes('-') ? Number(saveForeverEntry.entryId.split('-')[1]) : Number(saveForeverEntry.entryId);
      if (saveForeverEntry.sourceMode === 'guest') {
        guest.removeEntry(id);
      } else {
        web2.deleteEntry(id);
      }
      setSaveForeverEntry(null);
      // Use encryption key from modal if user unlocked there (so we can fetch without re-signing)
      if (keyFromModal) {
        setEncryptionKey(keyFromModal);
      }
      // Refresh web3 entries so the new blockchain entry appears in the list
      lastFetchedRef.current = null;
      manualRefreshRef.current = true;
      const newCount = Number(entryCount ?? 0) + 1;
      setCurrentPage(0);
      fetchPage(0, newCount, keyFromModal).finally(() => {
        if (address) {
          lastFetchedRef.current = { address, count: newCount, page: 0 };
        }
        manualRefreshRef.current = false;
      });
      refetchCount();
    },
    [saveForeverEntry, guest, web2, refetchCount, entryCount, address, fetchPage],
  );

  // -- Filters --
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const match =
          item.entry.title.toLowerCase().includes(q) ||
          item.entry.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom || dateTo) {
        const d = item.entry.date;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      if (favoritesOnly && !isFavorite(String(item.entryIndex))) return false;
      return true;
    });
  }, [entries, searchQuery, dateFrom, dateTo, favoritesOnly, isFavorite]);

  const favoriteCountOnPage = useMemo(
    () => entries.filter((e) => isFavorite(String(e.entryIndex))).length,
    [entries, isFavorite],
  );

  const showUnlockBanner = jwt && isConnected && !encryptionKey;
  const showEntries = true;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] transition-colors relative overflow-hidden">
      {/* 3D universe background */}
      <div className="fixed inset-0 z-0">
        {mounted && <UniverseScene variant="journal" />}
      </div>
      <div
        className="fixed inset-0 z-[1] pointer-events-none dark:hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(255,255,255,0.5) 60%)',
        }}
      />
      <div
        className="fixed inset-0 z-[1] pointer-events-none hidden dark:block"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(15,5,32,0.6) 60%)',
        }}
      />

      {/* Header - responsive */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-violet-950/40 border-b-2 border-violet-200/60 dark:border-violet-700/40 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center gap-2 min-w-0">
          <a href="/" className="flex items-center gap-2 sm:gap-3 font-semibold text-violet-900 dark:text-white text-base sm:text-lg tracking-tight shrink-0 min-w-0">
            <img src="/logo.svg" alt="Eternal Journal" className="h-8 sm:h-9 w-auto shrink-0" />
            <span className="hidden sm:inline truncate">Eternal Journal</span>
          </a>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!jwt && (
              <button
                onClick={() => setSignInModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-violet-700 dark:text-violet-300 bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
              >
                Sign in
              </button>
            )}
            {jwt && web2User && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-200/60 dark:bg-violet-700/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 uppercase shrink-0">
                  {(web2User.name || web2User.email || '?')[0]}
                </div>
                <button
                  onClick={logoutWeb2}
                  className="text-xs text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors whitespace-nowrap"
                >
                  Sign out
                </button>
              </div>
            )}
            <ConnectButton />

            <button
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/40 dark:bg-violet-800/30 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors shrink-0"
              aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>
            {canAddEntry && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={openAddModal}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl glass-button flex items-center justify-center shrink-0"
                aria-label="Add entry"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <div className={`relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 ${showEntries && entries.length > 0 ? 'pb-28 sm:pb-24' : ''}`}>
        {/* Guest banner */}
        {!jwt && <GuestBanner onOpenSignIn={() => setSignInModalOpen(true)} />}

        {/* Migration banner: offer to import guest entries after Google login */}
        {pendingGuestMigration && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-4 py-3 flex items-center gap-3 mb-4 text-sm border-l-4 border-l-amber-400 dark:border-l-amber-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500 dark:text-amber-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <p className="text-violet-700 dark:text-violet-300 flex-1">
              You have entries saved locally. Import them to your account?
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleMigrateGuest}
              disabled={isMigrating}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium glass-button disabled:opacity-50"
            >
              {isMigrating ? 'Importing...' : 'Import'}
            </motion.button>
            <button
              onClick={handleDismissMigration}
              className="shrink-0 p-1 rounded text-violet-400 dark:text-violet-500 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Web3: Google logged in + Wallet connected but not unlocked */}
        {showUnlockBanner && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-4 py-3 flex items-center gap-3 mb-4 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-violet-500 dark:text-violet-400">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-violet-700 dark:text-violet-300 flex-1">
              Unlock your wallet to view blockchain entries and enable &quot;Save forever&quot;.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium glass-button disabled:opacity-50"
            >
              {isUnlocking ? 'Signing...' : 'Unlock'}
            </motion.button>
            {web3Error && (
              <p className="text-xs text-red-500 dark:text-red-400 shrink-0">{web3Error}</p>
            )}
          </motion.div>
        )}

        {/* Loading entries */}
        {showEntries && isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-violet-200/40 dark:bg-violet-800/40 rounded w-1/4 mb-3" />
                <div className="h-6 bg-violet-200/40 dark:bg-violet-800/40 rounded w-3/4 mb-2" />
                <div className="h-4 bg-violet-200/25 dark:bg-violet-800/25 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* No entries yet */}
        {showEntries && !isLoading && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 text-center border-l-4 border-l-violet-400 dark:border-l-violet-500"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 ring-2 ring-violet-200/50 dark:ring-violet-700/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-2">
              Your journal is waiting
            </h3>
            <p className="text-violet-700 dark:text-violet-300 leading-relaxed max-w-sm mx-auto">
              Add your first entry. Your thoughts deserve a place that lasts{isConnected ? ' forever' : ''}.
            </p>
          </motion.div>
        )}

        {/* Entries loaded */}
        {showEntries && !isLoading && entries.length > 0 && (
          <>
            {/* Toolbar: filters + view switcher (outside diary) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
              <div className="flex-1 min-w-0 w-full">
                <JournalFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                  favoritesOnly={favoritesOnly}
                  onFavoritesOnlyChange={setFavoritesOnly}
                  favoriteCount={favoriteCountOnPage}
                />
              </div>
              <div className="shrink-0 pt-0.5">
                <JournalViewSwitcher
                  viewMode={viewMode}
                  onViewModeChange={(v) => {
                    setViewMode(v);
                    if (v !== 'calendar') setSelectedDay(null);
                  }}
                />
              </div>
            </div>

            {/* Diary container */}
            {filteredEntries.length === 0 ? (
              <DiaryContainer entryCount={0}>
                <p className="text-violet-700 dark:text-violet-300 text-center py-6 text-sm">
                  No entries match your filters. Try adjusting search or date range.
                </p>
              </DiaryContainer>
            ) : (
              <DiaryContainer entryCount={filteredEntries.length}>
                {viewMode === 'list' && (
                  <JournalListView
                    entries={filteredEntries}

                    isFavorite={wrappedIsFavorite}
                    onToggleFavorite={wrappedToggleFavorite}
                    viewMode="list"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={canSaveForever}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'timeline' && (
                  <JournalTimelineView
                    entries={filteredEntries}

                    isFavorite={wrappedIsFavorite}
                    onToggleFavorite={wrappedToggleFavorite}
                    viewMode="timeline"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={canSaveForever}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'grid' && (
                  <JournalGridView
                    entries={filteredEntries}

                    isFavorite={wrappedIsFavorite}
                    onToggleFavorite={wrappedToggleFavorite}
                    viewMode="grid"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={canSaveForever}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'calendar' && (
                  <JournalCalendarView
                    entries={filteredEntries}

                    isFavorite={wrappedIsFavorite}
                    onToggleFavorite={wrappedToggleFavorite}
                    viewMode="calendar"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={canSaveForever}
                    onSaveForever={handleSaveForever}
                  />
                )}
              </DiaryContainer>
            )}

            {/* Web3 pagination */}
            {hasWeb3Entries && web3TotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 sm:gap-4 mt-6 sm:mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/40 dark:bg-violet-800/40 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <span className="text-violet-600 dark:text-violet-300 text-xs sm:text-sm tabular-nums min-w-[3rem] sm:min-w-[4rem] text-center">
                  {currentPage + 1} / {web3TotalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(web3TotalPages - 1, p + 1))}
                  disabled={currentPage >= web3TotalPages - 1}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/40 dark:bg-violet-800/40 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {error && showEntries && (
          <p className="mt-4 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* FAB - Add entry */}
      {canAddEntry && showEntries && entries.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAddModal}
          className="fixed z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl glass-button flex items-center justify-center shadow-lg bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
          aria-label="Add entry"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </motion.button>
      )}

      <AddQuoteModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        onSuccess={handleModalSuccess}
        mode={jwt ? 'web2' : 'guest'}
        editEntry={editingEntry}
        onGuestAdd={handleGuestAdd}
        onWeb2Add={handleWeb2Add}
        onGuestUpdate={handleGuestUpdate}
        onWeb2Update={handleWeb2Update}
      />

      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
      />

      <SaveForeverModal
        isOpen={!!saveForeverEntry}
        onClose={() => setSaveForeverEntry(null)}
        onSuccess={handleSaveForeverSuccess}
        entry={saveForeverEntry?.entry ?? null}
        requiresGoogleAuth={!jwt}
        onOpenSignIn={() => { setSaveForeverEntry(null); setSignInModalOpen(true); }}
      />
    </main>
  );
}
