import React from 'react';
import { CIRCLE_RADIUS } from '@/utils/constants';
import { seatPosition } from '@/utils/geometry';
import { SeatSlot } from '@/components/seats/SeatSlot';
import { SeatedGuestChip } from '@/components/seats/SeatedGuestChip';
import { TableNameLabel } from './TableNameLabel';
import type { Table } from '@/types/table';

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'block' }}>
      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
    </svg>
  );
}

interface CircleTableProps {
  table: Table;
  isEditing?: boolean;
  onEditEnd?: () => void;
  onDoubleClickName?: () => void;
}

const TOTAL_SIZE = (CIRCLE_RADIUS + 60) * 2;

export function CircleTable({ table, isEditing, onEditEnd, onDoubleClickName }: CircleTableProps) {
  const cx = TOTAL_SIZE / 2;
  const cy = TOTAL_SIZE / 2;
  const seatedCount = table.seats.filter((s) => s.guestId !== null).length;
  const totalSeats = table.seats.length;

  return (
    <div style={{ width: TOTAL_SIZE, height: TOTAL_SIZE, position: 'relative' }}>
      {/* SVG table shape */}
      <svg
        width={TOTAL_SIZE}
        height={TOTAL_SIZE}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={CIRCLE_RADIUS}
          fill="#f0fdfa"
          stroke="#5eead4"
          strokeWidth="2"
        />
        {/* Seat count — below center */}
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fill="#0f766e" fontWeight="500">
          {seatedCount}/{totalSeats}
        </text>
      </svg>

      {/* Name label — centered inside circle, above count */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy - 18,
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickName?.(); }}
      >
        <TableNameLabel
          tableId={table.id}
          name={table.name}
          isEditing={isEditing}
          onEditEnd={onEditEnd}
        />
        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onDoubleClickName?.(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600 transition-colors leading-none flex-shrink-0"
            style={{ padding: 1, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            title="Rename"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {/* Seat slots and guest chips */}
      {table.seats.map((seat) => {
        const pos = seatPosition('circle', seat.index, totalSeats);
        const style = { left: cx + pos.x, top: cy + pos.y };
        return (
          <React.Fragment key={seat.index}>
            <SeatSlot tableId={table.id} seatIndex={seat.index} occupied={!!seat.guestId} style={style} />
            {seat.guestId && (
              <SeatedGuestChip guestId={seat.guestId} tableId={table.id} seatIndex={seat.index} style={style} labelAbove={pos.y < 0} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
