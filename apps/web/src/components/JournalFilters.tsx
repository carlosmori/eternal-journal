'use client';

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
}: JournalFiltersProps) {
  const hasDateFilter = dateFrom || dateTo;

  const applyPreset = (preset: 'week' | 'month' | 'year') => {
    const { from, to } =
      preset === 'week' ? getThisWeek() : preset === 'month' ? getThisMonth() : getThisYear();
    onDateFromChange(from);
    onDateToChange(to);
  };

  const clearDates = () => {
    onDateFromChange('');
    onDateToChange('');
  };

  return (
    <div className="glass-card p-4 space-y-4 mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="search"
            placeholder="Search in title or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="glass-input text-sm"
          />
        </div>

        {/* Quick date presets */}
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => applyPreset('week')}
            className="px-3 py-2 rounded-xl text-sm font-medium text-violet-700 dark:text-violet-300 bg-white/40 dark:bg-violet-800/40 border border-violet-200/50 dark:border-violet-600/40 hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors"
          >
            Esta semana
          </button>
          <button
            onClick={() => applyPreset('month')}
            className="px-3 py-2 rounded-xl text-sm font-medium text-violet-700 dark:text-violet-300 bg-white/40 dark:bg-violet-800/40 border border-violet-200/50 dark:border-violet-600/40 hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors"
          >
            Este mes
          </button>
          <button
            onClick={() => applyPreset('year')}
            className="px-3 py-2 rounded-xl text-sm font-medium text-violet-700 dark:text-violet-300 bg-white/40 dark:bg-violet-800/40 border border-violet-200/50 dark:border-violet-600/40 hover:bg-white/60 dark:hover:bg-violet-700/50 transition-colors"
          >
            Este año
          </button>
        </div>

        {/* Date range (collapsible / secondary) */}
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="glass-input text-sm w-auto py-2"
          />
          <span className="text-violet-500 dark:text-violet-400 text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="glass-input text-sm w-auto py-2"
          />
          {hasDateFilter && (
            <button
              onClick={clearDates}
              className="px-3 py-2 rounded-xl text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 hover:bg-violet-100/50 dark:hover:bg-violet-800/30 transition-colors"
              title="Limpiar filtro de fechas"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Favorites filter */}
        <button
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
            favoritesOnly
              ? 'bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50'
              : 'bg-white/40 dark:bg-violet-800/40 text-violet-700 dark:text-violet-300 border-violet-200/50 dark:border-violet-600/40 hover:bg-white/60 dark:hover:bg-violet-700/50'
          }`}
          title="Filter by favorites"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          Favorites
          {favoriteCount > 0 && (
            <span className="text-xs bg-violet-200/60 dark:bg-violet-700/50 px-1.5 py-0.5 rounded">
              {favoriteCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
