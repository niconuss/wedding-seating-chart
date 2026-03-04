import type { Table } from './table';

export interface Page {
  id: string;
  name: string;
  tables: Table[];
  guestSeating: Record<string, { tableId: string | null; seatIndex: number | null }>;
  canvasGuests: { guestId: string; x: number; y: number }[];
}
