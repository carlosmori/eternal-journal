'use client';

import { useEffect, useState } from 'react';
import { sepoliaPublicClient } from '@/lib/sepoliaClient';

export function LatestBlock() {
  const [block, setBlock] = useState<{ number: bigint; hash: string; timestamp: bigint } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sepoliaPublicClient
      .getBlock()
      .then((b) => {
        setBlock({
          number: b.number!,
          hash: b.hash!,
          timestamp: b.timestamp,
        });
      })
      .catch((err) => setError(err?.message || 'Error al obtener el bloque'));
  }, []);

  if (error) {
    return (
      <div className="glass-card p-4 text-sm text-red-500 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!block) {
    return (
      <div className="glass-card p-4 text-sm text-violet-600 dark:text-violet-400 animate-pulse">
        Obteniendo último bloque...
      </div>
    );
  }

  return (
    <div className="glass-card p-4 text-sm">
      <p className="font-medium text-violet-900 dark:text-violet-100 mb-2">
        Último bloque (Base Sepolia)
      </p>
      <p>
        <span className="text-violet-600 dark:text-violet-400">#</span>{' '}
        {block.number.toString()}
      </p>
      <p className="truncate mt-1 text-violet-700 dark:text-violet-300 font-mono text-xs">
        {block.hash}
      </p>
      <p className="mt-1 text-violet-500 dark:text-violet-400">
        Timestamp: {new Date(Number(block.timestamp) * 1000).toLocaleString()}
      </p>
    </div>
  );
}
