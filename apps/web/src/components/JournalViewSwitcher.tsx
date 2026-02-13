'use client';

import type { ViewMode } from '@/components/JournalViews';

interface JournalViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

const views: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'grid',
    label: 'Grid',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

export function JournalViewSwitcher({ viewMode, onViewModeChange }: JournalViewSwitcherProps) {
  return (
    <div className="flex rounded-xl bg-white/30 dark:bg-violet-800/30 p-1 border border-violet-200/50 dark:border-violet-600/40">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => onViewModeChange(v.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === v.id
              ? 'bg-white dark:bg-violet-700/50 text-violet-900 dark:text-violet-100 shadow-sm'
              : 'text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200'
          }`}
          title={v.label}
        >
          {v.icon}
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
