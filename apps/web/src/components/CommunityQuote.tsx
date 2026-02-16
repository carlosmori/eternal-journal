'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BATCH_SIZE = 5;

interface Quote {
  id: string;
  text: string;
}

function ShuffleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" x2="21" y1="20" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" x2="21" y1="15" y2="21" />
      <line x1="4" x2="9" y1="4" y2="9" />
    </svg>
  );
}

export function CommunityQuote() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(1);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  const fetchBatch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const excludeParam = seenIdsRef.current.size > 0
        ? `&exclude=${Array.from(seenIdsRef.current).join(',')}`
        : '';
      const res = await fetch(
        `${API_URL}/shared-quotes/batch?count=${BATCH_SIZE}${excludeParam}`,
      );
      if (!res.ok) return;
      const data: { quotes: Quote[] } = await res.json();

      if (data.quotes.length > 0) {
        data.quotes.forEach((q) => seenIdsRef.current.add(q.id));
        setQuotes(data.quotes);
        setCurrentIndex(0);
      }
    } catch {
      // Silently fail -- community quotes are optional
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (currentIndex < quotes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      fetchBatch();
    }
  }, [currentIndex, quotes.length, fetchBatch]);

  const current = quotes[currentIndex];

  if (isLoading || !current) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="mb-6 md:mb-8 max-w-md w-full text-center"
    >
      <div className="relative px-6 py-4">
        {/* Decorative quotes */}
        <span
          className="absolute -top-1 left-2 text-4xl leading-none text-violet-400/30 dark:text-violet-500/20 font-serif select-none"
          aria-hidden
        >
          &ldquo;
        </span>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.p
            key={current.id}
            custom={direction}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm md:text-base italic text-violet-700 dark:text-violet-300 leading-relaxed whitespace-pre-wrap"
          >
            {current.text}
          </motion.p>
        </AnimatePresence>

        <span
          className="absolute -bottom-3 right-2 text-4xl leading-none text-violet-400/30 dark:text-violet-500/20 font-serif select-none"
          aria-hidden
        >
          &rdquo;
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-violet-500/60 dark:text-violet-400/40 font-medium">
          From the community
        </span>
        <button
          onClick={handleNext}
          className="p-1.5 rounded-lg text-violet-500 dark:text-violet-400 hover:bg-violet-200/30 dark:hover:bg-violet-800/30 transition-colors"
          title="Another quote"
          aria-label="Show another community quote"
        >
          <ShuffleIcon />
        </button>
      </div>
    </motion.div>
  );
}
