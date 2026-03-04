import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useAppStore } from '@/store/useAppStore';
import type { DragData } from '@/dnd/DndProvider';

interface CanvasGuestChipProps {
  guestId: string;
  x: number;
  y: number;
}

export function CanvasGuestChip({ guestId, x, y }: CanvasGuestChipProps) {
  const guest = useAppStore((s) => s.guests.find((g) => g.id === guestId));
  const moveCanvasGuest = useAppStore((s) => s.moveCanvasGuest);
  const removeGuestFromCanvas = useAppStore((s) => s.removeGuestFromCanvas);

  const startPos = useRef<{ x: number; y: number; mouseX: number; mouseY: number } | null>(null);

  const dragData: DragData = { guestId, source: 'canvas' };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-guest-${guestId}`,
    data: dragData,
  });

  if (!guest) return null;

  function handleMouseDown(e: React.MouseEvent) {
    // Only handle primary button, and not × button clicks
    if (e.button !== 0) return;
    e.stopPropagation();

    startPos.current = { x, y, mouseX: e.clientX, mouseY: e.clientY };

    function onMouseMove(me: MouseEvent) {
      if (!startPos.current) return;
      const { scale } = useAppStore.getState().canvasTransform;
      const dx = (me.clientX - startPos.current.mouseX) / scale;
      const dy = (me.clientY - startPos.current.mouseY) / scale;
      moveCanvasGuest(guestId, startPos.current.x + dx, startPos.current.y + dy);
    }

    function onMouseUp() {
      startPos.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  const parts = guest.name.split(' ');
  const initials = parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        opacity: isDragging ? 0.25 : 0.7,
        cursor: 'grab',
        zIndex: 10,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border-2 border-dashed border-teal-400 shadow-sm text-xs font-medium text-gray-700 whitespace-nowrap">
        <div className="w-4 h-4 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
          <span className="text-[7px] font-bold text-white leading-none">{initials}</span>
        </div>
        <span>{guest.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); removeGuestFromCanvas(guestId); }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors font-bold leading-none text-[10px]"
          title="Remove from canvas"
        >
          ×
        </button>
      </div>
    </div>
  );
}
