'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { JournalEntry } from '@/lib/crypto';

interface QuoteCardProps {
  entry: JournalEntry;
  timestamp: number;
  entryIndex?: number | string;
  isFavorite?: boolean;
  onToggleFavorite?: (entryIndex: number | string) => void;
  compact?: boolean;
  editable?: boolean;
  onEdit?: (entryIndex: number | string, entry: JournalEntry) => void;
  canDelete?: boolean;
  onDelete?: (entryIndex: number | string) => void;
  canSaveForever?: boolean;
  onSaveForever?: (entryIndex: number | string, entry: JournalEntry) => void;
  isForever?: boolean;
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function ForeverIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const TRUNCATE_LENGTH = 180;

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

export function QuoteCard({ entry, timestamp, entryIndex = -1, isFavorite = false, onToggleFavorite, compact = false, editable = false, onEdit, canDelete = false, onDelete, canSaveForever = false, onSaveForever, isForever = false }: QuoteCardProps) {
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

  const handleShare = useCallback(async () => {
    const text = `${entry.title}\n\n${entry.description}\n\n— ${entry.date}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: entry.title,
          text,
        });
      } catch {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // ignore
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // ignore
      }
    }
  }, [entry]);

  return (
    <motion.article
      whileHover={{ y: compact ? 0 : -2 }}
      transition={{ duration: 0.2 }}
      className={`glass-card overflow-hidden transition-all duration-500 cursor-default border-l-4 border-l-violet-500 dark:border-l-violet-400 ${compact ? 'p-4 pl-3' : ''}`}
    >
      <div className={compact ? 'p-0' : 'p-4 sm:p-6 pl-4 sm:pl-5'}>
        {/* Header: date + badge + favorite + actions */}
        <div className={`flex justify-between items-start gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400 font-mono"
            >
              {entry.date}
            </span>
            {isForever && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Eternal
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {entryIndex != null && entryIndex !== '' && onToggleFavorite && (
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
          className={`font-semibold text-violet-900 dark:text-violet-100 ${compact ? 'text-base mb-1' : 'text-xl mb-3'}`}
        >
          {entry.title}
        </h3>

        {/* Divider */}
        {!compact && <div className="h-px bg-violet-200/60 dark:bg-violet-700/40 mb-3" />}

        {/* Description */}
        <p
          className={`text-violet-800 dark:text-violet-200 whitespace-pre-wrap ${compact ? 'text-sm leading-relaxed line-clamp-2' : 'leading-loose'}`}
        >
          {displayDescription}
        </p>

        {/* Expand/Collapse for long text */}
        {isLong && !compact && (
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

        {/* Action bar */}
        {!compact && (
          <div className="mt-4 pt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 border-t border-violet-200/40 dark:border-violet-700/30">
            {!isForever && editable && onEdit && entryIndex != null && entryIndex !== '' && (
              <button
                onClick={() => onEdit(entryIndex, entry)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
                title="Edit"
              >
                <EditIcon />
                Edit
              </button>
            )}
            {!isForever && canSaveForever && onSaveForever && entryIndex != null && entryIndex !== '' && (
              <button
                onClick={() => onSaveForever(entryIndex, entry)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors border border-amber-200/60 dark:border-amber-700/40"
                title="Save forever on blockchain"
              >
                <ForeverIcon />
                Save forever
              </button>
            )}
            {!isForever && canDelete && onDelete && entryIndex != null && entryIndex !== '' && (
              <button
                onClick={() => onDelete(entryIndex)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete"
              >
                <TrashIcon />
                Delete
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200/40 dark:hover:bg-violet-800/40 transition-colors"
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
