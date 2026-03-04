import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { checkSnap } from './useSnapToEdge';

export function useTableDrag(tableId: string) {
  const { tables, moveTable, moveSnappedPair, snapTables, unsnapTable, setIsDraggingTable } =
    useAppStore();
  const canvasTransform = useAppStore((s) => s.canvasTransform);
  const isDraggingRef = useRef(false);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startTableRef = useRef({ x: 0, y: 0 });
  // May switch to a duplicate table ID if option+drag
  const activeDragIdRef = useRef(tableId);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) return; // shift+drag pans the canvas — let it bubble up
      e.stopPropagation();
      e.preventDefault();

      const { checkpoint, addTable } = useAppStore.getState();
      checkpoint();

      let dragId = tableId;

      if (e.altKey) {
        // Option+drag: duplicate the table and drag the copy
        const original = useAppStore.getState().tables.find((t) => t.id === tableId)!;
        const newId = addTable(original.type, original.x + 20, original.y + 20, original.seats.length);
        dragId = newId;
      }

      activeDragIdRef.current = dragId;
      isDraggingRef.current = true;
      setIsDraggingTable(true);

      const table = useAppStore.getState().tables.find((t) => t.id === dragId)!;
      startMouseRef.current = { x: e.clientX, y: e.clientY };
      startTableRef.current = { x: table.x, y: table.y };

      const scale = canvasTransform.scale;

      function onMove(ev: MouseEvent) {
        if (!isDraggingRef.current) return;
        const id = activeDragIdRef.current;
        const dx = (ev.clientX - startMouseRef.current.x) / scale;
        const dy = (ev.clientY - startMouseRef.current.y) / scale;
        const proposedX = startTableRef.current.x + dx;
        const proposedY = startTableRef.current.y + dy;

        const currentTables = useAppStore.getState().tables;
        const currentTable = currentTables.find((t) => t.id === id)!;
        if (!currentTable) return;

        const isInGroup = currentTable.snappedTo !== null ||
          currentTables.some((t) => t.snappedTo === currentTable.id);

        if (isInGroup) {
          const prevX = currentTable.x;
          const prevY = currentTable.y;
          let moveDx = proposedX - prevX;
          let moveDy = proposedY - prevY;

          if (currentTable.snappedTo) {
            const snapPartner = currentTables.find((t) => t.id === currentTable.snappedTo);
            if (snapPartner) {
              const dist = Math.sqrt(
                Math.pow(proposedX - snapPartner.x, 2) + Math.pow(proposedY - snapPartner.y, 2)
              );
              if (dist > 250) {
                unsnapTable(id);
                const partnersSnappedToThis = currentTables.filter((t) => t.snappedTo === id);
                for (const p of partnersSnappedToThis) unsnapTable(p.id);
                useAppStore.getState().setAlignmentGuides({ x: null, y: null });
                moveTable(id, proposedX, proposedY);
                return;
              }
            }
          }

          // Compute full group membership via BFS
          const groupIds = new Set<string>();
          const q = [id];
          while (q.length > 0) {
            const gid = q.pop()!;
            if (groupIds.has(gid)) continue;
            groupIds.add(gid);
            const t = currentTables.find((t) => t.id === gid);
            if (!t) continue;
            if (t.snappedTo) q.push(t.snappedTo);
            for (const other of currentTables) {
              if (other.snappedTo === gid) q.push(other.id);
            }
          }

          // Alignment snapping for the group
          const THRESHOLD = 12 / scale;
          let guideX: number | null = null;
          let guideY: number | null = null;
          const nonGroup = currentTables.filter((t) => !groupIds.has(t.id));
          for (const t of currentTables.filter((t) => groupIds.has(t.id))) {
            for (const other of nonGroup) {
              if (guideX === null && Math.abs((t.x + moveDx) - other.x) < THRESHOLD) {
                moveDx += other.x - (t.x + moveDx);
                guideX = other.x;
              }
              if (guideY === null && Math.abs((t.y + moveDy) - other.y) < THRESHOLD) {
                moveDy += other.y - (t.y + moveDy);
                guideY = other.y;
              }
            }
            if (guideX !== null && guideY !== null) break;
          }
          const currentGuides = useAppStore.getState().alignmentGuides;
          if (currentGuides.x !== guideX || currentGuides.y !== guideY) {
            useAppStore.getState().setAlignmentGuides({ x: guideX, y: guideY });
          }

          useAppStore.getState().moveSnappedPair(id, moveDx, moveDy);
        } else {
          const snap = checkSnap(id, proposedX, proposedY, currentTables);
          if (snap.partnerId) {
            useAppStore.getState().setAlignmentGuides({ x: null, y: null });
            snapTables(id, snap.partnerId, snap.edge!);
            startTableRef.current = { x: snap.snappedX - dx, y: snap.snappedY - dy };
            moveTable(id, snap.snappedX, snap.snappedY);
          } else {
            // Alignment snapping — snap to other tables' X or Y centers
            const THRESHOLD = 12 / scale;
            let snapX = proposedX;
            let snapY = proposedY;
            let guideX: number | null = null;
            let guideY: number | null = null;
            for (const other of currentTables) {
              if (other.id === id) continue;
              if (guideX === null && Math.abs(proposedX - other.x) < THRESHOLD) {
                snapX = other.x; guideX = other.x;
              }
              if (guideY === null && Math.abs(proposedY - other.y) < THRESHOLD) {
                snapY = other.y; guideY = other.y;
              }
            }
            const current = useAppStore.getState().alignmentGuides;
            if (current.x !== guideX || current.y !== guideY) {
              useAppStore.getState().setAlignmentGuides({ x: guideX, y: guideY });
            }
            moveTable(id, snapX, snapY);
          }
        }
      }

      function onUp() {
        isDraggingRef.current = false;
        setIsDraggingTable(false);
        useAppStore.getState().setAlignmentGuides({ x: null, y: null });
        activeDragIdRef.current = tableId;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [tableId, tables, canvasTransform.scale, moveTable, moveSnappedPair, snapTables, unsnapTable, setIsDraggingTable]
  );

  return { onMouseDown };
}
