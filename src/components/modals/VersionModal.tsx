import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface VersionModalProps {
  onClose: () => void;
}

export function VersionModal({ onClose }: VersionModalProps) {
  const versions = useAppStore((s) => s.versions);
  const saveVersion = useAppStore((s) => s.saveVersion);
  const loadVersion = useAppStore((s) => s.loadVersion);
  const deleteVersion = useAppStore((s) => s.deleteVersion);
  const [newName, setNewName] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  function handleSave() {
    const name = newName.trim();
    if (!name) return;
    saveVersion(name);
    setNewName('');
  }

  function handleLoad(id: string) {
    loadVersion(id);
    setLoadedId(id);
    setTimeout(() => { setLoadedId(null); onClose(); }, 600);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[440px] max-w-[95vw] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Versions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Save new version */}
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Version name..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>

        {/* Version list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No saved versions yet</p>
          ) : (
            [...versions].reverse().map((v) => (
              <div
                key={v.id}
                className={[
                  'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                  loadedId === v.id ? 'border-green-400 bg-green-50' : 'border-gray-200',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(v.createdAt).toLocaleDateString()} ·{' '}
                    {v.guests.length} guests · {v.tables.length} tables
                  </p>
                </div>
                <button
                  onClick={() => handleLoad(v.id)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 shrink-0"
                >
                  Load
                </button>
                <button
                  onClick={() => deleteVersion(v.id)}
                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
