import { useRef, useState } from 'react';
import { parseCsv } from '@/parsers/csvParser';
import { parseXlsx } from '@/parsers/xlsxParser';
import { useAppStore } from '@/store/useAppStore';

interface UploadModalProps {
  onClose: () => void;
}

export function UploadModal({ onClose }: UploadModalProps) {
  const setGuests = useAppStore((s) => s.setGuests);
  const setParties = useAppStore((s) => s.setParties);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let result;
      if (ext === 'csv') {
        result = await parseCsv(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        result = await parseXlsx(file);
      } else {
        setError('Please upload a .csv, .xlsx, or .xls file.');
        return;
      }
      setGuests(result.guests);
      setParties(result.parties);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (file) processFile(file);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[95vw] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Import Guests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Drop zone */}
        <div
          className={[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-300',
          ].join(' ')}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-sm text-gray-600 font-medium">
            Drop your CSV or Excel file here
          </p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* Format guide */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-semibold mb-1">Expected columns:</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li><span className="font-mono">Name</span> — guest full name (required)</li>
            <li><span className="font-mono">Group</span> — seating group/section (optional)</li>
            <li><span className="font-mono">Party Name</span> — guests who must sit together (optional)</li>
          </ul>
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-3 text-center text-sm text-gray-500">Processing...</div>
        )}
      </div>
    </div>
  );
}
