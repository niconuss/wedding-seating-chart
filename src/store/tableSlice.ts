import type { Draft } from 'immer';
import type { Table, TableType } from '@/types/table';
import { SEAT_COUNTS } from '@/utils/constants';
import { nanoid } from '@/utils/nanoid';

export interface TableSlice {
  tables: Table[];
  setTables: (tables: Table[]) => void;
  addTable: (type: TableType, x?: number, y?: number, seatCount?: number) => string;
  removeTable: (tableId: string) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  renameTable: (tableId: string, name: string) => void;
  seatGuestAtTable: (tableId: string, seatIndex: number, guestId: string | null) => void;
  snapTables: (tableId: string, partnerId: string, edge: 'left' | 'right' | 'top' | 'bottom') => void;
  unsnapTable: (tableId: string) => void;
  moveSnappedPair: (tableId: string, dx: number, dy: number) => void;
}

function makeSeats(count: number) {
  return Array.from({ length: count }, (_, i) => ({ index: i, guestId: null }));
}

// Assign consecutive numbers (1, 2, 3…) to auto-named tables in array order
function renumberAutoTables(tables: Draft<Table[]>) {
  let n = 1;
  for (const t of tables) {
    if (!t.customName) {
      t.name = `Table ${n++}`;
    }
  }
}

export function createTableSlice(
  set: (fn: (draft: Draft<{ tables: Table[] }>) => void) => void
): TableSlice {
  return {
    tables: [],
    setTables: (tables) =>
      set((draft) => {
        draft.tables = tables;
      }),
    addTable: (type, x, y, seatCount) => {
      const id = nanoid();
      set((draft) => {
        const count = seatCount ?? SEAT_COUNTS[type];
        const offset = draft.tables.length * 30;
        const nextNum = draft.tables.filter((t) => !t.customName).length + 1;
        draft.tables.push({
          id,
          type,
          name: `Table ${nextNum}`,
          customName: false,
          x: x ?? 100 + offset,
          y: y ?? 100 + offset,
          seats: makeSeats(count),
          snappedTo: null,
          snappedEdge: null,
        });
      });
      return id;
    },
    removeTable: (tableId) =>
      set((draft) => {
        const idx = draft.tables.findIndex((t) => t.id === tableId);
        if (idx < 0) return;
        // Unsnap linked tables
        const table = draft.tables[idx];
        if (table.snappedTo) {
          const partner = draft.tables.find((t) => t.id === table.snappedTo);
          if (partner) { partner.snappedTo = null; partner.snappedEdge = null; }
        }
        for (const t of draft.tables) {
          if (t.snappedTo === tableId) { t.snappedTo = null; t.snappedEdge = null; }
        }
        draft.tables.splice(idx, 1);
        // Renumber remaining auto-named tables
        renumberAutoTables(draft.tables);
      }),
    moveTable: (tableId, x, y) =>
      set((draft) => {
        const t = draft.tables.find((t) => t.id === tableId);
        if (t) { t.x = x; t.y = y; }
      }),
    renameTable: (tableId, name) =>
      set((draft) => {
        const t = draft.tables.find((t) => t.id === tableId);
        if (t) { t.name = name; t.customName = true; }
      }),
    seatGuestAtTable: (tableId, seatIndex, guestId) =>
      set((draft) => {
        const t = draft.tables.find((t) => t.id === tableId);
        if (t) {
          const seat = t.seats.find((s) => s.index === seatIndex);
          if (seat) seat.guestId = guestId;
        }
      }),
    snapTables: (tableId, partnerId, edge) =>
      set((draft) => {
        const t = draft.tables.find((t) => t.id === tableId);
        if (t) { t.snappedTo = partnerId; t.snappedEdge = edge; }
      }),
    unsnapTable: (tableId) =>
      set((draft) => {
        const t = draft.tables.find((t) => t.id === tableId);
        if (t) { t.snappedTo = null; t.snappedEdge = null; }
      }),
    moveSnappedPair: (tableId, dx, dy) =>
      set((draft) => {
        // Traverse the full connected snap group (BFS in both directions)
        const visited = new Set<string>();
        const queue = [tableId];
        while (queue.length > 0) {
          const id = queue.pop()!;
          if (visited.has(id)) continue;
          visited.add(id);
          const t = draft.tables.find((t) => t.id === id);
          if (!t) continue;
          if (t.snappedTo && !visited.has(t.snappedTo)) queue.push(t.snappedTo);
          for (const other of draft.tables) {
            if (other.snappedTo === id && !visited.has(other.id)) queue.push(other.id);
          }
        }
        for (const t of draft.tables) {
          if (visited.has(t.id)) { t.x += dx; t.y += dy; }
        }
      }),
  };
}
