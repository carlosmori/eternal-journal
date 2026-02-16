'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useSignMessage, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { bytesToHex, formatEther } from 'viem';
import { encryptEntry, estimateBytes, MAX_ENTRY_BYTES, SIGN_MESSAGE, deriveKey, type JournalEntry } from '@/lib/crypto';
import { ETERNAL_JOURNAL_ABI, ETERNAL_JOURNAL_ADDRESS } from '@/lib/contract';

type Step = 'explain' | 'connect' | 'unlock' | 'saving' | 'done';

interface SaveForeverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (encryptionKey?: Uint8Array) => void;
  entry: JournalEntry | null;
  requiresGoogleAuth?: boolean;
  onOpenSignIn?: () => void;
}

export function SaveForeverModal({ isOpen, onClose, onSuccess, entry, requiresGoogleAuth = false, onOpenSignIn }: SaveForeverModalProps) {
  const [step, setStep] = useState<Step>('explain');
  const [message, setMessage] = useState('');
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const hasCalledSuccessRef = useRef(false);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { data: fee } = useReadContract({
    address: ETERNAL_JOURNAL_ADDRESS,
    abi: ETERNAL_JOURNAL_ABI,
    functionName: 'fee',
  });
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed && !hasCalledSuccessRef.current) {
      hasCalledSuccessRef.current = true;
      setStep('done');
      onSuccess(encryptionKey ?? undefined);
      onClose();
    }
  }, [txConfirmed, onSuccess, onClose, encryptionKey]);

  useEffect(() => {
    if (isOpen && entry) {
      setStep('explain');
      setMessage('');
      setEncryptionKey(null);
      setTxHash(undefined);
      hasCalledSuccessRef.current = false;
    }
  }, [isOpen, entry]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'saving') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, step]);

  const byteEstimate = entry ? estimateBytes(entry) : 0;
  const isOverLimit = byteEstimate > MAX_ENTRY_BYTES;

  const handleUnderstand = () => {
    if (!entry) return;
    if (requiresGoogleAuth) {
      setMessage('You need a Google account to save on the blockchain.');
      return;
    }
    if (isOverLimit) {
      setMessage(`Entry exceeds the ${MAX_ENTRY_BYTES} byte limit.`);
      return;
    }
    if (!isConnected) {
      setStep('connect');
      openConnectModal?.();
      return;
    }
    if (!encryptionKey) {
      setStep('unlock');
      return;
    }
    setStep('saving');
    doSave();
  };

  const handleUnlock = async () => {
    setMessage('');
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKey(signature);
      setEncryptionKey(key);
      setStep('saving');
      doSave(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error signing';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setMessage('Signature cancelled.');
      } else {
        setMessage('Error: ' + msg.slice(0, 80));
      }
    }
  };

  const doSave = async (keyOverride?: Uint8Array) => {
    const key = keyOverride ?? encryptionKey;
    if (!entry || !key || !fee) {
      setMessage('Missing data. Please try again.');
      setStep('explain');
      return;
    }
    setMessage('');
    try {
      const encrypted = encryptEntry(key, entry);
      const encryptedHex = bytesToHex(encrypted);
      const hash = await writeContractAsync({
        address: ETERNAL_JOURNAL_ADDRESS,
        abi: ETERNAL_JOURNAL_ABI,
        functionName: 'addEntry',
        args: [encryptedHex],
        value: fee,
      });
      setTxHash(hash);
      setMessage('Transaction sent. Waiting for confirmation...');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected')) {
        setMessage('Transaction cancelled.');
      } else {
        setMessage('Error: ' + errorMsg.slice(0, 80));
      }
      setStep('explain');
    }
  };

  // After connect, check if we need unlock
  useEffect(() => {
    if (isOpen && step === 'connect' && isConnected && !encryptionKey) {
      setStep('unlock');
    }
  }, [isOpen, step, isConnected, encryptionKey]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-md overflow-y-auto"
      onClick={step !== 'saving' ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="liquid-glass w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 border-2 border-violet-200/50 dark:border-violet-600/40 shadow-2xl shadow-violet-900/20 my-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-violet-900 dark:text-white">
            Save forever on blockchain
          </h3>
          {step !== 'saving' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 dark:text-violet-400 hover:bg-violet-200/30 dark:hover:bg-violet-800/30 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {step === 'explain' && (
          <>
            <div className="space-y-3 text-violet-700 dark:text-violet-300 text-sm">
              <p>
                This will save your entry <strong>permanently</strong> on the blockchain. It cannot be edited or deleted.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                This action is irreversible. Make sure you want to keep this entry forever.
              </p>
              {entry && (
                <div className="p-3 rounded-lg bg-violet-100/50 dark:bg-violet-900/30 text-xs">
                  <p className="font-medium text-violet-800 dark:text-violet-200 truncate">{entry.title}</p>
                  <p className="text-violet-600 dark:text-violet-400 line-clamp-2 mt-0.5">{entry.description}</p>
                </div>
              )}
              {fee && (
                <p className="text-xs text-violet-500 dark:text-violet-400">
                  Fee: {formatEther(fee)} ETH
                </p>
              )}
            </div>
            {message && (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400">{message}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-violet-200/30 dark:bg-violet-800/30 text-violet-800 dark:text-violet-100 font-medium hover:bg-violet-200/50 dark:hover:bg-violet-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnderstand}
                disabled={isOverLimit}
                className="flex-1 py-2.5 rounded-xl glass-button disabled:opacity-50"
              >
                I understand, save forever
              </button>
            </div>
          </>
        )}

        {step === 'connect' && (
          <>
            <p className="text-violet-700 dark:text-violet-300 text-sm mb-4">
              Connect your wallet to save this entry on the blockchain.
            </p>
            <button
              onClick={() => openConnectModal?.()}
              className="w-full py-3 rounded-xl glass-button font-medium"
            >
              Connect wallet
            </button>
            <p className="mt-3 text-xs text-violet-500 dark:text-violet-400 text-center">
              After connecting, you&apos;ll sign once to unlock your journal.
            </p>
          </>
        )}

        {step === 'unlock' && (
          <>
            <p className="text-violet-700 dark:text-violet-300 text-sm mb-4">
              Sign with your wallet to prove it&apos;s you. Only you can ever read what you save.
            </p>
            {message && (
              <p className="mb-3 text-sm text-red-500 dark:text-red-400">{message}</p>
            )}
            <button
              onClick={handleUnlock}
              className="w-full py-3 rounded-xl glass-button font-medium"
            >
              Unlock & save forever
            </button>
          </>
        )}

        {step === 'saving' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-violet-400/60 border-t-violet-600 dark:border-violet-300/60 dark:border-t-violet-200 animate-spin mb-4" />
            <p className="text-violet-700 dark:text-violet-300 font-medium">
              Saving to blockchain...
            </p>
            {message && (
              <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">{message}</p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
