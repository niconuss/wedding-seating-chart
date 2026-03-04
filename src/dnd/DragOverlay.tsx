import { DragOverlay } from '@dnd-kit/core';
import { useAppStore } from '@/store/useAppStore';

export function DragOverlayContent({ activeGuestId }: { activeGuestId: string | null }) {
  const guests = useAppStore((s) => s.guests);
  const parties = useAppStore((s) => s.parties);
  const sidebarSelectedIds = useAppStore((s) => s.sidebarSelectedIds);

  if (!activeGuestId) return <DragOverlay dropAnimation={null}>{null}</DragOverlay>;

  const guest = guests.find((g) => g.id === activeGuestId);
  if (!guest) return <DragOverlay dropAnimation={null}>{null}</DragOverlay>;

  const party = parties.find((p) => p.id === guest.partyId);
  const isLocked = party?.locked && (party?.memberIds.length ?? 0) > 1;
  const isMultiDrag = sidebarSelectedIds.includes(activeGuestId) && sidebarSelectedIds.length > 1;

  return (
    <DragOverlay dropAnimation={null}>
      <div style={{ transform: 'translate(8px, 16px)' }}>
        <div className="bg-white border-2 border-teal-400 rounded-lg px-3 py-2 shadow-xl text-sm font-medium text-gray-800 cursor-grabbing select-none">
          {isMultiDrag ? (
            <div className="flex items-center gap-2">
              <span>{guest.name}</span>
              <span className="bg-teal-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                +{sidebarSelectedIds.length - 1}
              </span>
            </div>
          ) : isLocked ? (
            <div>
              <div className="text-xs text-teal-500 font-semibold mb-1">
                Party: {party?.name} ({party?.memberIds.length})
              </div>
              <div>{guest.name}</div>
            </div>
          ) : (
            <div>{guest.name}</div>
          )}
        </div>
      </div>
    </DragOverlay>
  );
}
