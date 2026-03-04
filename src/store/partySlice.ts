import type { Draft } from 'immer';
import type { Party } from '@/types/party';

export interface PartySlice {
  parties: Party[];
  setParties: (parties: Party[]) => void;
  lockParty: (partyId: string) => void;
  unlockParty: (partyId: string) => void;
}

export function createPartySlice(
  set: (fn: (draft: Draft<{ parties: Party[] }>) => void) => void
): PartySlice {
  return {
    parties: [],
    setParties: (parties) =>
      set((draft) => {
        draft.parties = parties;
      }),
    lockParty: (partyId) =>
      set((draft) => {
        const p = draft.parties.find((p) => p.id === partyId);
        if (p) p.locked = true;
      }),
    unlockParty: (partyId) =>
      set((draft) => {
        const p = draft.parties.find((p) => p.id === partyId);
        if (p) p.locked = false;
      }),
  };
}
