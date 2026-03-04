import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';
import type { Table } from '@/types/table';
import type { Version } from '@/types/version';
import type { Page } from '@/types/page';
import { createGuestSlice } from './guestSlice';
import { createPartySlice } from './partySlice';
import { createTableSlice } from './tableSlice';
import { createVersionSlice } from './versionSlice';
import { checkAdjacentSeated } from '@/utils/adjacency';
import { RECT_WIDTH, RECT_HEIGHT } from '@/utils/constants';
import { nanoid } from '@/utils/nanoid';

export interface AppState {
  // Data
  guests: Guest[];
  parties: Party[];
  tables: Table[];
  versions: Version[];
  groupOrder: string[];
  subgroupOrder: Record<string, string[]>;
  // Pages
  pages: Page[];
  currentPageId: string;
  canvasGuests: { guestId: string; x: number; y: number }[];
  // UI (not persisted)
  canvasTransform: { x: number; y: number; scale: number };
  activeError: string | null;
  collapsedGroups: string[];
  isDraggingTable: boolean;
  selectedTableId: string | null;
  selectedTableIds: string[];
  isGroupRenaming: boolean;

  // Guest actions
  setGuests: (guests: Guest[]) => void;
  addManualGuest: (name: string, group: string) => void;
  removeGuest: (guestId: string) => void;
  seatGuest: (guestId: string, tableId: string, seatIndex: number) => void;
  unseatGuest: (guestId: string) => void;
  unseatAllAtTable: (tableId: string) => void;

  // Group / subgroup actions
  reorderGroups: (newOrder: string[]) => void;
  addSubgroup: (groupName: string, subgroupName: string) => void;
  removeSubgroup: (groupName: string, subgroupName: string) => void;
  setGuestSubgroup: (guestId: string, subgroup: string | null) => void;

  // Party actions
  setParties: (parties: Party[]) => void;
  lockParty: (partyId: string) => void;
  unlockParty: (partyId: string) => void;
  canRelock: (partyId: string) => boolean;

  // Table actions
  setTables: (tables: Table[]) => void;
  addTable: (type: import('@/types/table').TableType, x?: number, y?: number, seatCount?: number) => string;
  removeTable: (tableId: string) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  renameTable: (tableId: string, name: string) => void;
  seatGuestAtTable: (tableId: string, seatIndex: number, guestId: string | null) => void;
  snapTables: (tableId: string, partnerId: string, edge: 'left' | 'right' | 'top' | 'bottom') => void;
  unsnapTable: (tableId: string) => void;
  unsnapPair: (tableId: string) => void;
  moveSnappedPair: (tableId: string, dx: number, dy: number) => void;

  // Version actions
  saveVersion: (name: string) => void;
  loadVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Page actions
  createPage: (name?: string, initialData?: Omit<Page, 'id' | 'name'>) => void;
  switchPage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  initPage: (name: string) => void;

  // Canvas guest actions
  placeGuestOnCanvas: (guestId: string, x: number, y: number) => void;
  moveCanvasGuest: (guestId: string, x: number, y: number) => void;
  removeGuestFromCanvas: (guestId: string) => void;

  // Firebase sync
  loadRemoteState: (data: {
    guests?: Guest[];
    parties?: Party[];
    tables?: Table[];
    versions?: Version[];
    groupOrder?: string[];
    subgroupOrder?: Record<string, string[]>;
    pages?: Page[];
  }) => void;
  pendingRemoteUpdate: number | null; // timestamp (ms) when a remote update arrived
  setHasRemoteUpdate: (at: number) => void;
  clearPendingUpdateFlag: () => void;

  // UI actions
  setCanvasTransform: (t: { x: number; y: number; scale: number }) => void;
  setActiveError: (msg: string | null) => void;
  toggleGroupCollapsed: (group: string) => void;
  setIsDraggingTable: (v: boolean) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedTableIds: (ids: string[]) => void;
  setIsGroupRenaming: (v: boolean) => void;
  hoveredTableId: string | null;
  setHoveredTableId: (id: string | null) => void;
  alignmentGuides: { x: number | null; y: number | null };
  setAlignmentGuides: (guides: { x: number | null; y: number | null }) => void;
  fitToScreen: () => void;
  // Undo/redo
  canUndo: boolean;
  canRedo: boolean;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
}

