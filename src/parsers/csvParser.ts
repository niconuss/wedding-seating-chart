import Papa from 'papaparse';
import { parseRows, normalizeGuests } from './guestNormalizer';
import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';

export function parseCsv(file: File): Promise<{ guests: Guest[]; parties: Party[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parse error: ${results.errors[0].message}`));
          return;
        }
        const rows = parseRows(results.data);
        if (rows.length === 0) {
          reject(new Error('No valid guest rows found. Make sure the file has a "Name" column (or "First Name" and "Last Name" columns).'));
          return;
        }
        resolve(normalizeGuests(rows));
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}
