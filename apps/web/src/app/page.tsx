'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Tutorial } from '@/components/Tutorial';

const UniverseScene = dynamic(() => import('@/components/UniverseScene'), {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem('eternal-journal-tutorial-seen');
    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem('eternal-journal-tutorial-seen', 'true');
    setShowTutorial(false);
  }, []);

  const handleEnter = useCallback(() => {
    setIsOpening(true);
  }, []);

  const handleOpenComplete = useCallback(() => {
    setShowOverlay(true);
    setTimeout(() => router.push('/journal'), 400);
  }, [router]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535]">
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl bg-violet-400/20 dark:bg-violet-600/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl bg-fuchsia-400/20 dark:bg-fuchsia-600/10"
        aria-hidden
      />

      {/* Top controls */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-20">
        <ThemeToggle />
      </div>

      {/* 3D scene: universe + sparkles + hex grid */}
      <div className="absolute inset-0 z-0">
        {mounted && <UniverseScene isOpening={isOpening} variant="home" />}
      </div>
      {/* Gradient overlay for blend with page */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none dark:hidden"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(255,255,255,0.4) 70%),
            radial-gradient(ellipse 60% 40% at 80% 80%, transparent 0%, rgba(248,250,252,0.3) 60%)
          `,
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none hidden dark:block"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(15,5,32,0.6) 70%),
            radial-gradient(ellipse 60% 40% at 80% 80%, transparent 0%, rgba(21,10,48,0.5) 60%)
          `,
        }}
      />

      {/* Hero content - single card with flip + reveal */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-14 md:pb-24 px-4 [perspective:1200px]">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{
            opacity: isOpening ? 0 : 1,
            y: 0,
            rotateY: isOpening ? -95 : 0,
            scale: isOpening ? 0.9 : 1,
          }}
          transition={{
            opacity: { duration: isOpening ? 0.5 : 0.8, delay: isOpening ? 0.2 : 0.2 },
            y: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
            rotateY: { duration: 0.85, ease: [0.32, 0.72, 0, 1] },
            scale: { duration: 0.85, ease: [0.32, 0.72, 0, 1] },
          }}
          onAnimationComplete={() => {
            if (isOpening) handleOpenComplete();
          }}
          className="liquid-glass p-8 md:p-12 text-center max-w-lg w-full shadow-2xl shadow-violet-900/10"
          style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
        >
          <div className="flex flex-col items-center">
            <img
              src="/logo.svg"
              alt="Eternal Journal"
              className="h-16 md:h-20 w-auto mx-auto mb-4"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-violet-900 dark:text-white mb-3 tracking-tight">
              Eternal Journal
            </h1>

            <p className="text-violet-700 dark:text-violet-200 text-base md:text-lg leading-relaxed mb-2">
              Your thoughts deserve a place that lasts forever.
            </p>
            <p className="text-violet-600 dark:text-violet-300 text-sm mb-8">
              Private. Encrypted. Built with care for what matters to you.
            </p>

                <motion.button
                  onClick={handleEnter}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="glass-button px-10 py-3.5 text-lg shadow-lg shadow-violet-500/20"
                >
                  Open your journal
                </motion.button>

                <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-violet-600 dark:text-violet-400">
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Private
                  </span>
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Encrypted
                  </span>
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Forever
                  </span>
                </div>
              </div>
        </motion.div>

        {/* Loading state - appears as card flips away */}
        <AnimatePresence>
          {isOpening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="absolute bottom-14 md:bottom-24 flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
                className="w-10 h-10 rounded-full border-2 border-violet-400/60 border-t-violet-600 dark:border-violet-300/60 dark:border-t-violet-200"
              />
              <p className="mt-3 text-violet-600 dark:text-violet-400 text-sm font-medium">
                Opening your journal...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transition overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40 bg-white/95 dark:bg-[#0f0520]/95 backdrop-blur-2xl"
          />
        )}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showTutorial && mounted && (
          <Tutorial onComplete={handleTutorialComplete} />
        )}
      </AnimatePresence>
    </main>
  );
}