// ── History stacks (module-level, outside Zustand, max 50 snapshots) ─────────
type Snapshot = { tables: Table[]; guests: Guest[]; parties: Party[] };
const _history: Snapshot[] = [];
const _redoStack: Snapshot[] = [];

// ── Page helpers (called inside immer set callbacks) ──────────────────────────
function snapshotCurrentPage(draft: AppState) {
  const idx = draft.pages.findIndex((p) => p.id === draft.currentPageId);
  if (idx < 0) return;
  const seating: Record<string, { tableId: string | null; seatIndex: number | null }> = {};
  for (const g of draft.guests) seating[g.id] = { tableId: g.tableId, seatIndex: g.seatIndex };
  draft.pages[idx].tables = JSON.parse(JSON.stringify(draft.tables));
  draft.pages[idx].guestSeating = seating;
  draft.pages[idx].canvasGuests = JSON.parse(JSON.stringify(draft.canvasGuests));
}

function applyPage(draft: AppState, page: Page) {
  draft.currentPageId = page.id;
  draft.tables = JSON.parse(JSON.stringify(page.tables));
  draft.canvasGuests = JSON.parse(JSON.stringify(page.canvasGuests));
  // Reset all seats
  for (const t of draft.tables) {
    for (const s of t.seats) s.guestId = null;
  }
  // Reset guest seating
  for (const g of draft.guests) { g.tableId = null; g.seatIndex = null; }
  // Apply seating from page
  for (const [guestId, seating] of Object.entries(page.guestSeating)) {
    const g = draft.guests.find((g) => g.id === guestId);
    if (g) { g.tableId = seating.tableId; g.seatIndex = seating.seatIndex; }
    if (seating.tableId && seating.seatIndex !== null) {
      const t = draft.tables.find((t) => t.id === seating.tableId);
      if (t) {
        const seat = t.seats.find((s) => s.index === seating.seatIndex);
        if (seat) seat.guestId = guestId;
      }
    }
  }
}

