'use client';

import { motion } from 'framer-motion';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const { loginWithGoogle } = useAuth();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="liquid-glass w-full max-w-sm max-h-[90dvh] overflow-y-auto p-4 sm:p-6 border-2 border-violet-200/50 dark:border-violet-600/40 shadow-2xl shadow-violet-900/20 my-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center gap-2 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-violet-900 dark:text-white">
            Sign in to save your journal
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 dark:text-violet-400 hover:bg-violet-200/30 dark:hover:bg-violet-800/30 transition-colors"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => {
              onClose();
              loginWithGoogle();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-violet-800/30 border border-violet-200/50 dark:border-violet-600/30 hover:bg-white/70 dark:hover:bg-violet-700/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-700/40 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-600 dark:text-violet-300"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-violet-900 dark:text-violet-100 text-sm">
                Sign in with Google
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                Sync across devices. No wallet needed.
              </p>
            </div>
          </button>

          {/* Wallet */}
          <button
            onClick={() => {
              onClose();
              openConnectModal?.();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-violet-800/30 border border-violet-200/50 dark:border-violet-600/30 hover:bg-white/70 dark:hover:bg-violet-700/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-700/40 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-600 dark:text-violet-300"
              >
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-4" />
                <circle cx="18" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-violet-900 dark:text-violet-100 text-sm">
                Connect wallet
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                Save forever on blockchain. Fully private.
              </p>
            </div>
          </button>

          {/* Guest */}
          <button
            onClick={onClose}
            className="w-full flex items-start gap-4 p-4 rounded-xl bg-white/30 dark:bg-violet-900/20 border border-violet-200/30 dark:border-violet-700/20 hover:bg-white/50 dark:hover:bg-violet-800/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100/60 dark:bg-violet-800/30 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-500 dark:text-violet-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-violet-700 dark:text-violet-300 text-sm">
                Continue as guest
              </p>
              <p className="text-xs text-violet-500 dark:text-violet-500 mt-0.5">
                Use locally. No account required.
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
