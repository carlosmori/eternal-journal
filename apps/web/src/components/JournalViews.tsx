'use client';

import { motion } from 'framer-motion';
import { QuoteCard } from '@/components/QuoteCard';
import type { JournalEntry } from '@/lib/crypto';

export type ViewMode = 'list' | 'timeline' | 'grid' | 'calendar';

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

export function JournalTimelineView({ entries, isFavorite, onToggleFavorite, editable, onEdit, canDelete, onDelete, canSaveForever, onSaveForever, isSharedWithCommunity, onShareToCommunity, onUnshareCommunity }: JournalViewsProps) {
  return (
    <motion.div
      className="relative"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Vertical line */}
      <div className="absolute left-[5px] sm:left-[6px] top-2 bottom-2 w-0.5 bg-violet-200/60 dark:bg-violet-700/40 rounded-full" />

      <div className="space-y-0">
        {entries.map((item, idx) => (
          <motion.div key={idx} variants={staggerItem} className="relative flex gap-4 sm:gap-6 pl-8 sm:pl-10">
            {/* Dot */}
            <div className="absolute left-0 top-6 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-violet-500 dark:bg-violet-400 ring-4 ring-violet-100 dark:ring-violet-900/50" />
            <div className="flex-1 min-w-0 pb-8">
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
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function JournalGridView({ entries, isFavorite, onToggleFavorite, editable, onEdit, canDelete, onDelete, canSaveForever, onSaveForever, isSharedWithCommunity, onShareToCommunity, onUnshareCommunity }: JournalViewsProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
            compact
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

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length < totalCells) days.push(null);
  return days;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function JournalCalendarView({
  entries,
  isFavorite,
  onToggleFavorite,
  onDaySelect,
  selectedDay,
  editable,
  onEdit,
  canDelete,
  onDelete,
  canSaveForever,
  onSaveForever,
  isSharedWithCommunity,
  onShareToCommunity,
  onUnshareCommunity,
}: JournalViewsProps) {
  const now = new Date();
  const [year, month] = [now.getFullYear(), now.getMonth()];
  const days = getCalendarDays(year, month);

  const entriesByDate = new Map<string, DecryptedEntry[]>();
  for (const item of entries) {
    const key = item.entry.date;
    if (!entriesByDate.has(key)) entriesByDate.set(key, []);
    entriesByDate.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-3">
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-medium text-violet-500 dark:text-violet-400 py-1">
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const dateKey = toDateKey(year, month, d);
            const dayEntries = entriesByDate.get(dateKey) ?? [];
            const hasEntries = dayEntries.length > 0;
            const isSelected = selectedDay === dateKey;

            return (
              <button
                key={i}
                onClick={() => onDaySelect?.(dateKey)}
                className={`aspect-square rounded-lg text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  hasEntries
                    ? 'bg-violet-200/60 dark:bg-violet-700/50 text-violet-900 dark:text-violet-100 hover:bg-violet-300/70 dark:hover:bg-violet-600/60'
                    : 'text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-800/30'
                } ${isSelected ? 'ring-2 ring-violet-500 dark:ring-violet-400' : ''}`}
              >
                {d}
                {hasEntries && (
                  <span className="text-[10px] text-violet-500 dark:text-violet-400">
                    {dayEntries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && entriesByDate.has(selectedDay) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {entriesByDate.get(selectedDay)!.map((item, idx) => (
            <EntryCard
              key={idx}
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
          ))}
        </motion.div>
      )}

      {selectedDay && !entriesByDate.has(selectedDay) && (
        <p className="text-sm text-violet-600 dark:text-violet-400 py-4">
          No entries for this day in current page.
        </p>
      )}

      {!selectedDay && (
        <p className="text-sm text-violet-600 dark:text-violet-400 py-4">
          Select a day to view entries. Showing entries from current page only.
        </p>
      )}
    </div>
  );
}
