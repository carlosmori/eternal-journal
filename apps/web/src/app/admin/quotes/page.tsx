'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = '/api/backend';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

interface SharedQuote {
  id: string;
  text: string;
  status: string;
  createdAt: string;
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminQuotesPage() {
  const { jwt, web2User } = useAuth();
  const [quotes, setQuotes] = useState<SharedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('PENDING');

  const isAdmin = !!ADMIN_EMAIL && web2User?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const fetchQuotes = useCallback(async (status: StatusFilter) => {
    if (!jwt) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/shared-quotes?status=${status}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.status === 403) {
        setError('Access denied. Admin privileges required.');
        setQuotes([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : data.quotes ?? []);
    } catch {
      setError('Failed to load quotes.');
    } finally {
      setIsLoading(false);
    }
  }, [jwt]);

  useEffect(() => {
    if (jwt && isAdmin) {
      fetchQuotes(filter);
    } else {
      setIsLoading(false);
    }
  }, [jwt, isAdmin, filter, fetchQuotes]);

  const handleReview = useCallback(async (quoteId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!jwt) return;
    try {
      const res = await fetch(`${API_URL}/admin/shared-quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    } catch {
      setError('Failed to update quote.');
    }
  }, [jwt]);

  const pendingCount = useMemo(
    () => (filter === 'PENDING' ? quotes.length : null),
    [filter, quotes.length],
  );

  if (!jwt || !isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-violet-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-violet-700 dark:text-violet-300 mb-4">
            You need admin privileges to view this page.
          </p>
          <a
            href="/journal"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
          >
            Back to Journal
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-violet-950/40 border-b-2 border-violet-200/60 dark:border-violet-700/40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a
              href="/journal"
              className="text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </a>
            <h1 className="text-lg font-semibold text-violet-900 dark:text-white">
              Moderate Quotes
            </h1>
            {pendingCount !== null && pendingCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {pendingCount} pending
              </span>
            )}
          </div>

          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/60 dark:bg-violet-800/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
              className="w-8 h-8 rounded-full border-2 border-violet-400/60 border-t-violet-600 dark:border-violet-300/60 dark:border-t-violet-200"
            />
          </div>
        )}

        {!isLoading && quotes.length === 0 && !error && (
          <p className="text-sm text-violet-600 dark:text-violet-400 text-center py-12">
            No {filter.toLowerCase()} quotes found.
          </p>
        )}

        <AnimatePresence mode="popLayout">
          {quotes.map((quote) => (
            <motion.div
              key={quote.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
              className="glass-card p-5"
            >
              <p className="text-sm text-violet-800 dark:text-violet-200 whitespace-pre-wrap leading-relaxed mb-3">
                {quote.text}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-violet-500 dark:text-violet-500 font-mono">
                  {new Date(quote.createdAt).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {filter === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(quote.id, 'APPROVED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/40 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(quote.id, 'REJECTED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-900/30 hover:bg-red-200/80 dark:hover:bg-red-800/40 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" x2="6" y1="6" y2="18" />
                        <line x1="6" x2="18" y1="6" y2="18" />
                      </svg>
                      Reject
                    </button>
                  </div>
                )}
                {filter !== 'PENDING' && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    quote.status === 'APPROVED'
                      ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {quote.status}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
