'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/components/ThemeProvider';
import { AddQuoteModal } from '@/components/AddQuoteModal';
import { QuoteCard } from '@/components/QuoteCard';
import { LatestBlock } from '@/components/LatestBlock';
import { useEffect, useState } from 'react';

interface JournalEntry {
  id: number;
  quote: string;
}

export default function JournalPage() {
  const { theme, toggleTheme } = useTheme();
  const [quotes, setQuotes] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/journal');
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleQuoteAdded = () => {
    fetchQuotes();
    setModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-violet-50 to-fuchsia-100 dark:from-violet-950 dark:via-violet-900 dark:to-fuchsia-950 transition-colors">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/40 dark:bg-violet-950/40 border-b border-violet-200/50 dark:border-violet-800/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" className="text-violet-900 dark:text-white font-semibold text-lg">
              Eternal Journal
            </a>
            <div className="flex items-center gap-3">
              <ConnectButton />
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl bg-white/50 dark:bg-violet-800/50 backdrop-blur-sm flex items-center justify-center text-violet-700 dark:text-violet-200 hover:bg-white/70 dark:hover:bg-violet-700/50 transition-colors"
                aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Agregar cita
              </button>
            </div>
          </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-6">
            Mis citas
          </h2>

          <div className="mb-8">
            <LatestBlock />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-6 bg-violet-200/50 dark:bg-violet-800/50 rounded" />
                  <div className="h-4 bg-violet-200/30 dark:bg-violet-800/30 rounded mt-2 w-3/4" />
                </div>
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <div className="glass-card p-12 text-center text-violet-600 dark:text-violet-400">
              Aún no hay citas. ¡Agrega la primera!
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((entry) => (
                <QuoteCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
      </div>

      <AddQuoteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleQuoteAdded}
      />
    </main>
  );
}
