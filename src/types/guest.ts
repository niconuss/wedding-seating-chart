export interface Guest {
  id: string;
  name: string;
  group: string;
  subgroup: string | null;
  partyName: string;
  partyId: string;
  tableId: string | null;
  seatIndex: number | null;
}
