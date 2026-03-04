import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { applyPendingUpdate } from '@/store/firebaseSync';

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function RemoteUpdateBanner() {
  const pendingRemoteUpdate = useAppStore((s) => s.pendingRemoteUpdate);
  const [, setTick] = useState(0);

  // Re-render every second to keep "X ago" fresh
  useEffect(() => {
    if (!pendingRemoteUpdate) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [pendingRemoteUpdate]);

  if (!pendingRemoteUpdate) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-md text-sm pointer-events-auto">
      <span className="text-gray-600">
        Changes were made <span className="font-medium text-gray-800">{timeAgo(pendingRemoteUpdate)}</span>
      </span>
      <button
        onClick={applyPendingUpdate}
        className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
      >
        Load
      </button>
    </div>
  );
}
