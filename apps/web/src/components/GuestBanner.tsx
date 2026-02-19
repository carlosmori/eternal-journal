'use client';

import { motion } from 'framer-motion';

interface GuestBannerProps {
  onOpenSignIn?: () => void;
}

export function GuestBanner({ onOpenSignIn }: GuestBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-4 border-l-4 border-l-amber-400 dark:border-l-amber-500"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-medium">Guest mode</span>
        </div>
        <p className="text-sm text-violet-700 dark:text-violet-300 flex-1">
          Your entries are saved only on this device. Sign in to keep them everywhere.
        </p>
        {onOpenSignIn && (
          <button
            onClick={onOpenSignIn}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/60 dark:bg-violet-800/40 text-violet-800 dark:text-violet-200 hover:bg-white/80 dark:hover:bg-violet-700/50 transition-colors border border-violet-200/50 dark:border-violet-600/40"
          >
            Sign in
          </button>
        )}
      </div>
    </motion.div>
  );
}
