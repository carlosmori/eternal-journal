'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal } from '@/components/AddQuoteModal';
import { QuoteCard } from '@/components/QuoteCard';
import { LatestBlock } from '@/components/LatestBlock';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage, useReadContract } from 'wagmi';
import { hexToBytes } from 'viem';
import { deriveKey, decryptEntry, SIGN_MESSAGE, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';

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
    },
  });

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

  const fetchEntries = useCallback(async () => {
    if (!address || !encryptionKey || entryCount === undefined) return;

    const count = Number(entryCount);
    if (count === 0) {
      setEntries([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const decrypted: DecryptedEntry[] = [];
      const batchSize = 10;

      for (let i = 0; i < count; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, count); j++) {
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
            const { timestamp, ciphertext } = result as { timestamp: bigint; ciphertext: `0x${string}` };
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

      decrypted.reverse();
      setEntries(decrypted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError('Error reading entries: ' + msg.slice(0, 100));
    } finally {
      setIsLoading(false);
    }
  }, [address, encryptionKey, entryCount]);

  useEffect(() => {
    if (encryptionKey && entryCount !== undefined) {
      fetchEntries();
    }
  }, [encryptionKey, entryCount, fetchEntries]);

  useEffect(() => {
    setEncryptionKey(null);
    setEntries([]);
    setError('');
  }, [address]);

  const handleQuoteAdded = () => {
    setModalOpen(false);
    refetchCount().then(() => {
      fetchEntries();
    });
  };

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

        <div className="mb-8">
          <LatestBlock />
        </div>

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
          <div className="space-y-4">
            {entries.map((item, idx) => (
              <QuoteCard
                key={idx}
                entry={item.entry}
                timestamp={item.timestamp}
              />
            ))}
          </div>
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
