import type { Draft } from 'immer';

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface UISlice {
  canvasTransform: CanvasTransform;
  activeError: string | null;
  collapsedGroups: Set<string>;
  isDraggingTable: boolean;
  setCanvasTransform: (t: CanvasTransform) => void;
  setActiveError: (msg: string | null) => void;
  toggleGroupCollapsed: (group: string) => void;
  setIsDraggingTable: (v: boolean) => void;
}

export function createUISlice(
  set: (fn: (draft: Draft<{ canvasTransform: CanvasTransform; activeError: string | null; collapsedGroups: Set<string>; isDraggingTable: boolean }>) => void) => void
): UISlice {
  return {
    canvasTransform: { x: 0, y: 0, scale: 1 },
    activeError: null,
    collapsedGroups: new Set(),
    isDraggingTable: false,
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
        if (draft.collapsedGroups.has(group)) {
          draft.collapsedGroups.delete(group);
        } else {
          draft.collapsedGroups.add(group);
        }
      }),
    setIsDraggingTable: (v) =>
      set((draft) => {
        draft.isDraggingTable = v;
      }),
  };
}
