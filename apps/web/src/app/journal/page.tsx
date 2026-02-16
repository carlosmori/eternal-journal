'use client';

import dynamic from 'next/dynamic';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal } from '@/components/AddQuoteModal';
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
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { isFavorite, toggleFavorite } = useFavorites(address);

  const { data: entryCount, refetch: refetchCount } = useReadContract({
    address: ETERNAL_JOURNAL_ADDRESS,
    abi: ETERNAL_JOURNAL_ABI,
    functionName: 'getEntryCount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: false,
    },
  });

  const lastFetchedRef = useRef<{ address: string; count: number; page: number } | null>(null);
  const manualRefreshRef = useRef(false);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError('');
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKey(signature);
      setEncryptionKey(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error signing';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Signature cancelled by user.');
      } else {
        setError('Error unlocking: ' + msg.slice(0, 100));
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
        setEntries([]);
        return;
      }

      const totalPages = Math.ceil(count / PAGE_SIZE);
      const safePage = Math.min(page, Math.max(0, totalPages - 1));

      // Calculate the range for this page (newest first).
      // Page 0 = newest entries, page N = oldest entries.
      // getEntries(user, start, end) returns entries[start..end] inclusive, ascending.
      const pageEndIdx = count - 1 - safePage * PAGE_SIZE;
      const pageStartIdx = Math.max(0, pageEndIdx - PAGE_SIZE + 1);

      setIsLoading(true);
      setError('');

      try {
        // Single batch call instead of N individual getEntry calls
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

        // Results come in ascending order (start..end), reverse for newest-first display
        for (let i = batchResults.length - 1; i >= 0; i--) {
          const entryIndex = pageStartIdx + i;
          try {
            const { timestamp, ciphertext } = batchResults[i];
            const ciphertextBytes = hexToBytes(ciphertext);
            const entry = decryptEntry(encryptionKey, ciphertextBytes);
            decrypted.push({
              entry,
              timestamp: Number(timestamp),
              entryIndex,
            });
          } catch {
            console.warn('Could not decrypt an entry');
          }
        }

        setEntries(decrypted);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError('Error reading entries: ' + msg.slice(0, 100));
      } finally {
        setIsLoading(false);
      }
    },
    [address, encryptionKey, entryCount],
  );

  useEffect(() => {
    if (!encryptionKey || !address || entryCount === undefined || isLoading || manualRefreshRef.current) return;

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
  }, [encryptionKey, entryCount, address, fetchPage, currentPage, isLoading]);

  useEffect(() => {
    setEncryptionKey(null);
    setEntries([]);
    setError('');
    setCurrentPage(0);
    setAllRevealed(false);
    lastFetchedRef.current = null;
  }, [address]);

  const handleQuoteAdded = useCallback(() => {
    setModalOpen(false);
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

  const totalCount = Number(entryCount ?? 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] transition-colors relative overflow-hidden">
      {/* 3D universe background */}
      <div className="fixed inset-0 z-0">
        {mounted && <UniverseScene variant="journal" />}
      </div>
      {/* Gradient overlay for content readability */}
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

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-violet-950/40 border-b-2 border-violet-200/60 dark:border-violet-700/40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 font-semibold text-violet-900 dark:text-white text-lg tracking-tight">
            <img src="/logo.svg" alt="Eternal Journal" className="h-9 w-auto" />
            Eternal Journal
          </a>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-white/40 dark:bg-violet-800/30 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
              aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>
            {encryptionKey && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 glass-button text-sm"
              >
                Add entry
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <div className={`relative z-10 max-w-4xl mx-auto px-4 py-8 ${isConnected && encryptionKey && entries.length > 0 ? 'pb-24' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-violet-900 dark:text-violet-100">
            Your entries
          </h2>
          {entries.length > 0 && (
            <JournalViewSwitcher
              viewMode={viewMode}
              onViewModeChange={(v) => {
                setViewMode(v);
                if (v !== 'calendar') setSelectedDay(null);
              }}
            />
          )}
        </div>

        {/* State: Not connected */}
        {!isConnected && (
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
            <p className="text-violet-700 dark:text-violet-300 leading-relaxed max-w-sm mx-auto">
              Connect your wallet above to open your private journal. MetaMask, WalletConnect, or any compatible wallet works.
            </p>
          </motion.div>
        )}

        {/* State: Connected but locked */}
        {isConnected && !encryptionKey && (
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
            {error && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </motion.div>
        )}

        {/* State: Loading entries */}
        {isConnected && encryptionKey && isLoading && (
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

        {/* State: No entries yet */}
        {isConnected && encryptionKey && !isLoading && entries.length === 0 && (
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
              Add your first entry above. Your thoughts deserve a place that lasts forever.
            </p>
          </motion.div>
        )}

        {/* State: Entries loaded */}
        {isConnected && encryptionKey && !isLoading && entries.length > 0 && (
          <>
            {!allRevealed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setAllRevealed(true)}
                className="glass-card p-6 text-center cursor-pointer hover:bg-violet-100/30 dark:hover:bg-violet-800/20 transition-colors mb-4 border-l-4 border-l-violet-400 dark:border-l-violet-500"
              >
                <p className="text-violet-700 dark:text-violet-300 font-medium text-sm">
                  Click to reveal all entries
                </p>
              </motion.div>
            )}

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

            {filteredEntries.length === 0 ? (
              <div className="glass-card p-8 text-center border-l-4 border-l-violet-400 dark:border-l-violet-500">
                <p className="text-violet-700 dark:text-violet-300">
                  No entries match your filters. Try adjusting search or date range.
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'list' && (
                  <JournalListView
                    entries={filteredEntries}
                    revealed={allRevealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="list"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                  />
                )}
                {viewMode === 'timeline' && (
                  <JournalTimelineView
                    entries={filteredEntries}
                    revealed={allRevealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="timeline"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                  />
                )}
                {viewMode === 'grid' && (
                  <JournalGridView
                    entries={filteredEntries}
                    revealed={allRevealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="grid"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                  />
                )}
                {viewMode === 'calendar' && (
                  <JournalCalendarView
                    entries={filteredEntries}
                    revealed={allRevealed}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    viewMode="calendar"
                    onDaySelect={setSelectedDay}
                    selectedDay={selectedDay}
                  />
                )}
              </>
            )}

            {totalPages > 1 && (
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
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
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

        {error && encryptionKey && (
          <p className="mt-4 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* FAB - Add entry (when viewing entries) */}
      {isConnected && encryptionKey && entries.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
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
        onClose={() => setModalOpen(false)}
        onSuccess={handleQuoteAdded}
        encryptionKey={encryptionKey}
      />
    </main>
  );
}
