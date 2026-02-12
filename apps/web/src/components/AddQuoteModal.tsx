'use client';

import { useEffect, useRef, useState } from 'react';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddQuoteModal({ isOpen, onClose, onSuccess }: AddQuoteModalProps) {
  const [quote, setQuote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuote('');
      setMessage('');
      setTimeout(() => textareaRef.current?.focus(), 100);
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

  const handleSubmit = async () => {
    const trimmed = quote.trim();
    if (!trimmed) {
      setMessage('Escribe una cita antes de guardar.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: trimmed }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        setMessage('Error al guardar.');
      }
    } catch {
      setMessage('Error de conexión.');
    } finally {
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
            Nueva cita
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Escribe tu cita aquí..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/50 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
        />

        {message && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{message}</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-violet-200/50 dark:bg-violet-800/50 text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-200/70 dark:hover:bg-violet-800/70 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
