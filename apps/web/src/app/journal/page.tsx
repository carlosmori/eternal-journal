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

const PAGE_SIZE = 20;

interface DecryptedEntry {
  entry: JournalEntry;
  timestamp: number;
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
    // Optimistic: tx confirmed = count increased by 1 (avoids RPC propagation delay)
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
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-violet-50 to-fuchsia-100 dark:from-violet-950 dark:via-violet-900 dark:to-fuchsia-950 transition-colors">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/40 dark:bg-violet-950/40 border-b border-violet-200/50 dark:border-violet-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-violet-900 dark:text-white font-semibold text-lg">
            Eternal Journal
          </a>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-white/50 dark:bg-violet-800/50 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/70 dark:hover:bg-violet-700/50 transition-colors"
              aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>
            {encryptionKey && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Add entry
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-6">
          My entries
        </h2>

        {!isConnected && (
          <div className="glass-card p-12 text-center text-violet-600 dark:text-violet-400">
            <p className="text-lg mb-2">Connect your wallet to view your journal</p>
            <p className="text-sm opacity-75">
              Use the button above to connect with MetaMask or another wallet
            </p>
          </div>
        )}

        {isConnected && !encryptionKey && (
          <div className="glass-card p-12 text-center">
            <p className="text-violet-700 dark:text-violet-300 text-lg mb-4">
              Your journal is encrypted
            </p>
            <p className="text-violet-500 dark:text-violet-400 text-sm mb-6">
              Sign a message with your wallet to derive your encryption key.
              Only you can read your entries.
            </p>
            <button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {isUnlocking ? 'Signing...' : 'Unlock journal'}
            </button>
            {error && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>
        )}

        {isConnected && encryptionKey && isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-violet-200/50 dark:bg-violet-800/50 rounded w-1/4 mb-3" />
                <div className="h-6 bg-violet-200/50 dark:bg-violet-800/50 rounded w-3/4 mb-2" />
                <div className="h-4 bg-violet-200/30 dark:bg-violet-800/30 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {isConnected && encryptionKey && !isLoading && entries.length === 0 && (
          <div className="glass-card p-12 text-center text-violet-600 dark:text-violet-400">
            No entries yet. Add the first one!
          </div>
        )}

        {isConnected && encryptionKey && !isLoading && entries.length > 0 && (
          <>
            {!allRevealed ? (
              <div
                onClick={() => setAllRevealed(true)}
                className="glass-card p-8 text-center cursor-pointer hover:bg-violet-100/50 dark:hover:bg-violet-800/30 transition-colors rounded-xl mb-4"
              >
                <p className="text-violet-600 dark:text-violet-400 font-medium">
                  Click to reveal all entries
                </p>
              </div>
            ) : null}
            <div className="space-y-4">
              {entries.map((item, idx) => (
                <QuoteCard
                  key={idx}
                  entry={item.entry}
                  timestamp={item.timestamp}
                  revealed={allRevealed}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 rounded-xl bg-violet-200/50 dark:bg-violet-800/50 text-violet-700 dark:text-violet-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-200/70 dark:hover:bg-violet-800/70 transition-colors"
                >
                  Previous
                </button>
                <span className="text-violet-600 dark:text-violet-400 text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 rounded-xl bg-violet-200/50 dark:bg-violet-800/50 text-violet-700 dark:text-violet-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-200/70 dark:hover:bg-violet-800/70 transition-colors"
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
