import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';
import type { DragData } from '@/dnd/DndProvider';

interface SeatedGuestChipProps {
  guestId: string;
  tableId: string;
  seatIndex: number;
  style?: React.CSSProperties;
  labelAbove?: boolean;
}

export function SeatedGuestChip({ guestId, tableId, seatIndex, style, labelAbove }: SeatedGuestChipProps) {
  const guests = useAppStore((s) => s.guests);
  const parties = useAppStore((s) => s.parties);
  const unseatGuest = useAppStore((s) => s.unseatGuest);
  const seatGuestAtTable = useAppStore((s) => s.seatGuestAtTable);
  const checkpoint = useAppStore((s) => s.checkpoint);

  const guest = guests.find((g) => g.id === guestId);
  const party = guest ? parties.find((p) => p.id === guest.partyId) : undefined;
  const isLocked = (party?.locked ?? false) && (party?.memberIds.length ?? 0) > 1;

  const dragData: DragData = {
    guestId,
    partyMemberIds: isLocked ? party?.memberIds : undefined,
    isLocked,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-chip-${guestId}`,
    data: dragData,
  });

  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  if (!guest) return null;

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    checkpoint();
    unseatGuest(guestId);
    seatGuestAtTable(tableId, seatIndex, null);
  }
  const parts = guest.name.split(' ');

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, zIndex: 20 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-dashed border-teal-300 bg-white"
        {...attributes}
        {...listeners}
      />
    );
  }

  return (
    <>
      {/* Cursor-following tooltip — portalled to body to escape CSS transform ancestor */}
      {tooltipPos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap"
        >
          {guest.name}
        </div>,
        document.body
      )}
    <div
      ref={setNodeRef}
      style={{ ...style, zIndex: 20 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltipPos(null)}
      {...attributes}
      {...listeners}
    >
      <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-teal-400 shadow-sm hover:scale-105 transition-transform">
        <span className="sr-only">{guest.name}</span>
        {/* Remove button */}
        <button
          onClick={handleRemove}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm text-gray-400 hover:text-gray-700 transition-colors"
          title="Remove guest"
        >
          <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
          </svg>
        </button>
        {/* Initials */}
        <span className="text-[8px] font-bold text-white leading-none">
          {parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
        </span>
      </div>
      {/* Name label — diagonal above or below depending on seat position */}
      <div
        style={labelAbove === true ? {
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          marginBottom: '3px',
          transformOrigin: 'left bottom',
          transform: 'rotate(-45deg)',
          whiteSpace: 'nowrap',
          fontSize: '9px',
          color: '#4b5563',
          fontWeight: 500,
          pointerEvents: 'none',
        } : labelAbove === false ? {
          position: 'absolute',
          top: '100%',
          right: '50%',      // right edge at chip center-x
          marginTop: '3px',
          transformOrigin: 'right top', // pivot at the end of the text
          transform: 'rotate(-45deg)',  // same SW→NE direction
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontSize: '9px',
          color: '#4b5563',
          fontWeight: 500,
          pointerEvents: 'none',
        } : undefined}
        className={labelAbove === undefined ? 'absolute top-8 left-1/2 -translate-x-1/2 text-[9px] text-gray-600 whitespace-nowrap font-medium pointer-events-none' : undefined}
      >
        {guest.name}
      </div>
    </div>
    </>
  );
}
