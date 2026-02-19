'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '/api/backend';
const BATCH_SIZE = 5;

interface Quote {
  id: string;
  text: string;
}

export function CommunitySection() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  const fetchBatch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const excludeParam =
        seenIdsRef.current.size > 0 ? `&exclude=${Array.from(seenIdsRef.current).join(',')}` : '';
      const res = await fetch(`${API_URL}/shared-quotes/batch?count=${BATCH_SIZE}${excludeParam}`);
      if (!res.ok) return;
      const data: { quotes: Quote[] } = await res.json();

      if (data.quotes.length > 0) {
        data.quotes.forEach((q) => seenIdsRef.current.add(q.id));
        setQuotes(data.quotes);
        setCurrentIndex(0);
        setIsEmpty(false);
      } else if (seenIdsRef.current.size === 0) {
        setIsEmpty(true);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleNext = useCallback(() => {
    if (currentIndex < quotes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      fetchBatch();
    }
  }, [currentIndex, quotes.length, fetchBatch]);

  const current = quotes[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-violet-900 dark:text-white">Whispers</h2>
        <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">
          Anonymous thoughts from the community
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
            className="w-8 h-8 rounded-full border-2 border-violet-400/60 border-t-violet-600 dark:border-violet-300/60 dark:border-t-violet-200"
          />
        </div>
      )}

      {!isLoading && isEmpty && (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-violet-200/30 dark:bg-violet-800/30 flex items-center justify-center text-violet-500 dark:text-violet-400">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <p className="text-sm text-violet-600 dark:text-violet-400">
            No community quotes yet. Be the first to share!
          </p>
        </div>
      )}

      {!isLoading && current && (
        <div className="glass-card p-6 sm:p-8">
          <div className="relative px-4 py-2">
            <span
              className="absolute -top-2 -left-1 text-5xl leading-none text-violet-400/25 dark:text-violet-500/15 font-serif select-none"
              aria-hidden
            >
              &ldquo;
            </span>

            <AnimatePresence mode="wait">
              <motion.p
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-base sm:text-lg italic text-violet-800 dark:text-violet-200 leading-relaxed whitespace-pre-wrap text-center"
              >
                {current.text}
              </motion.p>
            </AnimatePresence>

            <span
              className="absolute -bottom-4 -right-1 text-5xl leading-none text-violet-400/25 dark:text-violet-500/15 font-serif select-none"
              aria-hidden
            >
              &rdquo;
            </span>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-200/30 dark:hover:bg-violet-800/30 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" x2="21" y1="20" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" x2="21" y1="15" y2="21" />
                <line x1="4" x2="9" y1="4" y2="9" />
              </svg>
              Another quote
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
