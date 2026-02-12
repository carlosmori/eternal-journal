'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal } from '@/components/AddQuoteModal';
import { QuoteCard } from '@/components/QuoteCard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage, useReadContract } from 'wagmi';
import { hexToBytes } from 'viem';
import { deriveKey, decryptEntry, SIGN_MESSAGE, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';
import { motion } from 'framer-motion';

const PAGE_SIZE = 20;

interface DecryptedEntry {
  entry: JournalEntry;
  timestamp: number;
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

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
      const startIdx = Math.max(0, count - 1 - safePage * PAGE_SIZE);
      const endIdx = Math.max(0, count - 1 - (safePage + 1) * PAGE_SIZE + 1);

      setIsLoading(true);
      setError('');

      try {
        const decrypted: DecryptedEntry[] = [];
        const batchSize = 10;

        for (let i = startIdx; i >= endIdx; i -= batchSize) {
          const batch = [];
          for (let j = i; j > Math.max(endIdx - 1, i - batchSize); j--) {
            batch.push(
              sepoliaPublicClient.readContract({
                address: ETERNAL_JOURNAL_ADDRESS,
                abi: ETERNAL_JOURNAL_ABI,
                functionName: 'getEntry',
                args: [address, BigInt(j)],
              })
            );
          }

          const results = await Promise.all(batch);

          for (const result of results) {
            try {
              const { timestamp, ciphertext } = result as {
                timestamp: bigint;
                ciphertext: `0x${string}`;
              };
              const ciphertextBytes = hexToBytes(ciphertext);
              const entry = decryptEntry(encryptionKey, ciphertextBytes);
              decrypted.push({
                entry,
                timestamp: Number(timestamp),
              });
            } catch {
              console.warn('Could not decrypt an entry');
            }
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] transition-colors">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed top-1/3 -left-40 w-80 h-80 rounded-full blur-3xl bg-violet-400/15 dark:bg-violet-600/10" aria-hidden />
      <div className="pointer-events-none fixed bottom-1/3 -right-40 w-80 h-80 rounded-full blur-3xl bg-fuchsia-400/15 dark:bg-fuchsia-600/10" aria-hidden />

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/40 dark:bg-violet-950/30 border-b border-white/20 dark:border-violet-800/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-6">
          Your entries
        </h2>

        {/* State: Not connected */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-violet-500/15 dark:bg-violet-400/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-4" />
                <circle cx="18" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>
            <p className="text-lg text-violet-800 dark:text-violet-200 mb-2">Connect your wallet to open your journal</p>
            <p className="text-sm text-violet-600 dark:text-violet-300">
              Use the button above to connect with MetaMask or another wallet
            </p>
          </motion.div>
        )}

        {/* State: Connected but locked */}
        {isConnected && !encryptionKey && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-violet-500/15 dark:bg-violet-400/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-violet-800 dark:text-violet-200 text-lg mb-2">
              Your journal is kept safe
            </p>
            <p className="text-violet-600 dark:text-violet-300 text-sm mb-6">
              Sign once with your wallet to unlock. Only you can ever read what you write.
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
            className="glass-card p-12 text-center"
          >
            <p className="text-lg text-violet-800 dark:text-violet-200 mb-1">Your journal is waiting</p>
            <p className="text-sm text-violet-600 dark:text-violet-300">
              Add your first entry above. Your thoughts deserve to be written down.
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
                className="glass-card p-6 text-center cursor-pointer hover:bg-violet-100/30 dark:hover:bg-violet-800/20 transition-colors mb-4"
              >
                <p className="text-violet-700 dark:text-violet-300 font-medium text-sm">
                  Click to reveal all entries
                </p>
              </motion.div>
            )}

            <motion.div
              className="space-y-4"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {entries.map((item, idx) => (
                <motion.div key={idx} variants={staggerItem}>
                  <QuoteCard
                    entry={item.entry}
                    timestamp={item.timestamp}
                    revealed={allRevealed}
                  />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-5 py-2.5 rounded-xl bg-white/30 dark:bg-violet-800/30 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 dark:hover:bg-violet-800/50 transition-colors border border-white/20 dark:border-violet-700/20"
                >
                  Previous
                </button>
                <span className="text-violet-600 dark:text-violet-300 text-sm tabular-nums">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-5 py-2.5 rounded-xl bg-white/30 dark:bg-violet-800/30 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 dark:hover:bg-violet-800/50 transition-colors border border-white/20 dark:border-violet-700/20"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {error && encryptionKey && (
          <p className="mt-4 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      <AddQuoteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleQuoteAdded}
        encryptionKey={encryptionKey}
      />
    </main>
  );
}
