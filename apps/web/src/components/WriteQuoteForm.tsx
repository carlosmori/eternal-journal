'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface WriteQuoteFormProps {
  mode: 'guest' | 'web2';
  onGuestAdd?: (data: { date: string; title: string; description: string }) => void;
  onWeb2Add?: (data: { date: string; title: string; description: string }) => Promise<void>;
  entryCount?: number;
  onGoToJournal?: () => void;
}

export function WriteQuoteForm({ mode, onGuestAdd, onWeb2Add, entryCount = 0, onGoToJournal }: WriteQuoteFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMessage('Give your thought a title.');
      return;
    }
    if (!description.trim()) {
      setMessage('Write something from the heart.');
      return;
    }

    const entryData = {
      date,
      title: title.trim(),
      description: description.trim(),
    };

    setLoading(true);
    setMessage('');

    try {
      if (mode === 'guest') {
        onGuestAdd?.(entryData);
      } else {
        await onWeb2Add?.(entryData);
      }
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      titleRef.current?.focus();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessage('Error saving: ' + errorMsg.slice(0, 100));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <div className="text-center mb-2">
          <h2 className="text-lg font-semibold text-violet-900 dark:text-white">
            Capture this moment
          </h2>
          <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">
            {mode === 'guest' ? 'Saved on this device only' : 'Encrypted & synced'}
          </p>
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="glass-input text-sm"
        />

        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          className="glass-input"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write from the heart..."
          rows={5}
          className="glass-input resize-none"
        />

        {message && (
          <p className="text-sm text-red-500 dark:text-red-400">{message}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 glass-button disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Saving...' : saved ? 'Saved' : 'Save entry'}
        </motion.button>
      </div>

      {onGoToJournal && entryCount > 0 && (
        <button
          onClick={onGoToJournal}
          className="mt-4 flex items-center justify-center gap-2 mx-auto text-xs font-medium text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          My Journal ({entryCount})
        </button>
      )}
    </motion.div>
  );
}
