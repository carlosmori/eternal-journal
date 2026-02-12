import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-200 via-violet-100 to-fuchsia-200 dark:from-violet-950 dark:via-violet-900 dark:to-fuchsia-950 flex items-center justify-center p-6">
      <div className="fixed top-4 right-4 flex items-center gap-3 z-10">
        <ConnectButton />
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="glass-card p-12 text-center max-w-md">
          <h1 className="text-4xl font-bold text-violet-900 dark:text-white mb-2 tracking-tight">
            Eternal Journal
          </h1>
          <p className="text-violet-700/90 dark:text-violet-200/90 mb-8 text-lg">
            Your journal lasts forever
          </p>
          <Link
            href="/journal"
            className="inline-block px-8 py-3 rounded-xl bg-violet-600/80 hover:bg-violet-500 dark:bg-white/20 dark:hover:bg-white/30 backdrop-blur-md text-white font-medium transition-all duration-300 hover:scale-105"
          >
            Enter
          </Link>
        </div>
      </div>
    </main>
  );
}
