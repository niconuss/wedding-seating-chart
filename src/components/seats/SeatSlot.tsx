import { useDropSeat } from '@/dnd/useDropSeat';

interface SeatSlotProps {
  tableId: string;
  seatIndex: number;
  occupied: boolean;
  style?: React.CSSProperties;
}

export function SeatSlot({ tableId, seatIndex, occupied, style }: SeatSlotProps) {
  const { setNodeRef, isOver } = useDropSeat(tableId, seatIndex, occupied);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      className={[
        'absolute w-7 h-7 rounded-full border-2 transition-all',
        isOver
          ? 'border-teal-500 bg-teal-100 scale-110'
          : occupied
          ? 'border-teal-300 bg-teal-50'
          : 'border-gray-300 bg-white',
        '-translate-x-1/2 -translate-y-1/2',
      ].join(' ')}
    />
  );
}
