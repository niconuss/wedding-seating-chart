import { useDragGuest } from '@/dnd/useDragGuest';
import { useAppStore } from '@/store/useAppStore';
import { GuestStatusBadge } from './GuestStatusBadge';
import type { Guest } from '@/types/guest';

interface GuestItemProps {
  guest: Guest;
}

export function GuestItem({ guest }: GuestItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDragGuest(guest.id);
  const tables = useAppStore((s) => s.tables);
  const parties = useAppStore((s) => s.parties);
  const removeGuest = useAppStore((s) => s.removeGuest);
  const checkpoint = useAppStore((s) => s.checkpoint);
  const party = parties.find((p) => p.id === guest.partyId);
  const isLocked = (party?.locked ?? false) && (party?.memberIds.length ?? 0) > 1;
  const isSeated = guest.tableId !== null;
  const table = isSeated ? tables.find((t) => t.id === guest.tableId) : null;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    checkpoint();
    removeGuest(guest.id);
  }

  return (
    <div
      ref={setNodeRef}
      {...(isSeated ? {} : { ...attributes, ...listeners })}
      className={[
        'group flex items-center gap-1 px-2 py-1.5 rounded text-sm select-none transition-all',
        isSeated
          ? 'opacity-50 cursor-default'
          : isDragging
          ? 'opacity-30 cursor-grabbing'
          : isLocked
          ? 'cursor-grab hover:bg-teal-50 border border-teal-200 bg-teal-50/50'
          : 'cursor-grab hover:bg-gray-50',
      ].join(' ')}
    >
      {/* Grip handle — visual indicator that the row is draggable */}
      <div className="shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity leading-none select-none">
        ⠿
      </div>

      {/* Lock indicator */}
      {isLocked && !isSeated && (
        <span className="text-teal-400 text-xs" title={`Locked party: ${party?.name}`}>
          🔒
        </span>
      )}

      <span className="flex-1 text-gray-800 truncate">{guest.name}</span>

      {isSeated && table && (
        <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{table.name}</span>
      )}
      <GuestStatusBadge seated={isSeated} />

      {/* Delete button — visible on hover */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0"
        title="Remove guest"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
        </svg>
      </button>
    </div>
  );
}
