import { useDroppable } from '@dnd-kit/core';

export function useDropSeat(tableId: string, seatIndex: number) {
  const { setNodeRef, isOver } = useDroppable({
    id: `seat-${tableId}-${seatIndex}`,
    data: { tableId, seatIndex },
  });

  return { setNodeRef, isOver };
}
