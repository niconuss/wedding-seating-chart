import type { Draft } from 'immer';
import type { Version } from '@/types/version';
import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';
import type { Table } from '@/types/table';
import { nanoid } from '@/utils/nanoid';

export interface VersionSlice {
  versions: Version[];
  saveVersion: (name: string, guests: Guest[], parties: Party[], tables: Table[]) => void;
  deleteVersion: (versionId: string) => void;
}

export function createVersionSlice(
  set: (fn: (draft: Draft<{ versions: Version[] }>) => void) => void
): VersionSlice {
  return {
    versions: [],
    saveVersion: (name, guests, parties, tables) =>
      set((draft) => {
        draft.versions.push({
          id: nanoid(),
          name,
          createdAt: new Date().toISOString(),
          guests: JSON.parse(JSON.stringify(guests)),
          parties: JSON.parse(JSON.stringify(parties)),
          tables: JSON.parse(JSON.stringify(tables)),
        });
      }),
    deleteVersion: (versionId) =>
      set((draft) => {
        const idx = draft.versions.findIndex((v) => v.id === versionId);
        if (idx >= 0) draft.versions.splice(idx, 1);
      }),
  };
}
