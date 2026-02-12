'use client';

import { useEffect, useRef, useState } from 'react';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { bytesToHex, formatEther } from 'viem';
import { encryptEntry, estimateBytes, MAX_ENTRY_BYTES, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  encryptionKey: Uint8Array | null;
}

export function AddQuoteModal({ isOpen, onClose, onSuccess, encryptionKey }: AddQuoteModalProps) {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const { writeContractAsync } = useWriteContract();

  const { data: fee } = useReadContract({
    address: ETERNAL_JOURNAL_ADDRESS,
    abi: ETERNAL_JOURNAL_ABI,
    functionName: 'fee',
  });

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const hasCalledSuccessRef = useRef(false);

  useEffect(() => {
    if (txConfirmed && !hasCalledSuccessRef.current) {
      hasCalledSuccessRef.current = true;
      setLoading(false);
      onSuccess();
    }
  }, [txConfirmed, onSuccess]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTitle('');
      setDescription('');
      setMessage('');
      setTxHash(undefined);
      hasCalledSuccessRef.current = false;
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  const currentEntry: JournalEntry = { date, title, description };
  const byteEstimate = title || description ? estimateBytes(currentEntry) : 0;
  const isOverLimit = byteEstimate > MAX_ENTRY_BYTES;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMessage('Enter a title for the entry.');
      return;
    }
    if (!description.trim()) {
      setMessage('Enter a description for the entry.');
      return;
    }
    if (!encryptionKey) {
      setMessage('Unlock the journal first.');
      return;
    }
    if (isOverLimit) {
      setMessage(`Entry exceeds the ${MAX_ENTRY_BYTES} byte limit.`);
      return;
    }
    if (!fee) {
      setMessage('Could not read contract fee.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const entry: JournalEntry = {
        date,
        title: title.trim(),
        description: description.trim(),
      };

      const encrypted = encryptEntry(encryptionKey, entry);
      const encryptedHex = bytesToHex(encrypted);

      const hash = await writeContractAsync({
        address: ETERNAL_JOURNAL_ADDRESS,
        abi: ETERNAL_JOURNAL_ABI,
        functionName: 'addEntry',
        args: [encryptedHex],
        value: fee,
      });

      setTxHash(hash);
      setMessage('Transaction sent, waiting for confirmation...');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected')) {
        setMessage('Transaction cancelled by user.');
      } else {
        setMessage('Error saving: ' + errorMsg.slice(0, 100));
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-violet-900 dark:text-white">
            New entry
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-violet-700 dark:text-violet-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/50 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-700 dark:text-violet-300 mb-1">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title..."
              className="w-full px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/50 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-700 dark:text-violet-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write the entry description..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/50 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-between text-xs text-violet-500 dark:text-violet-400">
          <span className={isOverLimit ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
            {byteEstimate > 0 ? `~${byteEstimate} / ${MAX_ENTRY_BYTES} bytes` : ''}
          </span>
          {fee && (
            <span>Fee: {formatEther(fee)} ETH</span>
          )}
        </div>

        {message && (
          <p className={`mt-2 text-sm ${message.includes('sent') ? 'text-violet-500 dark:text-violet-400' : 'text-red-500 dark:text-red-400'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-violet-200/50 dark:bg-violet-800/50 text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-200/70 dark:hover:bg-violet-800/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || isOverLimit || !encryptionKey}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Save to blockchain'}
          </button>
        </div>
      </div>
    </div>
  );
}
