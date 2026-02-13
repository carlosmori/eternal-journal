'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { JournalEntry } from '@/lib/crypto';

interface QuoteCardProps {
  entry: JournalEntry;
  timestamp: number;
  revealed: boolean;
  entryIndex?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (entryIndex: number) => void;
  compact?: boolean;
}

const TRUNCATE_LENGTH = 180;

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function QuoteCard({ entry, timestamp, revealed, entryIndex = -1, isFavorite = false, onToggleFavorite, compact = false }: QuoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const blockDate = new Date(timestamp * 1000).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isLong = entry.description.length > TRUNCATE_LENGTH;
  const showTruncated = isLong && !expanded;
  const displayDescription = showTruncated
    ? entry.description.slice(0, TRUNCATE_LENGTH) + '...'
    : entry.description;

  const handleCopy = useCallback(async () => {
    if (!revealed) return;
    const text = `${entry.title}\n\n${entry.description}\n\n— ${entry.date}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [entry, revealed]);

  const handleShare = useCallback(async () => {
    if (!revealed) return;
    const text = `${entry.title}\n\n${entry.description}\n\n— ${entry.date}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: entry.title,
          text,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [entry, revealed, handleCopy]);

  const blurClass = revealed ? '' : 'blur-md select-none';

  return (
    <motion.article
      whileHover={{ y: compact ? 0 : -2 }}
      transition={{ duration: 0.2 }}
      className={`glass-card overflow-hidden transition-all duration-500 cursor-default border-l-4 border-l-violet-500 dark:border-l-violet-400 ${compact ? 'p-4 pl-3' : ''}`}
    >
      <div className={compact ? 'p-0' : 'p-6 pl-5'}>
        {/* Header: date + favorite + actions */}
        <div className={`flex justify-between items-start gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
          <span
            className={`text-xs font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400 font-mono transition-all duration-500 ${blurClass}`}
          >
            {entry.date}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {entryIndex >= 0 && onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(entryIndex);
                }}
                className={`p-1 rounded transition-colors ${isFavorite ? 'text-red-500 dark:text-red-400' : 'text-violet-400 dark:text-violet-500 hover:text-violet-600 dark:hover:text-violet-400'}`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HeartIcon filled={isFavorite} />
              </button>
            )}
            <span className="text-xs text-violet-500 dark:text-violet-500 font-mono">
              {blockDate}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className={`font-semibold text-violet-900 dark:text-violet-100 transition-all duration-500 ${blurClass} ${compact ? 'text-base mb-1' : 'text-xl mb-3'}`}
        >
          {entry.title}
        </h3>

        {/* Divider */}
        {!compact && <div className="h-px bg-violet-200/60 dark:bg-violet-700/40 mb-3" />}

        {/* Description */}
        <p
          className={`text-violet-800 dark:text-violet-200 transition-all duration-500 whitespace-pre-wrap ${blurClass} ${compact ? 'text-sm leading-relaxed line-clamp-2' : 'leading-loose'}`}
        >
          {displayDescription}
        </p>

        {/* Expand/Collapse for long text */}
        {revealed && isLong && !compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUpIcon />
                Show less
              </>
            ) : (
              <>
                <ChevronDownIcon />
                Read more
              </>
            )}
          </button>
        )}

        {/* Action bar - visible when revealed */}
        {revealed && !compact && (
          <div className="mt-4 pt-3 flex items-center gap-2 border-t border-violet-200/40 dark:border-violet-700/30">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
              title="Copy"
            >
              <CopyIcon />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
              title="Share"
            >
              <ShareIcon />
              Share
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