export const useAppStore = create<AppState>()(
  immer((set, get) => {
      const guestSlice = createGuestSlice(set as Parameters<typeof createGuestSlice>[0]);
      const partySlice = createPartySlice(set as Parameters<typeof createPartySlice>[0]);
      const tableSlice = createTableSlice(
        set as Parameters<typeof createTableSlice>[0]
      );
      const versionSlice = createVersionSlice(set as Parameters<typeof createVersionSlice>[0]);

      return {
        ...guestSlice,
        ...partySlice,
        ...tableSlice,
        ...versionSlice,

        // Override seatGuest to also remove the guest from canvasGuests
        seatGuest: (guestId: string, tableId: string, seatIndex: number) => set((draft) => {
          const g = draft.guests.find((g) => g.id === guestId);
          if (g) { g.tableId = tableId; g.seatIndex = seatIndex; }
          draft.canvasGuests = draft.canvasGuests.filter((cg) => cg.guestId !== guestId);
        }),

        // Persisted ordering state
        groupOrder: [],
        subgroupOrder: {},

        // Pages state
        pages: [],
        currentPageId: '',
        canvasGuests: [],

        // UI state (not in slices, not persisted)
        canvasTransform: { x: 0, y: 0, scale: 1 },
        activeError: null,
        collapsedGroups: [],
        isDraggingTable: false,
        selectedTableId: null,
        selectedTableIds: [],
        isGroupRenaming: false,
        hoveredTableId: null,
        alignmentGuides: { x: null, y: null },
        canUndo: false,
        canRedo: false,
        pendingRemoteUpdate: null,

        checkpoint: () => {
          const { guests, parties, tables } = get();
          if (_history.length >= 50) _history.shift();
          _history.push(JSON.parse(JSON.stringify({ guests, parties, tables })));
          _redoStack.length = 0;
          set((draft) => { draft.canUndo = true; draft.canRedo = false; });
        },
        undo: () => {
          if (_history.length === 0) return;
          const { guests, parties, tables } = get();
          _redoStack.push(JSON.parse(JSON.stringify({ guests, parties, tables })));
          const prev = _history.pop()!;
          set((draft) => {
            draft.guests = prev.guests;
            draft.parties = prev.parties;
            draft.tables = prev.tables;
            draft.canUndo = _history.length > 0;
            draft.canRedo = true;
          });
        },
        redo: () => {
          if (_redoStack.length === 0) return;
          const { guests, parties, tables } = get();
          _history.push(JSON.parse(JSON.stringify({ guests, parties, tables })));
          const next = _redoStack.pop()!;
          set((draft) => {
            draft.guests = next.guests;
            draft.parties = next.parties;
            draft.tables = next.tables;
            draft.canUndo = true;
            draft.canRedo = _redoStack.length > 0;
          });
        },

        canRelock: (partyId: string) => {
          const { guests, tables } = get();
          return checkAdjacentSeated(partyId, get().parties, guests, tables);
        },

        // Override setGuests to also sync groupOrder
        setGuests: (guests) => set((draft) => {
          draft.guests = guests;
          const guestGroups = [...new Set(guests.map((g) => g.group))];
          for (const g of guestGroups) {
            if (!draft.groupOrder.includes(g)) draft.groupOrder.push(g);
          }
          draft.groupOrder = draft.groupOrder.filter((g) => guestGroups.includes(g));
        }),

        addManualGuest: (name, group) => {
          const guestId = nanoid();
          const partyId = nanoid();
          set((draft) => {
            draft.guests.push({ id: guestId, name, group, subgroup: null, partyName: name, partyId, tableId: null, seatIndex: null });
            draft.parties.push({ id: partyId, name, memberIds: [guestId], locked: false });
            if (!draft.groupOrder.includes(group)) draft.groupOrder.push(group);
          });
        },

        reorderGroups: (newOrder) => set((draft) => {
          draft.groupOrder = newOrder;
        }),

        addSubgroup: (groupName, subgroupName) => set((draft) => {
          if (!draft.subgroupOrder[groupName]) draft.subgroupOrder[groupName] = [];
          if (!draft.subgroupOrder[groupName].includes(subgroupName)) {
            draft.subgroupOrder[groupName].push(subgroupName);
          }
        }),

        removeSubgroup: (groupName, subgroupName) => set((draft) => {
          if (draft.subgroupOrder[groupName]) {
            draft.subgroupOrder[groupName] = draft.subgroupOrder[groupName].filter(
              (s) => s !== subgroupName
            );
          }
          for (const g of draft.guests) {
            if (g.group === groupName && g.subgroup === subgroupName) g.subgroup = null;
          }
        }),

        setGuestSubgroup: (guestId, subgroup) => set((draft) => {
          const g = draft.guests.find((g) => g.id === guestId);
          if (g) g.subgroup = subgroup;
        }),

        removeGuest: (guestId) => {
          set((draft) => {
            const g = draft.guests.find((g) => g.id === guestId);
            if (!g) return;
            // Unseat first
            g.tableId = null;
            g.seatIndex = null;
            // Also clear seat on table
            for (const t of draft.tables) {
              for (const s of t.seats) {
                if (s.guestId === guestId) s.guestId = null;
              }
            }
            // Remove from canvas guests
            draft.canvasGuests = draft.canvasGuests.filter((cg) => cg.guestId !== guestId);
            // Remove from party
            const party = draft.parties.find((p) => p.id === g.partyId);
            if (party) {
              const idx = party.memberIds.indexOf(guestId);
              if (idx >= 0) party.memberIds.splice(idx, 1);
              if (party.memberIds.length === 0) {
                const pIdx = draft.parties.findIndex((p) => p.id === g.partyId);
                if (pIdx >= 0) draft.parties.splice(pIdx, 1);
              }
            }
            const gIdx = draft.guests.findIndex((g) => g.id === guestId);
            if (gIdx >= 0) draft.guests.splice(gIdx, 1);
          });
        },

        unseatAllAtTable: (tableId: string) => {
          set((draft) => {
            for (const g of draft.guests) {
              if (g.tableId === tableId) { g.tableId = null; g.seatIndex = null; }
            }
            const t = draft.tables.find((t) => t.id === tableId);
            if (t) { for (const s of t.seats) s.guestId = null; }
          });
        },

        saveVersion: (name: string) => {
          const { guests, parties, tables } = get();
          versionSlice.saveVersion(name, guests, parties, tables);
        },

        loadVersion: (versionId: string) => {
          const { versions } = get();
          const v = versions.find((v) => v.id === versionId);
          if (!v) return;
          set((draft) => {
            draft.guests = v.guests;
            draft.parties = v.parties;
            draft.tables = v.tables;
          });
        },

        unsnapPair: (tableId: string) => {
          set((draft) => {
            // Traverse the full connected snap group
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

            // Spread tables apart with 20px gaps before clearing snaps
            const group = draft.tables.filter((t) => visited.has(t.id));
            if (group.length > 1) {
              const xs = group.map((t) => t.x);
              const ys = group.map((t) => t.y);
              const xRange = Math.max(...xs) - Math.min(...xs);
              const yRange = Math.max(...ys) - Math.min(...ys);
              const GAP = 20;
              if (xRange >= yRange) {
                // Horizontal — sort by X, keep leftmost in place
                const sorted = [...group].sort((a, b) => a.x - b.x);
                const startLeft = sorted[0].x - RECT_WIDTH / 2;
                for (let i = 0; i < sorted.length; i++) {
                  const t = draft.tables.find((dt) => dt.id === sorted[i].id)!;
                  t.x = startLeft + RECT_WIDTH / 2 + i * (RECT_WIDTH + GAP);
                }
              } else {
                // Vertical — sort by Y, keep topmost in place
                const sorted = [...group].sort((a, b) => a.y - b.y);
                const startTop = sorted[0].y - RECT_HEIGHT / 2;
                for (let i = 0; i < sorted.length; i++) {
                  const t = draft.tables.find((dt) => dt.id === sorted[i].id)!;
                  t.y = startTop + RECT_HEIGHT / 2 + i * (RECT_HEIGHT + GAP);
                }
              }
            }

            // Clear all snaps
            for (const t of draft.tables) {
              if (visited.has(t.id)) { t.snappedTo = null; t.snappedEdge = null; }
            }
          });
        },

        deleteVersion: (versionId: string) => {
          versionSlice.deleteVersion(versionId);
        },

        // ── Page actions ─────────────────────────────────────────────────────────

        createPage: (name?: string, initialData?: Omit<Page, 'id' | 'name'>) => set((draft) => {
          snapshotCurrentPage(draft);
          const newPage: Page = {
            id: nanoid(),
            name: name ?? `Page ${draft.pages.length + 1}`,
            tables: initialData ? JSON.parse(JSON.stringify(initialData.tables)) : [],
            guestSeating: initialData ? JSON.parse(JSON.stringify(initialData.guestSeating)) : {},
            canvasGuests: initialData ? JSON.parse(JSON.stringify(initialData.canvasGuests)) : [],
          };
          draft.pages.push(newPage);
          applyPage(draft, newPage);
        }),

        switchPage: (pageId: string) => set((draft) => {
          if (draft.currentPageId === pageId) return;
          snapshotCurrentPage(draft);
          const newPage = draft.pages.find((p) => p.id === pageId);
          if (!newPage) return;
          applyPage(draft, newPage);
        }),

        renamePage: (pageId: string, name: string) => set((draft) => {
          const page = draft.pages.find((p) => p.id === pageId);
          if (page) page.name = name;
        }),

        deletePage: (pageId: string) => set((draft) => {
          if (draft.pages.length <= 1) return;
          const idx = draft.pages.findIndex((p) => p.id === pageId);
          if (idx < 0) return;
          const wasActive = draft.currentPageId === pageId;
          draft.pages.splice(idx, 1);
          if (wasActive) {
            const newIdx = Math.min(idx, draft.pages.length - 1);
            applyPage(draft, draft.pages[newIdx]);
          }
        }),

        duplicatePage: (pageId: string) => set((draft) => {
          snapshotCurrentPage(draft);
          const sourcePage = draft.pages.find((p) => p.id === pageId);
          if (!sourcePage) return;
          const newPage: Page = {
            id: nanoid(),
            name: `${sourcePage.name} (copy)`,
            tables: JSON.parse(JSON.stringify(sourcePage.tables)),
            guestSeating: JSON.parse(JSON.stringify(sourcePage.guestSeating)),
            canvasGuests: JSON.parse(JSON.stringify(sourcePage.canvasGuests)),
          };
          const sourceIdx = draft.pages.findIndex((p) => p.id === pageId);
          draft.pages.splice(sourceIdx + 1, 0, newPage);
          applyPage(draft, newPage);
        }),

        // Creates a page from current tables/guests without switching (for migration)
        initPage: (name: string) => set((draft) => {
          if (draft.pages.length > 0) return;
          const seating: Record<string, { tableId: string | null; seatIndex: number | null }> = {};
          for (const g of draft.guests) seating[g.id] = { tableId: g.tableId, seatIndex: g.seatIndex };
          const newPage: Page = {
            id: nanoid(),
            name,
            tables: JSON.parse(JSON.stringify(draft.tables)),
            guestSeating: seating,
            canvasGuests: [],
          };
          draft.pages.push(newPage);
          draft.currentPageId = newPage.id;
        }),

        // ── Canvas guest actions ─────────────────────────────────────────────────

        placeGuestOnCanvas: (guestId: string, x: number, y: number) => set((draft) => {
          draft.canvasGuests = draft.canvasGuests.filter((cg) => cg.guestId !== guestId);
          const g = draft.guests.find((g) => g.id === guestId);
          if (g) {
            if (g.tableId && g.seatIndex !== null) {
              const t = draft.tables.find((t) => t.id === g.tableId);
              if (t) {
                const seat = t.seats.find((s) => s.index === g.seatIndex);
                if (seat) seat.guestId = null;
              }
            }
            g.tableId = null;
            g.seatIndex = null;
          }
          draft.canvasGuests.push({ guestId, x, y });
        }),

        moveCanvasGuest: (guestId: string, x: number, y: number) => set((draft) => {
          const cg = draft.canvasGuests.find((cg) => cg.guestId === guestId);
          if (cg) { cg.x = x; cg.y = y; }
        }),

        removeGuestFromCanvas: (guestId: string) => set((draft) => {
          draft.canvasGuests = draft.canvasGuests.filter((cg) => cg.guestId !== guestId);
        }),

        setCanvasTransform: (t) =>
          set((draft) => {
            draft.canvasTransform = t;
          }),
        setActiveError: (msg) =>
          set((draft) => {
            draft.activeError = msg;
          }),
        toggleGroupCollapsed: (group) =>
          set((draft) => {
            const idx = draft.collapsedGroups.indexOf(group);
            if (idx >= 0) {
              draft.collapsedGroups.splice(idx, 1);
            } else {
              draft.collapsedGroups.push(group);
            }
          }),
        setIsDraggingTable: (v) =>
          set((draft) => {
            draft.isDraggingTable = v;
          }),
        setSelectedTableId: (id) =>
          set((draft) => {
            if (draft.selectedTableId !== id) draft.isGroupRenaming = false;
            draft.selectedTableId = id;
            draft.selectedTableIds = id ? [id] : [];
          }),
        setSelectedTableIds: (ids) =>
          set((draft) => {
            draft.selectedTableIds = ids;
            draft.selectedTableId = ids.length === 1 ? ids[0] : (ids.length > 0 ? ids[0] : null);
            draft.isGroupRenaming = false;
          }),
        setIsGroupRenaming: (v) =>
          set((draft) => {
            draft.isGroupRenaming = v;
          }),
        setHoveredTableId: (id) =>
          set((draft) => {
            draft.hoveredTableId = id;
          }),
        setAlignmentGuides: (guides) =>
          set((draft) => {
            draft.alignmentGuides = guides;
          }),
        fitToScreen: () =>
          set((draft) => {
            draft.canvasTransform = { x: 0, y: 0, scale: 1 };
          }),

        loadRemoteState: (data) =>
          set((draft) => {
            if (data.guests !== undefined) draft.guests = data.guests;
            if (data.parties !== undefined) draft.parties = data.parties;
            if (data.versions !== undefined) draft.versions = data.versions;
            if (data.groupOrder !== undefined) draft.groupOrder = data.groupOrder;
            if (data.subgroupOrder !== undefined) draft.subgroupOrder = data.subgroupOrder;

            if (data.pages !== undefined && data.pages.length > 0) {
              draft.pages = data.pages;
              // Find current page or default to first
              let page = draft.pages.find((p) => p.id === draft.currentPageId);
              if (!page) page = draft.pages[0];
              if (page) applyPage(draft, page);
            } else if (data.tables !== undefined) {
              // Legacy migration: tables present but no pages yet
              // firebaseSync will call initPage() after this
              draft.tables = data.tables;
            }
          }),

        setHasRemoteUpdate: (at) =>
          set((draft) => { draft.pendingRemoteUpdate = at; }),
        clearPendingUpdateFlag: () =>
          set((draft) => { draft.pendingRemoteUpdate = null; }),
      };
    })
);
