'use client';

import type { ReactNode } from 'react';

interface DiaryContainerProps {
  children: ReactNode;
  entryCount?: number;
}

export function DiaryContainer({ children, entryCount }: DiaryContainerProps) {
  return (
    <div className="relative">
      {/* Spine accent */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-violet-400/60 via-fuchsia-400/40 to-violet-400/60 dark:from-violet-500/40 dark:via-fuchsia-500/30 dark:to-violet-500/40" />

      <div className="ml-3 sm:ml-4 rounded-xl sm:rounded-2xl bg-white/30 dark:bg-violet-950/30 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/30 shadow-sm overflow-hidden">
        {/* Diary header */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-violet-200/30 dark:border-violet-700/20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-violet-800 dark:text-violet-200 uppercase tracking-wider">
              My Journal
            </h2>
            {entryCount !== undefined && entryCount > 0 && (
              <span className="text-xs text-violet-500 dark:text-violet-400 font-mono">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
        </div>

        {/* Diary content */}
        <div className="p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
