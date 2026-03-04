import type { Draft } from 'immer';
import type { Guest } from '@/types/guest';

export interface GuestSlice {
  guests: Guest[];
  setGuests: (guests: Guest[]) => void;
  seatGuest: (guestId: string, tableId: string, seatIndex: number) => void;
  unseatGuest: (guestId: string) => void;
  unseatAllAtTable: (tableId: string) => void;
}

export function createGuestSlice(
  set: (fn: (draft: Draft<{ guests: Guest[] }>) => void) => void
): GuestSlice {
  return {
    guests: [],
    setGuests: (guests) =>
      set((draft) => {
        draft.guests = guests;
      }),
    seatGuest: (guestId, tableId, seatIndex) =>
      set((draft) => {
        const g = draft.guests.find((g) => g.id === guestId);
        if (g) {
          g.tableId = tableId;
          g.seatIndex = seatIndex;
        }
      }),
    unseatGuest: (guestId) =>
      set((draft) => {
        const g = draft.guests.find((g) => g.id === guestId);
        if (g) {
          g.tableId = null;
          g.seatIndex = null;
        }
      }),
    unseatAllAtTable: (tableId) =>
      set((draft) => {
        for (const g of draft.guests) {
          if (g.tableId === tableId) {
            g.tableId = null;
            g.seatIndex = null;
          }
        }
      }),
  };
}
