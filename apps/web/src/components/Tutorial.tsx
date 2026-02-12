'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    title: 'Forever',
    description:
      'Your words matter. We wrote them on the blockchain so they live forever\u2014no one can delete or change them. \u2665',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: 'Just yours',
    description:
      "Only you can read your entries. Your wallet keeps the key\u2014no passwords, no accounts. \u2665",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'Start writing',
    description:
      'Connect your wallet, sign once to unlock, then write. A tiny fee helps keep it running. With love.',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 180 : -180,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -180 : 180,
    opacity: 0,
  }),
};

interface TutorialProps {
  onComplete: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const isLast = step === steps.length - 1;

  const next = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 260 }}
        className="liquid-glass w-full max-w-md p-8 relative overflow-hidden"
      >
        {/* Step content */}
        <div className="min-h-[220px] flex items-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center w-full"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/15 dark:bg-violet-400/15 flex items-center justify-center text-violet-700 dark:text-violet-300">
                {steps[step].icon}
              </div>

              <h2 className="text-2xl font-bold text-violet-900 dark:text-white mb-3">
                {steps[step].title}
              </h2>

              <p className="text-violet-700 dark:text-violet-200 leading-relaxed text-sm md:text-base px-2">
                {steps[step].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6 mb-6">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 24 : 8,
                opacity: i === step ? 1 : 0.4,
              }}
              transition={{ duration: 0.3 }}
              className={`h-2 rounded-full ${
                i === step
                  ? 'bg-violet-500 dark:bg-violet-400'
                  : 'bg-violet-300 dark:bg-violet-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              onClick={prev}
              className="flex-1 py-3 rounded-xl bg-violet-200/30 dark:bg-violet-800/30 text-violet-800 dark:text-violet-100 font-medium hover:bg-violet-200/50 dark:hover:bg-violet-800/50 transition-colors"
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={isLast ? onComplete : next}
            className="flex-1 py-3 glass-button"
          >
            {isLast ? 'Enter journal \u2665' : 'Next'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
