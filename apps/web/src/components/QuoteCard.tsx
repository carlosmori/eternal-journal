'use client';

import { useState } from 'react';

interface QuoteCardProps {
  entry: { id: number; quote: string };
}

export function QuoteCard({ entry }: QuoteCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article
      onClick={() => setRevealed(true)}
      className={`glass-card p-6 cursor-pointer transition-all duration-300 ${
        revealed ? 'blur-none' : ''
      }`}
    >
      <blockquote
        className={`text-violet-900 dark:text-violet-100 italic ${
          revealed ? 'blur-none select-text' : 'blur-md select-none'
        }`}
      >
        {entry.quote}
      </blockquote>
      {!revealed && (
        <p className="mt-2 text-sm text-violet-500 dark:text-violet-400">
          Haz clic para revelar
        </p>
      )}
    </article>
  );
}
