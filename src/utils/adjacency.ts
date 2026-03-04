import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';
import type { Table } from '@/types/table';

export interface SeatAssignment {
  guestId: string;
  tableId: string;
  seatIndex: number;
}

function consecutiveWrap(start: number, count: number, total: number): number[] {
  return Array.from({ length: count }, (_, i) => (start + i) % total);
}

export function getCircleAdjacentSeats(
  table: Table,
  memberCount: number,
  startSeat: number
): number[] | null {
  const total = table.seats.length;
  if (memberCount > total) return null;
  const seats = consecutiveWrap(startSeat, memberCount, total);
  const allVacant = seats.every((idx) => table.seats[idx]?.guestId === null);
  return allVacant ? seats : null;
}

export function getRectAdjacentSeats(
  table: Table,
  memberCount: number,
  startSeat: number
): number[] | null {
  const total = table.seats.length;
  const topCount = Math.ceil(total / 2);
  const botCount = total - topCount;
  const sideCount = startSeat < topCount ? topCount : botCount;
  const baseOffset = startSeat < topCount ? 0 : topCount;
  const localStart = startSeat - baseOffset;
  if (memberCount > sideCount || localStart + memberCount > sideCount) return null;
  const seats = Array.from({ length: memberCount }, (_, i) => baseOffset + localStart + i);
  const allVacant = seats.every((idx) => table.seats[idx]?.guestId === null);
  return allVacant ? seats : null;
}

export function validatePartyDrop(
  party: Party,
  guests: Guest[],
  table: Table,
  targetSeatIndex: number
): SeatAssignment[] | null {
  const members = party.memberIds
    .map((id) => guests.find((g) => g.id === id))
    .filter(Boolean) as Guest[];

  if (members.length === 0) return null;

  let seats: number[] | null = null;

  if (table.type === 'circle') {
    seats = getCircleAdjacentSeats(table, members.length, targetSeatIndex);
  } else if (table.type === 'rectangle') {
    seats = getRectAdjacentSeats(table, members.length, targetSeatIndex);
  } else if (table.type === 'sweetheart') {
    seats = getCircleAdjacentSeats(table, members.length, targetSeatIndex);
  }

  if (!seats) return null;

  return members.map((g, i) => ({
    guestId: g.id,
    tableId: table.id,
    seatIndex: seats![i],
  }));
}

export function checkAdjacentSeated(
  partyId: string,
  parties: Party[],
  guests: Guest[],
  tables: Table[]
): boolean {
  const party = parties.find((p) => p.id === partyId);
  if (!party || party.memberIds.length < 2) return true;

  const members = party.memberIds
    .map((id) => guests.find((g) => g.id === id))
    .filter(Boolean) as Guest[];

  const tableId = members[0]?.tableId;
  if (!tableId || members.some((m) => m.tableId !== tableId)) return false;

  const table = tables.find((t) => t.id === tableId);
  if (!table) return false;

  const seatIndices = members.map((m) => m.seatIndex!).sort((a, b) => a - b);

  if (table.type === 'circle' || table.type === 'sweetheart') {
    const total = table.seats.length;
    for (let start = 0; start < total; start++) {
      const expected = Array.from({ length: members.length }, (_, i) => (start + i) % total).sort(
        (a, b) => a - b
      );
      if (expected.every((v, i) => v === seatIndices[i])) return true;
    }
    return false;
  }

  if (table.type === 'rectangle') {
    const topCount = Math.ceil(table.seats.length / 2);
    const allTop = seatIndices.every((i) => i < topCount);
    const allBottom = seatIndices.every((i) => i >= topCount);
    if (!allTop && !allBottom) return false;
    const base = allTop ? 0 : topCount;
    const sideCount = allTop ? topCount : table.seats.length - topCount;
    const local = seatIndices.map((i) => i - base);
    for (let s = 0; s <= sideCount - members.length; s++) {
      const expected = Array.from({ length: members.length }, (_, i) => s + i);
      if (expected.every((v, i) => v === local[i])) return true;
    }
    return false;
  }

  return true;
}
