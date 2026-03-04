import type { Table } from '@/types/table';
import { tableShapeBounds } from '@/utils/geometry';
import { RECT_WIDTH, RECT_HEIGHT, SNAP_THRESHOLD } from '@/utils/constants';

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  partnerId: string | null;
  edge: 'left' | 'right' | 'top' | 'bottom' | null;
}

export function checkSnap(
  draggedId: string,
  proposedX: number,
  proposedY: number,
  tables: Table[]
): SnapResult {
  const dragged = tables.find((t) => t.id === draggedId);
  if (!dragged || dragged.type !== 'rectangle') {
    return { snappedX: proposedX, snappedY: proposedY, partnerId: null, edge: null };
  }

  const halfW = RECT_WIDTH / 2;
  const halfH = RECT_HEIGHT / 2;
  const dLeft = proposedX - halfW;
  const dRight = proposedX + halfW;
  const dTop = proposedY - halfH;
  const dBottom = proposedY + halfH;

  for (const other of tables) {
    if (other.id === draggedId || other.type !== 'rectangle') continue;
    const ob = tableShapeBounds(other);

    // Check right edge of other → left edge of dragged
    if (Math.abs(dLeft - ob.right) < SNAP_THRESHOLD) {
      const vertAlign = Math.abs(dTop - ob.top) < SNAP_THRESHOLD || Math.abs(dBottom - ob.bottom) < SNAP_THRESHOLD;
      if (vertAlign || Math.abs((dTop + dBottom) / 2 - (ob.top + ob.bottom) / 2) < SNAP_THRESHOLD) {
        return {
          snappedX: ob.right + halfW,
          snappedY: other.y,
          partnerId: other.id,
          edge: 'left',
        };
      }
    }

    // Check left edge of other → right edge of dragged
    if (Math.abs(dRight - ob.left) < SNAP_THRESHOLD) {
      const vertAlign = Math.abs(dTop - ob.top) < SNAP_THRESHOLD || Math.abs(dBottom - ob.bottom) < SNAP_THRESHOLD;
      if (vertAlign || Math.abs((dTop + dBottom) / 2 - (ob.top + ob.bottom) / 2) < SNAP_THRESHOLD) {
        return {
          snappedX: ob.left - halfW,
          snappedY: other.y,
          partnerId: other.id,
          edge: 'right',
        };
      }
    }

    // Check bottom edge of other → top edge of dragged
    if (Math.abs(dTop - ob.bottom) < SNAP_THRESHOLD) {
      const horizAlign = Math.abs(dLeft - ob.left) < SNAP_THRESHOLD || Math.abs(dRight - ob.right) < SNAP_THRESHOLD;
      if (horizAlign || Math.abs((dLeft + dRight) / 2 - (ob.left + ob.right) / 2) < SNAP_THRESHOLD) {
        return {
          snappedX: other.x,
          snappedY: ob.bottom + halfH,
          partnerId: other.id,
          edge: 'top',
        };
      }
    }

    // Check top edge of other → bottom edge of dragged
    if (Math.abs(dBottom - ob.top) < SNAP_THRESHOLD) {
      const horizAlign = Math.abs(dLeft - ob.left) < SNAP_THRESHOLD || Math.abs(dRight - ob.right) < SNAP_THRESHOLD;
      if (horizAlign || Math.abs((dLeft + dRight) / 2 - (ob.left + ob.right) / 2) < SNAP_THRESHOLD) {
        return {
          snappedX: other.x,
          snappedY: ob.top - halfH,
          partnerId: other.id,
          edge: 'bottom',
        };
      }
    }
  }

  return { snappedX: proposedX, snappedY: proposedY, partnerId: null, edge: null };
}
