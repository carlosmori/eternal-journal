'use client';

import { motion } from 'framer-motion';

interface HomeSceneProps {
  isOpening: boolean;
  onOpenComplete: () => void;
}

export default function HomeScene({ isOpening }: HomeSceneProps) {

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-40 dark:opacity-30"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 30%, rgba(139, 92, 246, 0.4), transparent),
              radial-gradient(ellipse 60% 40% at 80% 70%, rgba(236, 72, 153, 0.3), transparent),
              radial-gradient(ellipse 50% 50% at 50% 50%, rgba(124, 58, 237, 0.15), transparent)
            `,
          }}
        />
        <motion.div
          className="absolute inset-0"
          animate={isOpening ? { opacity: 0.6 } : { opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            background: `
              radial-gradient(ellipse 100% 100% at 50% 0%, rgba(167, 139, 250, 0.12), transparent 50%),
              radial-gradient(ellipse 80% 60% at 100% 100%, rgba(236, 72, 153, 0.1), transparent)
            `,
          }}
        />
      </div>

      {/* Floating orbs - subtle, no 3D */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl bg-violet-400/25 dark:bg-violet-500/15"
        animate={
          isOpening
            ? { scale: 1.5, opacity: 0.3 }
            : {
                scale: [1, 1.05, 1],
                opacity: [0.25, 0.35, 0.25],
              }
        }
        transition={
          isOpening ? { duration: 1.2 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl bg-fuchsia-400/20 dark:bg-fuchsia-500/10"
        animate={
          isOpening
            ? { scale: 1.3, opacity: 0.2 }
            : {
                scale: [1, 1.08, 1],
                opacity: [0.2, 0.3, 0.2],
              }
        }
        transition={
          isOpening ? { duration: 1 } : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* Soft grid / noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
