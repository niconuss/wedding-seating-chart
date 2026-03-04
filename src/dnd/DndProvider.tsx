import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { validatePartyDrop } from '@/utils/adjacency';
import { DragOverlayContent } from './DragOverlay';

export interface DragData {
  guestId: string;
  partyMemberIds?: string[];
  isLocked?: boolean;
}

export function AppDndProvider({ children }: { children: React.ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { guests, parties, tables, seatGuest, seatGuestAtTable, unseatGuest, setActiveError, checkpoint } =
    useAppStore();
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (data?.guestId) setActiveGuestId(data.guestId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuestId(null);
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    const dropData = over.data.current as { tableId: string; seatIndex: number } | undefined;
    if (!dropData) return;

    const { tableId, seatIndex } = dropData;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const targetSeat = table.seats.find((s) => s.index === seatIndex);
    if (!targetSeat) return;

    if (dragData.isLocked && dragData.partyMemberIds && dragData.partyMemberIds.length > 1) {
      // Party drop — requires empty target seat
      if (targetSeat.guestId !== null) return;
      const party = parties.find((p) => p.memberIds.includes(dragData.guestId));
      if (!party) return;
      const assignments = validatePartyDrop(party, guests, table, seatIndex);
      if (!assignments) {
        setActiveError(
          `Not enough adjacent seats for "${party.name}" (${party.memberIds.length} guests). Try a different seat or table.`
        );
        return;
      }
      checkpoint();
      for (const gId of party.memberIds) {
        const g = guests.find((g) => g.id === gId);
        if (g?.tableId) {
          unseatGuest(gId);
          const prevTable = tables.find((t) => t.id === g.tableId);
          if (prevTable) {
            const prevSeat = prevTable.seats.find((s) => s.guestId === gId);
            if (prevSeat) seatGuestAtTable(prevTable.id, prevSeat.index, null);
          }
        }
      }
      for (const a of assignments) {
        seatGuest(a.guestId, a.tableId, a.seatIndex);
        seatGuestAtTable(a.tableId, a.seatIndex, a.guestId);
      }
    } else {
      // Single guest drop
      const guestId = dragData.guestId;
      const guest = guests.find((g) => g.id === guestId);
      if (!guest || targetSeat.guestId === guestId) return; // no-op if same seat

      checkpoint();

      if (targetSeat.guestId !== null) {
        // Occupied — swap the two guests
        const displacedGuestId = targetSeat.guestId;
        const prevTableId = guest.tableId;
        const prevSeatIndex = guest.seatIndex;
        // Clear dragged guest's old seat on the table
        if (prevTableId && prevSeatIndex !== null) {
          seatGuestAtTable(prevTableId, prevSeatIndex, null);
        }
        unseatGuest(displacedGuestId);
        if (guest.tableId) unseatGuest(guestId);
        // Place dragged guest at target
        seatGuest(guestId, tableId, seatIndex);
        seatGuestAtTable(tableId, seatIndex, guestId);
        // Place displaced guest at dragged guest's old seat (if they had one)
        if (prevTableId && prevSeatIndex !== null) {
          seatGuest(displacedGuestId, prevTableId, prevSeatIndex);
          seatGuestAtTable(prevTableId, prevSeatIndex, displacedGuestId);
        }
      } else {
        // Empty seat — normal move
        if (guest.tableId) {
          const prevTable = tables.find((t) => t.id === guest.tableId);
          if (prevTable && guest.seatIndex !== null) {
            seatGuestAtTable(prevTable.id, guest.seatIndex, null);
          }
          unseatGuest(guestId);
        }
        seatGuest(guestId, tableId, seatIndex);
        seatGuestAtTable(tableId, seatIndex, guestId);
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlayContent activeGuestId={activeGuestId} />
    </DndContext>
  );
}
