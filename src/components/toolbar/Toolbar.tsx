import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { exportToPng } from '@/hooks/useExport';
import { VersionModal } from '@/components/modals/VersionModal';

export function Toolbar() {
  const tables = useAppStore((s) => s.tables);
  const [showVersions, setShowVersions] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPng('canvas-root', tables);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
        <div className="mr-3">
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-lg font-bold tracking-tight text-gray-800">
            Seat<span className="text-teal-600">Heart</span>
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowVersions(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span>🕐</span> Versions
        </button>

        <button
          onClick={handleExport}
          disabled={exporting || tables.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🖼</span> {exporting ? 'Exporting…' : 'Export PNG'}
        </button>
      </div>

      {showVersions && <VersionModal onClose={() => setShowVersions(false)} />}
    </>
  );
}
