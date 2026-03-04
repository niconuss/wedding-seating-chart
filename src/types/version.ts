import type { Guest } from './guest';
import type { Party } from './party';
import type { Table } from './table';

export interface Version {
  id: string;
  name: string;
  createdAt: string;
  guests: Guest[];
  parties: Party[];
  tables: Table[];
}
