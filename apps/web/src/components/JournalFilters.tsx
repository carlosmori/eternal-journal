'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JournalFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (v: boolean) => void;
  favoriteCount: number;
  onAddClick?: () => void;
}

function getThisWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().split('T')[0],
    to: sunday.toISOString().split('T')[0],
  };
}

function getThisMonth(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { from, to };
}

function getThisYear(): { from: string; to: string } {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function JournalFilters({
  searchQuery,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  favoriteCount,
  onAddClick,
}: JournalFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDateFilter = dateFrom || dateTo;
  const hasActiveFilters = hasDateFilter || favoritesOnly;

  const applyPreset = (preset: 'week' | 'month' | 'year') => {
    const { from, to } =
      preset === 'week' ? getThisWeek() : preset === 'month' ? getThisMonth() : getThisYear();
    onDateFromChange(from);
    onDateToChange(to);
  };

  const clearAll = () => {
    onDateFromChange('');
    onDateToChange('');
    onFavoritesOnlyChange(false);
    onSearchChange('');
  };

  return (
    <div className="mb-4 space-y-2">
      {/* Compact bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 dark:text-violet-500 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 text-violet-900 dark:text-violet-100 placeholder-violet-400 dark:placeholder-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-all"
          />
        </div>

        {/* Favorites toggle */}
        <button
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors border shrink-0 ${
            favoritesOnly
              ? 'bg-red-100/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50'
              : 'bg-white/40 dark:bg-violet-800/30 text-violet-500 dark:text-violet-400 border-violet-200/40 dark:border-violet-600/30 hover:text-violet-700 dark:hover:text-violet-300'
          }`}
          title="Favorites"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={favoritesOnly ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {favoriteCount > 0 && <span className="text-xs">{favoriteCount}</span>}
        </button>

        {/* Filter toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors border shrink-0 ${
            expanded || hasActiveFilters
              ? 'bg-violet-100/50 dark:bg-violet-700/30 text-violet-700 dark:text-violet-300 border-violet-300/50 dark:border-violet-500/40'
              : 'bg-white/40 dark:bg-violet-800/30 text-violet-500 dark:text-violet-400 border-violet-200/40 dark:border-violet-600/30 hover:text-violet-700 dark:hover:text-violet-300'
          }`}
          title="Filters"
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
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {hasActiveFilters && !expanded && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
          )}
        </button>

        {/* Add quote (+) */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-sm font-semibold text-white bg-emerald-500/90 dark:bg-emerald-500/80 hover:bg-emerald-600 dark:hover:bg-emerald-600/90 border border-emerald-400/40 dark:border-emerald-400/30 shadow-sm shrink-0 transition-colors"
            title="Add entry"
            aria-label="Add entry"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/30 dark:bg-violet-900/20 border border-violet-200/30 dark:border-violet-700/20 space-y-3">
              {/* Date presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                  Quick:
                </span>
                {(['week', 'month', 'year'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-violet-600 dark:text-violet-300 bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 hover:bg-white/60 dark:hover:bg-violet-700/40 transition-colors"
                  >
                    {preset === 'week'
                      ? 'This week'
                      : preset === 'month'
                        ? 'This month'
                        : 'This year'}
                  </button>
                ))}
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                  Range:
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 text-violet-800 dark:text-violet-200"
                />
                <span className="text-violet-400 text-xs">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs bg-white/40 dark:bg-violet-800/30 border border-violet-200/40 dark:border-violet-600/30 text-violet-800 dark:text-violet-200"
                />
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="text-xs text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
