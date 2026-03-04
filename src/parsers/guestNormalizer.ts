import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';
import { nanoid } from '@/utils/nanoid';

export interface RawGuestRow {
  name: string;
  group: string;
  partyName: string;
}

export function normalizeGuests(rows: RawGuestRow[]): { guests: Guest[]; parties: Party[] } {
  const partyMap = new Map<string, Party>();
  const guests: Guest[] = [];

  for (const row of rows) {
    const partyKey = `${row.group}::${row.partyName}`;
    if (!partyMap.has(partyKey)) {
      partyMap.set(partyKey, {
        id: nanoid(),
        name: row.partyName,
        memberIds: [],
        locked: false,
      });
    }
    const party = partyMap.get(partyKey)!;
    const guest: Guest = {
      id: nanoid(),
      name: row.name,
      group: row.group,
      subgroup: null,
      partyName: row.partyName,
      partyId: party.id,
      tableId: null,
      seatIndex: null,
    };
    party.memberIds.push(guest.id);
    guests.push(guest);
  }

  const parties = Array.from(partyMap.values()).map((p) => ({
    ...p,
    locked: p.memberIds.length > 1,
  }));

  return { guests, parties };
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function parseRows(rawRows: Record<string, string>[]): RawGuestRow[] {
  const rows: RawGuestRow[] = [];
  for (const raw of rawRows) {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[normalizeHeader(k)] = String(v ?? '').trim();
    }
    const firstName = normalized['firstname'] ?? normalized['first'] ?? normalized['fname'] ?? '';
    const lastName = normalized['lastname'] ?? normalized['last'] ?? normalized['lname'] ?? normalized['surname'] ?? '';
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const name = normalized['name'] ?? normalized['guestname'] ?? normalized['fullname'] ?? combinedName;
    const group = normalized['group'] ?? normalized['groupname'] ?? normalized['table'] ?? '';
    const partyName =
      normalized['partyname'] ?? normalized['party'] ?? normalized['household'] ?? name;

    if (!name) continue;
    rows.push({ name, group: group || 'Ungrouped', partyName: partyName || name });
  }
  return rows;
}
