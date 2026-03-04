import * as XLSX from 'xlsx';
import { parseRows, normalizeGuests } from './guestNormalizer';
import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';

export function parseXlsx(file: File): Promise<{ guests: Guest[]; parties: Party[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });
        const rows = parseRows(rawRows);
        if (rows.length === 0) {
          reject(new Error('No valid guest rows found. Make sure the file has a "Name" column (or "First Name" and "Last Name" columns).'));
          return;
        }
        resolve(normalizeGuests(rows));
      } catch (err) {
        reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
