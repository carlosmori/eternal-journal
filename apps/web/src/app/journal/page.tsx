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
import { useAccount, useSignMessage, useReadContract } from 'wagmi';
import { hexToBytes } from 'viem';
import { deriveKey, decryptEntry, SIGN_MESSAGE, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';
import { motion } from 'framer-motion';

const UniverseScene = dynamic(() => import('@/components/UniverseScene'), {
  ssr: false,
});

const PAGE_SIZE = 20;

interface DecryptedEntry {
  entry: JournalEntry;
  timestamp: number;
  entryIndex: number;
}

export default function JournalPage() {
  const { theme, toggleTheme } = useTheme();
  const { authMode, web2User, logoutWeb2, setAuthMode } = useAuth();
  const { address, isConnected } = useAccount();
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

  const [allRevealed, setAllRevealed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [saveForeverEntry, setSaveForeverEntry] = useState<{ id: number; entry: JournalEntry; sourceMode: 'guest' | 'web2' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const favoritesKey = useMemo(() => {
    if (authMode === 'web3') return address;
    if (authMode === 'web2') return web2User?.userId;
    return 'guest';
  }, [authMode, address, web2User]);

  const { isFavorite, toggleFavorite } = useFavorites(favoritesKey);

  // -- Web3 blockchain reading --
  const { data: entryCount, refetch: refetchCount } = useReadContract({
    address: ETERNAL_JOURNAL_ADDRESS,
    abi: ETERNAL_JOURNAL_ABI,
    functionName: 'getEntryCount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && authMode === 'web3',
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
    async (page: number, overrideCount?: number) => {
      const count =
        overrideCount !== undefined ? overrideCount : Number(entryCount ?? 0);
      if (!address || !encryptionKey || (overrideCount === undefined && entryCount === undefined))
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
          args: [address, BigInt(pageStartIdx), BigInt(pageEndIdx)],
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
            const entry = decryptEntry(encryptionKey, ciphertextBytes);
            decrypted.push({ entry, timestamp: Number(timestamp), entryIndex });
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
    if (authMode !== 'web3') return;
    if (!encryptionKey || !address || entryCount === undefined || web3Loading || manualRefreshRef.current) return;

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
  }, [authMode, encryptionKey, entryCount, address, fetchPage, currentPage, web3Loading]);

  useEffect(() => {
    setEncryptionKey(null);
    setWeb3Entries([]);
    setWeb3Error('');
    setCurrentPage(0);
    setAllRevealed(false);
    lastFetchedRef.current = null;
  }, [address]);

  const handleWeb3QuoteAdded = useCallback(() => {
    setModalOpen(false);
    setEditingEntry(null);
    lastFetchedRef.current = null;
    manualRefreshRef.current = true;
    const newCount = Number(entryCount ?? 0) + 1;
    setCurrentPage(0);
    fetchPage(0, newCount).finally(() => {
      if (address) {
        lastFetchedRef.current = { address, count: newCount, page: 0 };
      }
      manualRefreshRef.current = false;
    });
    refetchCount();
  }, [address, entryCount, refetchCount, fetchPage]);

  // -- Unified entries for all modes --
  const entries: DecryptedEntry[] = useMemo(() => {
    if (authMode === 'guest') {
      return guest.entries.map((e) => ({
        entry: { date: e.date, title: e.title, description: e.description },
        timestamp: e.timestamp,
        entryIndex: e.id,
      }));
    }
    if (authMode === 'web2') {
      return web2.entries.map((e) => ({
        entry: { date: e.date, title: e.title, description: e.description },
        timestamp: e.timestamp,
        entryIndex: e.id,
      }));
    }
    return web3Entries;
  }, [authMode, guest.entries, web2.entries, web3Entries]);

  const isLoading = useMemo(() => {
    if (authMode === 'guest') return guest.isLoading;
    if (authMode === 'web2') return web2.isLoading;
    return web3Loading;
  }, [authMode, guest.isLoading, web2.isLoading, web3Loading]);

  const error = useMemo(() => {
    if (authMode === 'web2') return web2.error;
    if (authMode === 'web3') return web3Error;
    return '';
  }, [authMode, web2.error, web3Error]);

  const totalCount = useMemo(() => {
    if (authMode === 'guest') return guest.totalCount;
    if (authMode === 'web2') return web2.totalCount;
    return Number(entryCount ?? 0);
  }, [authMode, guest.totalCount, web2.totalCount, entryCount]);

  const web3TotalPages = Math.ceil(Number(entryCount ?? 0) / PAGE_SIZE);
  const revealed = authMode === 'web3' ? allRevealed : true;
  const editable = authMode !== 'web3';

  const canAddEntry =
    authMode === 'guest' ||
    (authMode === 'web2' && !!web2User) ||
    (authMode === 'web3' && !!encryptionKey);

  // -- Modal handlers --
  const handleModalSuccess = useCallback(() => {
    if (authMode === 'web3') {
      handleWeb3QuoteAdded();
    } else {
      setModalOpen(false);
      setEditingEntry(null);
    }
  }, [authMode, handleWeb3QuoteAdded]);

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
    (entryIndex: number, entry: JournalEntry) => {
      setEditingEntry({
        id: entryIndex,
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
    (entryIndex: number) => {
      if (!confirm('Delete this entry? This cannot be undone.')) return;
      if (authMode === 'guest') {
        guest.removeEntry(entryIndex);
      } else if (authMode === 'web2') {
        web2.deleteEntry(entryIndex);
      }
    },
    [authMode, guest, web2],
  );

  const handleSaveForever = useCallback((entryIndex: number, entry: JournalEntry) => {
    setSaveForeverEntry({ id: entryIndex, entry, sourceMode: authMode === 'web2' ? 'web2' : 'guest' });
  }, [authMode]);

  const handleSaveForeverSuccess = useCallback(() => {
    if (!saveForeverEntry) return;
    if (saveForeverEntry.sourceMode === 'guest') {
      guest.removeEntry(saveForeverEntry.id);
    } else {
      web2.deleteEntry(saveForeverEntry.id);
    }
    setSaveForeverEntry(null);
    refetchCount();
  }, [saveForeverEntry, guest, web2, refetchCount]);

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
      if (favoritesOnly && !isFavorite(item.entryIndex)) return false;
      return true;
    });
  }, [entries, searchQuery, dateFrom, dateTo, favoritesOnly, isFavorite]);

  const favoriteCountOnPage = useMemo(
    () => entries.filter((e) => isFavorite(e.entryIndex)).length,
    [entries, isFavorite],
  );

  const showWeb3Connect = authMode === 'web3' && !isConnected;
  const showWeb3Unlock = authMode === 'web3' && isConnected && !encryptionKey;
  const showEntries = !showWeb3Connect && !showWeb3Unlock;

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

      {/* Header - simplified */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-violet-950/40 border-b-2 border-violet-200/60 dark:border-violet-700/40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 font-semibold text-violet-900 dark:text-white text-lg tracking-tight">
            <img src="/logo.svg" alt="Eternal Journal" className="h-9 w-auto" />
            Eternal Journal
          </a>
          <div className="flex items-center gap-2">
            {/* Auth area: unified */}
            {authMode === 'guest' && (
              <button
                onClick={() => setSignInModalOpen(true)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-violet-700 dark:text-violet-300 bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
              >
                Sign in
              </button>
            )}
            {authMode === 'web2' && web2User && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-200/60 dark:bg-violet-700/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 uppercase">
                  {(web2User.name || web2User.email || '?')[0]}
                </div>
                <button
                  onClick={logoutWeb2}
                  className="text-xs text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
            {authMode === 'web3' && <ConnectButton />}

            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-white/40 dark:bg-violet-800/30 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
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
                className="w-9 h-9 rounded-xl glass-button flex items-center justify-center"
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

      <div className={`relative z-10 max-w-4xl mx-auto px-4 py-8 ${showEntries && entries.length > 0 ? 'pb-24' : ''}`}>
        {/* Guest banner */}
        {authMode === 'guest' && <GuestBanner onOpenSignIn={() => setSignInModalOpen(true)} />}

        {/* Web3: Not connected */}
        {showWeb3Connect && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 text-center border-l-4 border-l-violet-400 dark:border-l-violet-500"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 ring-2 ring-violet-200/50 dark:ring-violet-700/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-4" />
                <circle cx="18" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-2">
              Your journal awaits
            </h3>
            <p className="text-violet-700 dark:text-violet-300 leading-relaxed max-w-sm mx-auto mb-4">
              Connect your wallet above to open your private blockchain journal.
            </p>
            <button
              onClick={() => setAuthMode('guest')}
              className="text-sm text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors underline underline-offset-2"
            >
              Or continue as guest
            </button>
          </motion.div>
        )}

        {/* Web3: Connected but locked */}
        {showWeb3Unlock && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 text-center border-l-4 border-l-violet-400 dark:border-l-violet-500"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 ring-2 ring-violet-200/50 dark:ring-violet-700/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-2">
              Your journal is kept safe
            </h3>
            <p className="text-violet-700 dark:text-violet-300 leading-relaxed max-w-sm mx-auto mb-6">
              Sign once with your wallet to unlock. Your signature proves it&apos;s you — only you can ever read what you write.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="glass-button px-8 py-3 disabled:opacity-50"
            >
              {isUnlocking ? 'Signing...' : 'Unlock journal'}
            </motion.button>
            {web3Error && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">{web3Error}</p>
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
              Add your first entry. Your thoughts deserve a place that lasts{authMode === 'web3' ? ' forever' : ''}.
            </p>
          </motion.div>
        )}

        {/* Entries loaded */}
        {showEntries && !isLoading && entries.length > 0 && (
          <>
            {authMode === 'web3' && !allRevealed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setAllRevealed(true)}
                className="glass-card p-4 text-center cursor-pointer hover:bg-violet-100/30 dark:hover:bg-violet-800/20 transition-colors mb-4 border-l-4 border-l-violet-400 dark:border-l-violet-500"
              >
                <p className="text-violet-700 dark:text-violet-300 font-medium text-sm">
                  Click to reveal all entries
                </p>
              </motion.div>
            )}

            {/* Toolbar: filters + view switcher (outside diary) */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1 min-w-0">
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
                    revealed={revealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="list"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={editable}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'timeline' && (
                  <JournalTimelineView
                    entries={filteredEntries}
                    revealed={revealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="timeline"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={editable}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'grid' && (
                  <JournalGridView
                    entries={filteredEntries}
                    revealed={revealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="grid"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={editable}
                    onSaveForever={handleSaveForever}
                  />
                )}
                {viewMode === 'calendar' && (
                  <JournalCalendarView
                    entries={filteredEntries}
                    revealed={revealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="calendar"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                    editable={editable}
                    onEdit={handleEdit}
                    canDelete={editable}
                    onDelete={handleDelete}
                    canSaveForever={editable}
                    onSaveForever={handleSaveForever}
                  />
                )}
              </DiaryContainer>
            )}

            {/* Web3 pagination */}
            {authMode === 'web3' && web3TotalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/40 dark:bg-violet-800/40 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Previous
                </button>
                <span className="text-violet-600 dark:text-violet-300 text-sm tabular-nums min-w-[4rem] text-center">
                  {currentPage + 1} / {web3TotalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(web3TotalPages - 1, p + 1))}
                  disabled={currentPage >= web3TotalPages - 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/40 dark:bg-violet-800/40 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
                >
                  Next
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
          className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-2xl glass-button flex items-center justify-center shadow-lg"
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
        mode={authMode}
        encryptionKey={encryptionKey}
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
      />
    </main>
  );
}
