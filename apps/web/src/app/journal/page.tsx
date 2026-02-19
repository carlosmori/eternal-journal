'use client';

import dynamic from 'next/dynamic';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal, type EditingEntry } from '@/components/AddQuoteModal';
import { SaveForeverModal } from '@/components/SaveForeverModal';
import { GuestBanner } from '@/components/GuestBanner';
import { SignInModal } from '@/components/SignInModal';
import { DiaryContainer } from '@/components/DiaryContainer';
import { WriteQuoteForm } from '@/components/WriteQuoteForm';
import { CommunitySection } from '@/components/CommunitySection';
import { JournalListView } from '@/components/JournalViews';
import { JournalFilters } from '@/components/JournalFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useGuestEntries } from '@/hooks/useGuestEntries';
import { useWeb2Journal } from '@/hooks/useWeb2Journal';
import { useSharedQuotes } from '@/hooks/useSharedQuotes';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSignMessage, useReadContract } from 'wagmi';
import { hexToBytes } from 'viem';
import { deriveKey, decryptEntry, SIGN_MESSAGE, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';
import { loadGuestEntries, saveGuestEntries } from '@/lib/guestStorage';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [saveForeverEntry, setSaveForeverEntry] = useState<{
    entryId: string;
    entry: JournalEntry;
    sourceMode: 'guest' | 'web2';
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // -- Community share --
  const shared = useSharedQuotes();
  const [shareConfirm, setShareConfirm] = useState<{
    entryIndex: string | number;
    entry: JournalEntry;
  } | null>(null);

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = !!ADMIN_EMAIL && web2User?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  type JournalSection = 'write' | 'read' | 'community';
  const [activeSection, setActiveSection] = useState<JournalSection>('write');

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

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
      const count = overrideCount !== undefined ? overrideCount : Number(entryCount ?? 0);
      const key = keyOverride ?? encryptionKey;
      if (!address || !key || (overrideCount === undefined && entryCount === undefined)) return;

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
    if (
      !isConnected ||
      !encryptionKey ||
      !address ||
      entryCount === undefined ||
      web3Loading ||
      manualRefreshRef.current
    )
      return;

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

  const web3TotalPages = Math.ceil(Number(entryCount ?? 0) / PAGE_SIZE);
  const hasWeb3Entries = web3Entries.length > 0;
  const editable = true;
  const canSaveForever = !!jwt;

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
    async (id: string, data: { date: string; title: string; description: string }) => {
      await web2.updateEntry(id, data);
    },
    [web2],
  );

  const handleEdit = useCallback((entryId: number | string, entry: JournalEntry) => {
    const idStr = String(entryId);
    // guest-123 → number, web2-cuid → string
    let id: number | string;
    if (idStr.startsWith('guest-')) {
      id = Number(idStr.slice(6));
    } else if (idStr.startsWith('web2-')) {
      id = idStr.slice(5);
    } else {
      id = idStr;
    }
    setEditingEntry({
      id,
      date: entry.date,
      title: entry.title,
      description: entry.description,
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (entryId: number | string) => {
      if (!confirm('Delete this entry? This cannot be undone.')) return;
      const idStr = String(entryId);
      if (idStr.startsWith('guest-')) {
        guest.removeEntry(Number(idStr.slice(6)));
      } else if (idStr.startsWith('web2-')) {
        web2.deleteEntry(idStr.slice(5));
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
      if (saveForeverEntry.sourceMode === 'guest') {
        const guestId = Number(saveForeverEntry.entryId.replace('guest-', ''));
        guest.removeEntry(guestId);
      } else {
        const web2Id = saveForeverEntry.entryId.replace('web2-', '');
        web2.deleteEntry(web2Id);
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

  // -- Community share handlers --
  const handleShareToCommunity = useCallback((entryIndex: number | string, entry: JournalEntry) => {
    setShareConfirm({ entryIndex, entry });
  }, []);

  const handleConfirmShare = useCallback(async () => {
    if (!shareConfirm) return;
    const { entryIndex, entry } = shareConfirm;
    const text = `${entry.title}\n\n${entry.description}`;
    const idStr = String(entryIndex);
    const sourceEntryId = idStr.startsWith('web2-')
      ? idStr.slice(5)
      : idStr.startsWith('web3-')
        ? idStr.slice(5)
        : undefined;
    try {
      await shared.shareEntry(text, sourceEntryId);
    } catch {
      // Silently fail
    }
    setShareConfirm(null);
  }, [shareConfirm, shared]);

  const handleUnshareCommunity = useCallback(
    async (entryIndex: number | string) => {
      const idStr = String(entryIndex);
      const sourceEntryId = idStr.startsWith('web2-')
        ? idStr.slice(5)
        : idStr.startsWith('web3-')
          ? idStr.slice(5)
          : undefined;
      if (sourceEntryId) {
        await shared.unshareEntry(sourceEntryId);
      }
    },
    [shared],
  );

  const wrappedIsSharedWithCommunity = useCallback(
    (entryIndex: number | string) => {
      const idStr = String(entryIndex);
      const sourceEntryId = idStr.startsWith('web2-')
        ? idStr.slice(5)
        : idStr.startsWith('web3-')
          ? idStr.slice(5)
          : undefined;
      return sourceEntryId ? shared.isShared(sourceEntryId) : false;
    },
    [shared],
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] transition-colors relative overflow-hidden">
      {/* 3D universe background */}
      <div className="fixed inset-0 z-0">{mounted && <UniverseScene variant="journal" />}</div>
      <div
        className="fixed inset-0 z-[1] pointer-events-none dark:hidden"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(255,255,255,0.5) 60%)',
        }}
      />
      <div
        className="fixed inset-0 z-[1] pointer-events-none hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(15,5,32,0.6) 60%)',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-violet-950/40 border-b border-violet-200/60 dark:border-violet-700/40 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 min-w-0">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2 font-semibold text-violet-900 dark:text-white text-base tracking-tight shrink-0"
          >
            <img src="/logo.svg" alt="Eternal Journal" className="h-7 sm:h-8 w-auto" />
            <span className="hidden lg:inline text-sm">Eternal Journal</span>
          </a>

          {/* Tabs - centered */}
          <nav className="flex-1 flex justify-center">
            <div className="flex items-center gap-0.5 rounded-xl bg-white/20 dark:bg-violet-800/20 p-1 border border-violet-200/30 dark:border-violet-700/20">
              {[
                {
                  id: 'write' as JournalSection,
                  label: 'Write',
                  icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
                },
                {
                  id: 'read' as JournalSection,
                  label: 'My Journal',
                  icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
                  count: entries.length,
                },
                {
                  id: 'community' as JournalSection,
                  label: 'Whispers',
                  icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeSection === tab.id
                      ? 'bg-white/60 dark:bg-violet-700/60 text-violet-900 dark:text-white shadow-sm'
                      : 'text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200'
                  }`}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] tabular-nums leading-none px-1.5 py-0.5 rounded-full ${
                        activeSection === tab.id
                          ? 'bg-violet-200/60 dark:bg-violet-600/50 text-violet-700 dark:text-violet-200'
                          : 'bg-violet-200/40 dark:bg-violet-700/30 text-violet-500 dark:text-violet-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* User menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/40 dark:bg-violet-800/30 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
              aria-label="Menu"
            >
              {jwt && web2User ? (
                <span className="text-xs font-bold uppercase">
                  {(web2User.name || web2User.email || '?')[0]}
                </span>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 z-40 w-64 glass-menu p-2 shadow-xl shadow-violet-900/10"
                  >
                    {/* User info */}
                    {jwt && web2User ? (
                      <div className="px-3 py-2.5 mb-1">
                        <p className="text-sm font-medium text-violet-900 dark:text-white truncate">
                          {web2User.name}
                        </p>
                        <p className="text-xs text-violet-500 dark:text-violet-400 truncate">
                          {web2User.email}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setSignInModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100/40 dark:hover:bg-violet-800/30 transition-colors"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" x2="3" y1="12" y2="12" />
                        </svg>
                        Sign in with Google
                      </button>
                    )}

                    <div className="h-px bg-violet-200/40 dark:bg-violet-700/30 my-1" />

                    {/* Wallet */}
                    <div className="px-1 py-1">
                      <ConnectButton />
                    </div>

                    <div className="h-px bg-violet-200/40 dark:bg-violet-700/30 my-1" />

                    {/* Theme toggle */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-100/40 dark:hover:bg-violet-800/30 transition-colors"
                    >
                      <span className="text-base">
                        {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
                      </span>
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>

                    {/* Admin */}
                    {isAdmin && (
                      <a
                        href="/admin/quotes"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Moderate quotes
                      </a>
                    )}

                    {/* Sign out */}
                    {jwt && (
                      <>
                        <div className="h-px bg-violet-200/40 dark:bg-violet-700/30 my-1" />
                        <button
                          onClick={() => {
                            logoutWeb2();
                            setMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-100/30 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" x2="9" y1="12" y2="12" />
                          </svg>
                          Sign out
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Banners -- visible in all sections */}
        {!jwt && activeSection === 'write' && (
          <GuestBanner onOpenSignIn={() => setSignInModalOpen(true)} />
        )}

        {pendingGuestMigration && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-4 py-3 flex items-center gap-3 mb-4 text-sm border-l-4 border-l-amber-400 dark:border-l-amber-500"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-amber-500 dark:text-amber-400"
            >
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {showUnlockBanner && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-4 py-3 flex items-center gap-3 mb-4 text-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-violet-500 dark:text-violet-400"
            >
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

        {/* ===== WRITE SECTION ===== */}
        {activeSection === 'write' && (
          <WriteQuoteForm
            mode={jwt ? 'web2' : 'guest'}
            onGuestAdd={handleGuestAdd}
            onWeb2Add={handleWeb2Add}
            entryCount={entries.length}
            onGoToJournal={() => setActiveSection('read')}
          />
        )}

        {/* ===== READ SECTION ===== */}
        {activeSection === 'read' && (
          <>
            {isLoading && (
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

            {!isLoading && entries.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-12 text-center border-l-4 border-l-violet-400 dark:border-l-violet-500"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 ring-2 ring-violet-200/50 dark:ring-violet-700/30">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                <p className="text-violet-700 dark:text-violet-300 leading-relaxed max-w-sm mx-auto mb-4">
                  Your thoughts deserve a place that lasts{isConnected ? ' forever' : ''}.
                </p>
                <button
                  onClick={() => setActiveSection('write')}
                  className="glass-button px-6 py-2.5 text-sm font-medium"
                >
                  Write your first entry
                </button>
              </motion.div>
            )}

            {!isLoading && entries.length > 0 && (
              <>
                <div className="mb-4">
                  <JournalFilters
                    onAddClick={() => setActiveSection('write')}
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

                {filteredEntries.length === 0 ? (
                  <DiaryContainer entryCount={0}>
                    <p className="text-violet-700 dark:text-violet-300 text-center py-6 text-sm">
                      No entries match your filters. Try adjusting search or date range.
                    </p>
                  </DiaryContainer>
                ) : (
                  <DiaryContainer entryCount={filteredEntries.length}>
                    <JournalListView
                      entries={filteredEntries}
                      isFavorite={wrappedIsFavorite}
                      onToggleFavorite={wrappedToggleFavorite}
                      viewMode="list"
                      editable={editable}
                      onEdit={handleEdit}
                      canDelete={editable}
                      onDelete={handleDelete}
                      canSaveForever={canSaveForever}
                      onSaveForever={handleSaveForever}
                      isSharedWithCommunity={jwt ? wrappedIsSharedWithCommunity : undefined}
                      onShareToCommunity={jwt ? handleShareToCommunity : undefined}
                      onUnshareCommunity={jwt ? handleUnshareCommunity : undefined}
                    />
                  </DiaryContainer>
                )}

                {hasWeb3Entries && web3TotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 sm:gap-4 mt-6 sm:mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/40 dark:bg-violet-800/40 backdrop-blur-sm text-violet-800 dark:text-violet-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            )}
          </>
        )}

        {/* ===== COMMUNITY SECTION ===== */}
        {activeSection === 'community' && <CommunitySection />}
      </div>

      <AddQuoteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSuccess={handleModalSuccess}
        mode={jwt ? 'web2' : 'guest'}
        editEntry={editingEntry}
        onGuestAdd={handleGuestAdd}
        onWeb2Add={handleWeb2Add}
        onGuestUpdate={handleGuestUpdate}
        onWeb2Update={handleWeb2Update}
      />

      <SignInModal isOpen={signInModalOpen} onClose={() => setSignInModalOpen(false)} />

      <SaveForeverModal
        isOpen={!!saveForeverEntry}
        onClose={() => setSaveForeverEntry(null)}
        onSuccess={handleSaveForeverSuccess}
        entry={saveForeverEntry?.entry ?? null}
        requiresGoogleAuth={!jwt}
        onOpenSignIn={() => {
          setSaveForeverEntry(null);
          setSignInModalOpen(true);
        }}
      />

      {/* Share to Community confirmation modal */}
      <AnimatePresence>
        {shareConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShareConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-violet-900 dark:text-white">
                Share with Community
              </h3>
              <p className="text-sm text-violet-700 dark:text-violet-300 leading-relaxed">
                Share this entry anonymously with the community? It will be reviewed before
                publishing.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShareConfirm(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmShare}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors"
                >
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
