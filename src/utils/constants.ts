import type { TableType } from '@/types/table';

export const SEAT_COUNTS: Record<TableType, number> = {
  circle: 10,
  rectangle: 10,
  sweetheart: 2,
};

export const CIRCLE_RADIUS = 80;
export const RECT_WIDTH = 200;
export const RECT_HEIGHT = 100;
export const SWEEP_WIDTH = 120;
export const SWEEP_HEIGHT = 60;

export const SNAP_THRESHOLD = 20;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
