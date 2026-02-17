'use client';

import { motion } from 'framer-motion';
import { QuoteCard } from '@/components/QuoteCard';
import type { JournalEntry } from '@/lib/crypto';

export type ViewMode = 'list';

interface DecryptedEntry {
  entry: JournalEntry;
  timestamp: number;
  entryIndex: number | string;
  source?: 'guest' | 'web2' | 'web3';
}

interface JournalViewsProps {
  entries: DecryptedEntry[];
  isFavorite: (id: number | string) => boolean;
  onToggleFavorite: (id: number | string) => void;
  viewMode: ViewMode;
  onDaySelect?: (date: string) => void;
  selectedDay?: string | null;
  editable?: boolean;
  onEdit?: (entryIndex: number | string, entry: JournalEntry) => void;
  canDelete?: boolean;
  onDelete?: (entryIndex: number | string) => void;
  canSaveForever?: boolean;
  onSaveForever?: (entryIndex: number | string, entry: JournalEntry) => void;
  isSharedWithCommunity?: (entryIndex: number | string) => boolean;
  onShareToCommunity?: (entryIndex: number | string, entry: JournalEntry) => void;
  onUnshareCommunity?: (entryIndex: number | string) => void;
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

function EntryCard({
  item,
  isFavorite,
  onToggleFavorite,
  compact,
  editable,
  onEdit,
  canDelete,
  onDelete,
  canSaveForever,
  onSaveForever,
  isSharedWithCommunity,
  onShareToCommunity,
  onUnshareCommunity,
}: {
  item: DecryptedEntry;
  isFavorite: (id: number | string) => boolean;
  onToggleFavorite: (id: number | string) => void;
  compact?: boolean;
  editable?: boolean;
  onEdit?: (entryIndex: number | string, entry: JournalEntry) => void;
  canDelete?: boolean;
  onDelete?: (entryIndex: number | string) => void;
  canSaveForever?: boolean;
  onSaveForever?: (entryIndex: number | string, entry: JournalEntry) => void;
  isSharedWithCommunity?: (entryIndex: number | string) => boolean;
  onShareToCommunity?: (entryIndex: number | string, entry: JournalEntry) => void;
  onUnshareCommunity?: (entryIndex: number | string) => void;
}) {
  const showCommunity = item.source === 'web2' || item.source === 'web3';
  return (
    <QuoteCard
      entry={item.entry}
      timestamp={item.timestamp}
      entryIndex={item.entryIndex}
      isFavorite={isFavorite(item.entryIndex)}
      onToggleFavorite={onToggleFavorite}
      compact={compact}
      editable={editable}
      onEdit={onEdit}
      canDelete={canDelete}
      onDelete={onDelete}
      canSaveForever={canSaveForever}
      onSaveForever={onSaveForever}
      isForever={item.source === 'web3'}
      isSharedWithCommunity={showCommunity && isSharedWithCommunity ? isSharedWithCommunity(item.entryIndex) : false}
      onShareToCommunity={showCommunity ? onShareToCommunity : undefined}
      onUnshareCommunity={showCommunity ? onUnshareCommunity : undefined}
    />
  );
}

export function JournalListView({ entries, isFavorite, onToggleFavorite, editable, onEdit, canDelete, onDelete, canSaveForever, onSaveForever, isSharedWithCommunity, onShareToCommunity, onUnshareCommunity }: JournalViewsProps) {
  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {entries.map((item, idx) => (
        <motion.div key={idx} variants={staggerItem}>
          <EntryCard
            item={item}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            editable={editable}
            onEdit={onEdit}
            canDelete={canDelete}
            onDelete={onDelete}
            canSaveForever={canSaveForever}
            onSaveForever={onSaveForever}
            isSharedWithCommunity={isSharedWithCommunity}
            onShareToCommunity={onShareToCommunity}
            onUnshareCommunity={onUnshareCommunity}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
