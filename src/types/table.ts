export type TableType = 'circle' | 'rectangle' | 'sweetheart';

export interface Seat {
  index: number;
  guestId: string | null;
}

export interface Table {
  id: string;
  type: TableType;
  name: string;
  customName: boolean;
  x: number;
  y: number;
  seats: Seat[];
  snappedTo: string | null;
  snappedEdge: 'left' | 'right' | 'top' | 'bottom' | null;
}
