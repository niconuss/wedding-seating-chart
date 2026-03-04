import type { TableType } from '@/types/table';
import { CIRCLE_RADIUS, RECT_WIDTH, RECT_HEIGHT, SWEEP_WIDTH, SWEEP_HEIGHT } from './constants';

export interface Point {
  x: number;
  y: number;
}

// Returns seat position relative to table center
export function seatPosition(type: TableType, index: number, totalSeats: number): Point {
  if (type === 'circle') {
    const angle = (2 * Math.PI * index) / totalSeats - Math.PI / 2;
    return {
      x: (CIRCLE_RADIUS + 20) * Math.cos(angle),
      y: (CIRCLE_RADIUS + 20) * Math.sin(angle),
    };
  }
  if (type === 'rectangle') {
    const topCount = Math.ceil(totalSeats / 2);
    const botCount = totalSeats - topCount;
    const halfW = RECT_WIDTH / 2;
    const halfH = RECT_HEIGHT / 2;
    if (index < topCount) {
      const spacing = RECT_WIDTH / topCount;
      return { x: -halfW + spacing * index + spacing / 2, y: -halfH - 22 };
    } else {
      const botIdx = index - topCount;
      const spacing = RECT_WIDTH / Math.max(botCount, 1);
      return { x: -halfW + spacing * botIdx + spacing / 2, y: halfH + 22 };
    }
  }
  // sweetheart: spread evenly along top edge
  const spacing = SWEEP_WIDTH / (totalSeats + 1);
  return { x: -SWEEP_WIDTH / 2 + spacing * (index + 1), y: -SWEEP_HEIGHT / 2 - 22 };
}

// Returns the bounding box of a table in canvas coords
export function tableBounds(table: { type: TableType; x: number; y: number }): {
  left: number; right: number; top: number; bottom: number;
} {
  if (table.type === 'circle') {
    const r = CIRCLE_RADIUS + 44;
    return { left: table.x - r, right: table.x + r, top: table.y - r, bottom: table.y + r };
  }
  if (table.type === 'rectangle') {
    const hw = RECT_WIDTH / 2 + 10;
    const hh = RECT_HEIGHT / 2 + 44;
    return { left: table.x - hw, right: table.x + hw, top: table.y - hh, bottom: table.y + hh };
  }
  const hw = SWEEP_WIDTH / 2 + 10;
  const hh = SWEEP_HEIGHT / 2 + 44;
  return { left: table.x - hw, right: table.x + hw, top: table.y - hh, bottom: table.y + hh };
}

export function tableShapeBounds(table: { type: TableType; x: number; y: number }): {
  left: number; right: number; top: number; bottom: number;
} {
  if (table.type === 'rectangle') {
    return {
      left: table.x - RECT_WIDTH / 2,
      right: table.x + RECT_WIDTH / 2,
      top: table.y - RECT_HEIGHT / 2,
      bottom: table.y + RECT_HEIGHT / 2,
    };
  }
  return tableBounds(table);
}
