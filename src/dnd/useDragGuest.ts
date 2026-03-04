import { useDraggable } from '@dnd-kit/core';
import { useAppStore } from '@/store/useAppStore';
import type { DragData } from './DndProvider';

export function useDragGuest(guestId: string) {
  const guests = useAppStore((s) => s.guests);
  const parties = useAppStore((s) => s.parties);

  const guest = guests.find((g) => g.id === guestId);
  const party = parties.find((p) => p.id === guest?.partyId);
  const isLocked = (party?.locked ?? false) && (party?.memberIds.length ?? 0) > 1;

  const dragData: DragData = {
    guestId,
    partyMemberIds: isLocked ? party?.memberIds : undefined,
    isLocked,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${guestId}`,
    data: dragData,
    disabled: guest?.tableId !== null,
  });

  return { attributes, listeners, setNodeRef, isDragging };
}
