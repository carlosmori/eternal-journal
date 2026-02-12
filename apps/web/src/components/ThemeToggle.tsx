'use client';

import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-white/50 dark:bg-violet-800/50 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/70 dark:hover:bg-violet-700/50 transition-colors z-10"
      aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
