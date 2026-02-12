'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Tutorial } from '@/components/Tutorial';

const DiaryScene = dynamic(() => import('@/components/DiaryScene'), {
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
    setTimeout(() => router.push('/journal'), 600);
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
        <ConnectButton />
        <ThemeToggle />
      </div>

      {/* 3D book scene (full viewport background) */}
      <div className="absolute inset-0 z-0">
        {mounted && (
          <DiaryScene isOpening={isOpening} onOpenComplete={handleOpenComplete} />
        )}
      </div>

      {/* Hero content -- anchored at bottom-center */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-14 md:pb-24 px-4">
        <AnimatePresence>
          {!isOpening && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.3 } }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="liquid-glass p-8 md:p-12 text-center max-w-lg w-full"
            >
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="glass-button px-10 py-3.5 text-lg"
              >
                Open your journal
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transition overlay (fades in as the book opens) */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40 bg-white/90 dark:bg-[#0f0520]/90 backdrop-blur-2xl"
          />
        )}
      </AnimatePresence>

      {/* Tutorial overlay (first visit) */}
      <AnimatePresence>
        {showTutorial && mounted && (
          <Tutorial onComplete={handleTutorialComplete} />
        )}
      </AnimatePresence>
    </main>
  );
}
