import {
  DndContext,
  PointerSensor,
  pointerWithin,
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
  source?: 'canvas';
}


export function AppDndProvider({ children }: { children: React.ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const {
    guests, parties, tables,
    seatGuest, seatGuestAtTable, unseatGuest,
    setActiveError, checkpoint,
    placeGuestOnCanvas, moveCanvasGuest, removeGuestFromCanvas,
    canvasTransform,
  } = useAppStore();
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (data?.guestId) setActiveGuestId(data.guestId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuestId(null);
    const { active, over } = event;

    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    const guestId = dragData.guestId;

    // ── Null drop (released on empty canvas) ────────────────────────────────
    if (!over) {
      const translated = active.rect.current.translated;
      if (!translated) return;

      // Convert viewport center of dragged element → canvas coordinates
      const areaEl = document.getElementById('canvas-area');
      if (!areaEl) return;
      const areaRect = areaEl.getBoundingClientRect();
      const viewportX = translated.left + translated.width / 2;
      const viewportY = translated.top + translated.height / 2;
      const canvasX = (viewportX - areaRect.left - canvasTransform.x) / canvasTransform.scale;
      const canvasY = (viewportY - areaRect.top - canvasTransform.y) / canvasTransform.scale;

      // Only act on canvas-area drops — releasing outside the canvas (sidebar, toolbar, etc.)
      // is treated as a cancel: canvas guests stay put, seated guests stay seated.
      const droppedInCanvas =
        viewportX >= areaRect.left &&
        viewportX <= areaRect.right &&
        viewportY >= areaRect.top &&
        viewportY <= areaRect.bottom;

      if (!droppedInCanvas) return;

      if (dragData.source === 'canvas') {
        // Repositioning a canvas guest — just move it
        moveCanvasGuest(guestId, canvasX, canvasY);
      } else {
        // Any guest dragged to empty canvas → park as floating chip
        placeGuestOnCanvas(guestId, canvasX, canvasY);
      }
      return;
    }

    // ── Drop on a seat droppable ─────────────────────────────────────────────
    const dropData = over.data.current as { tableId: string; seatIndex: number } | undefined;
    if (!dropData) return;

    const { tableId, seatIndex } = dropData;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const targetSeat = table.seats.find((s) => s.index === seatIndex);
    if (!targetSeat) return;

    const wasOnCanvas = dragData.source === 'canvas';

    if (dragData.isLocked && dragData.partyMemberIds && dragData.partyMemberIds.length > 1) {
      // Party drop — requires empty target seat
      if (targetSeat.guestId !== null) return;
      const party = parties.find((p) => p.memberIds.includes(guestId));
      if (!party) return;
      const assignments = validatePartyDrop(party, guests, table, seatIndex);
      if (!assignments) {
        setActiveError(
          `Not enough adjacent seats for "${party.name}" (${party.memberIds.length} guests). Try a different seat or table.`
        );
        return;
      }
      checkpoint();
      if (wasOnCanvas) removeGuestFromCanvas(guestId);
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
      const guest = guests.find((g) => g.id === guestId);
      if (!guest || targetSeat.guestId === guestId) return; // no-op if same seat

      checkpoint();

      if (wasOnCanvas) removeGuestFromCanvas(guestId);

      if (targetSeat.guestId !== null) {
        // Occupied — swap the two guests
        const displacedGuestId = targetSeat.guestId;
        const prevTableId = guest.tableId;
        const prevSeatIndex = guest.seatIndex;
        if (prevTableId && prevSeatIndex !== null) {
          seatGuestAtTable(prevTableId, prevSeatIndex, null);
        }
        unseatGuest(displacedGuestId);
        if (guest.tableId) unseatGuest(guestId);
        seatGuest(guestId, tableId, seatIndex);
        seatGuestAtTable(tableId, seatIndex, guestId);
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
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlayContent activeGuestId={activeGuestId} />
    </DndContext>
  );
}
