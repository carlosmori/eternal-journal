'use client';

import type { JournalEntry } from '@/lib/crypto';

interface QuoteCardProps {
  entry: JournalEntry;
  timestamp: number;
  revealed: boolean;
}

export function QuoteCard({ entry, timestamp, revealed }: QuoteCardProps) {
  const blockDate = new Date(timestamp * 1000).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className={`glass-card p-6 transition-all duration-300 ${
        revealed ? 'blur-none' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-sm font-medium text-violet-600 dark:text-violet-400 ${
            revealed ? '' : 'blur-md select-none'
          }`}
        >
          {entry.date}
        </span>
        <span className="text-xs text-violet-400 dark:text-violet-500">
          {blockDate}
        </span>
      </div>

      <h3
        className={`text-lg font-semibold text-violet-900 dark:text-violet-100 mb-2 ${
          revealed ? 'blur-none select-text' : 'blur-md select-none'
        }`}
      >
        {entry.title}
      </h3>

      <p
        className={`text-violet-800 dark:text-violet-200 leading-relaxed ${
          revealed ? 'blur-none select-text' : 'blur-md select-none'
        }`}
      >
        {entry.description}
      </p>
    </article>
  );
}
