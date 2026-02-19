'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface EditingEntry {
  id: number | string;
  date: string;
  title: string;
  description: string;
}

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'guest' | 'web2';
  editEntry?: EditingEntry | null;
  onGuestAdd?: (data: { date: string; title: string; description: string }) => void;
  onWeb2Add?: (data: { date: string; title: string; description: string }) => Promise<void>;
  onGuestUpdate?: (id: number, data: { date: string; title: string; description: string }) => void;
  onWeb2Update?: (
    id: string,
    data: { date: string; title: string; description: string },
  ) => Promise<void>;
}

export function AddQuoteModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  editEntry,
  onGuestAdd,
  onWeb2Add,
  onGuestUpdate,
  onWeb2Update,
}: AddQuoteModalProps) {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editEntry;

  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setDate(editEntry.date);
        setTitle(editEntry.title);
        setDescription(editEntry.description);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setTitle('');
        setDescription('');
      }
      setMessage('');
      setTimeout(() => titleRef.current?.focus(), 200);
    }
  }, [isOpen, editEntry]);

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMessage('Enter a title for the entry.');
      return;
    }
    if (!description.trim()) {
      setMessage('Enter a description for the entry.');
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
        if (isEditing && editEntry) {
          onGuestUpdate?.(editEntry.id as number, entryData);
        } else {
          onGuestAdd?.(entryData);
        }
        setLoading(false);
        onSuccess();
        return;
      }

      if (isEditing && editEntry) {
        await onWeb2Update?.(editEntry.id as string, entryData);
      } else {
        await onWeb2Add?.(entryData);
      }
      setLoading(false);
      onSuccess();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessage('Error saving: ' + errorMsg.slice(0, 100));
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading;

  const buttonLabel = loading
    ? 'Saving...'
    : isEditing
      ? 'Update entry'
      : mode === 'web2'
        ? 'Save entry'
        : 'Save locally';

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
        className="liquid-glass w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 border-2 border-violet-200/50 dark:border-violet-600/40 shadow-2xl shadow-violet-900/20 my-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-2 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-violet-900 dark:text-white truncate">
            {isEditing ? 'Edit entry' : 'Capture this moment'}
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

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-violet-800 dark:text-violet-200 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="glass-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-800 dark:text-violet-200 mb-1">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="glass-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-800 dark:text-violet-200 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write from the heart..."
              rows={4}
              className="glass-input resize-none"
            />
          </div>
        </div>

        {mode === 'guest' && !isEditing && (
          <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Saved on this device only
          </div>
        )}

        {message && (
          <p
            className={`mt-2 text-sm ${message.includes('sent') ? 'text-violet-600 dark:text-violet-300' : 'text-red-500 dark:text-red-400'}`}
          >
            {message}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-violet-200/30 dark:bg-violet-800/30 text-violet-800 dark:text-violet-100 font-medium hover:bg-violet-200/50 dark:hover:bg-violet-800/50 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 py-2.5 glass-button disabled:opacity-50"
          >
            {buttonLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
