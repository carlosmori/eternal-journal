'use client';

import { motion } from 'framer-motion';

interface AccountSectionProps {
  web2User: { name: string; email: string } | null;
  jwt: string | null;
  onSignOut: () => void;
  onOpenSignIn: () => void;
  isAdmin?: boolean;
}

export function AccountSection({ web2User, jwt, onSignOut, onOpenSignIn, isAdmin }: AccountSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto space-y-4"
    >
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-violet-900 dark:text-white">
          My Account
        </h2>
      </div>

      {jwt && web2User ? (
        <div className="glass-card p-6 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-200/60 dark:bg-violet-700/40 flex items-center justify-center text-lg font-bold text-violet-700 dark:text-violet-300 uppercase shrink-0">
              {(web2User.name || web2User.email || '?')[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-900 dark:text-white truncate">
                {web2User.name}
              </p>
              <p className="text-xs text-violet-500 dark:text-violet-400 truncate">
                {web2User.email}
              </p>
            </div>
          </div>

          <div className="h-px bg-violet-200/40 dark:bg-violet-700/30" />

          {/* Actions */}
          <div className="space-y-2">
            {isAdmin && (
              <a
                href="/admin/quotes"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Moderate quotes
              </a>
            )}
            <button
              onClick={onSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100/40 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Sign out
            </button>
          </div>

          <div className="h-px bg-violet-200/40 dark:bg-violet-700/30" />

          {/* Coming soon */}
          <div className="text-center py-4">
            <p className="text-xs text-violet-400 dark:text-violet-500 uppercase tracking-wider font-medium">
              More features coming soon
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-200/30 dark:bg-violet-800/30 flex items-center justify-center text-violet-500 dark:text-violet-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-violet-700 dark:text-violet-300 mb-1">
              Sign in to sync your journal across devices
            </p>
            <p className="text-xs text-violet-500 dark:text-violet-400">
              Your entries are currently saved on this device only
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenSignIn}
            className="glass-button px-6 py-2.5 text-sm font-medium"
          >
            Sign in with Google
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
